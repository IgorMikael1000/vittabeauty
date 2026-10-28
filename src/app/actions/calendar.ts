"use server";

import {
  AppointmentStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import {
  getDateInTimezone,
  getWeekdayInTimezone,
  isAvailableWorkingHoursSlot,
  parseDateTimeInTimezone,
} from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";
import type { FormState } from "@/app/actions/auth";

const activeAppointmentStatuses: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

class SlotValidationError extends Error {}

function readDateTime(value: FormDataEntryValue | null, timeZone: string) {
  return typeof value === "string"
    ? parseDateTimeInTimezone(value, timeZone)
    : null;
}

function getMinuteOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return values.hour * 60 + values.minute;
}

async function ensureSlotIsAvailable(
  transaction: Prisma.TransactionClient,
  professionalId: string,
  timeZone: string,
  startsAt: Date,
  endsAt: Date,
): Promise<string | null> {
  const weekday = getWeekdayInTimezone(startsAt, timeZone);
  const localStartMinute = getMinuteOfDay(startsAt, timeZone);
  const localEndMinute = getMinuteOfDay(endsAt, timeZone);
  const startDate = getDateInTimezone(startsAt, timeZone);
  const endDate = getDateInTimezone(endsAt, timeZone);

  if (startDate !== endDate) {
    return "O atendimento deve terminar no mesmo dia em que começa.";
  }

  const workingHours = await transaction.workingHours.findUnique({
    where: { professionalId_weekday: { professionalId, weekday } },
  });

  if (
    !workingHours?.isActive ||
    !isAvailableWorkingHoursSlot(
      localStartMinute,
      localEndMinute,
      workingHours,
    )
  ) {
    return "O horário está fora do expediente ou coincide com uma pausa configurada.";
  }

  const [appointmentConflict, blockConflict] = await Promise.all([
    transaction.appointment.findFirst({
      where: {
        professionalId,
        status: { in: activeAppointmentStatuses },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
    transaction.calendarBlock.findFirst({
      where: {
        professionalId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);

  if (appointmentConflict || blockConflict) {
    return "Este horário conflita com outro atendimento ou bloqueio.";
  }

  return null;
}

export async function createAppointmentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const clientId = formData.get("clientId");
  const serviceId = formData.get("serviceId");

  if (
    typeof clientId !== "string" ||
    !clientId.trim() ||
    typeof serviceId !== "string" ||
    !serviceId.trim()
  ) {
    return { error: "Selecione um cliente e um serviço." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { timezone: true },
  });

  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  const startsAt = readDateTime(formData.get("startsAt"), professional.timezone);

  if (!startsAt || startsAt <= new Date()) {
    return { error: "Escolha uma data e horário futuros válidos." };
  }

  const [client, service] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, professionalId },
      select: { id: true, name: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, professionalId, isActive: true },
      select: { id: true, name: true, price: true, durationMinutes: true },
    }),
  ]);

  if (!client) {
    return { error: "Cliente não encontrado nesta conta." };
  }

  if (!service) {
    return { error: "O serviço selecionado não está ativo nesta conta." };
  }

  const endsAt = new Date(
    startsAt.getTime() + service.durationMinutes * 60_000,
  );
  const rawNotes = formData.get("notes");

  if (rawNotes !== null && typeof rawNotes !== "string") {
    return { error: "Observações inválidas." };
  }

  const notes = typeof rawNotes === "string" ? rawNotes.trim() || null : null;

  if ((notes?.length ?? 0) > 1000) {
    return { error: "As observações devem ter no máximo 1.000 caracteres." };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const conflict = await ensureSlotIsAvailable(
          transaction,
          professionalId,
          professional.timezone,
          startsAt,
          endsAt,
        );

        if (conflict) {
          throw new SlotValidationError(conflict);
        }

        const appointment = await transaction.appointment.create({
          data: {
            professionalId,
            clientId: client.id,
            serviceId: service.id,
            startsAt,
            endsAt,
            status: AppointmentStatus.CONFIRMED,
            priceAtBooking: service.price,
            notes,
          },
          select: { id: true },
        });

        await transaction.transaction.create({
          data: {
            professionalId,
            appointmentId: appointment.id,
            type: "INCOME",
            status: "PENDING",
            amount: service.price,
            description: `${service.name} · ${client.name}`,
            category: "Atendimento",
            dueAt: startsAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof SlotValidationError) {
      return { error: error.message };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        error:
          "O horário foi reservado por outra operação. Atualize a agenda e tente novamente.",
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/clients");
  return { success: "Atendimento agendado." };
}

export async function deleteCalendarBlockAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const blockId = formData.get("blockId");

  if (typeof blockId !== "string" || !blockId.trim()) {
    return { error: "Bloqueio inválido." };
  }

  const result = await getPrismaClient().calendarBlock.deleteMany({
    where: { id: blockId, professionalId },
  });

  if (result.count !== 1) {
    return { error: "Bloqueio não encontrado nesta conta." };
  }

  revalidatePath("/dashboard/calendar");
  return { success: "Bloqueio removido." };
}

export async function updateAppointmentStatusAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const appointmentId = formData.get("appointmentId");
  const intent = formData.get("intent");

  if (
    typeof appointmentId !== "string" ||
    !appointmentId.trim() ||
    (intent !== "cancel" && intent !== "complete" && intent !== "confirm")
  ) {
    return { error: "Ação de atendimento inválida." };
  }

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, professionalId },
    select: {
      id: true,
      startsAt: true,
      status: true,
      priceAtBooking: true,
      service: { select: { name: true, materialCost: true } },
      client: { select: { name: true } },
    },
  });

  if (!appointment) {
    return { error: "Atendimento não encontrado nesta conta." };
  }

  if (
    intent === "confirm" &&
    appointment.status !== AppointmentStatus.PENDING
  ) {
    return { error: "Somente solicitações pendentes podem ser confirmadas." };
  }

  if (!activeAppointmentStatuses.includes(appointment.status)) {
    return { error: "Este atendimento já foi encerrado." };
  }

  if (intent === "complete" && appointment.startsAt > new Date()) {
    return { error: "Não é possível concluir um atendimento futuro." };
  }

  const nextStatus =
    intent === "cancel"
      ? AppointmentStatus.CANCELLED
      : intent === "confirm"
        ? AppointmentStatus.CONFIRMED
        : AppointmentStatus.COMPLETED;

  const updated = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.appointment.updateMany({
      where: {
        id: appointment.id,
        professionalId,
        status:
          intent === "confirm"
            ? AppointmentStatus.PENDING
            : { in: activeAppointmentStatuses },
      },
      data:
        intent === "complete"
          ? {
              status: nextStatus,
              materialCost: appointment.service.materialCost,
            }
          : { status: nextStatus },
    });

    if (updated.count !== 1) {
      return false;
    }

    if (intent === "cancel") {
      await transaction.transaction.updateMany({
        where: {
          appointmentId: appointment.id,
          professionalId,
          type: "INCOME",
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });
    }

    if (intent === "complete") {
      const description = `${appointment.service.name} · ${appointment.client.name}`;
      const paidAt = new Date();
      await transaction.transaction.upsert({
        where: {
          appointmentId_type: {
            appointmentId: appointment.id,
            type: TransactionType.INCOME,
          },
        },
        create: {
          professionalId,
          appointmentId: appointment.id,
          type: TransactionType.INCOME,
          status: TransactionStatus.PAID,
          amount: appointment.priceAtBooking,
          description,
          category: "Atendimento",
          dueAt: appointment.startsAt,
          paidAt,
        },
        update: {
          status: TransactionStatus.PAID,
          amount: appointment.priceAtBooking,
          paidAt,
        },
      });
      await transaction.transaction.upsert({
        where: {
          appointmentId_type: {
            appointmentId: appointment.id,
            type: TransactionType.EXPENSE,
          },
        },
        create: {
          professionalId,
          appointmentId: appointment.id,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.PAID,
          amount: appointment.service.materialCost,
          description: `Materiais · ${description}`,
          category: "Custo Operacional",
          dueAt: appointment.startsAt,
          paidAt,
        },
        update: {
          status: TransactionStatus.PAID,
          amount: appointment.service.materialCost,
          paidAt,
        },
      });
    }

    return true;
  });

  if (!updated) {
    return { error: "O atendimento foi atualizado em outra operação." };
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return {
    success:
      intent === "cancel"
        ? "Atendimento cancelado."
        : intent === "confirm"
          ? "Atendimento confirmado."
          : "Atendimento concluído.",
  };
}

export async function saveWorkingHoursRulesAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const rawStart = formData.get("startTime");
  const rawEnd = formData.get("endTime");
  const rawInterval = formData.get("interval");
  const rawBlockedSlots = formData.get("blockedSlots");
  const applyTo = formData.get("applyTo");
  const rawWeekday = formData.get("weekday");

  if (
    typeof rawStart !== "string" ||
    typeof rawEnd !== "string" ||
    typeof rawInterval !== "string" ||
    typeof rawBlockedSlots !== "string" ||
    (applyTo !== "all" && applyTo !== "day")
  ) {
    return { error: "As regras enviadas são inválidas." };
  }

  const minutePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const startMatch = minutePattern.exec(rawStart);
  const endMatch = minutePattern.exec(rawEnd);
  const startMinute = startMatch
    ? Number(startMatch[1]) * 60 + Number(startMatch[2])
    : -1;
  const endMinute = endMatch
    ? Number(endMatch[1]) * 60 + Number(endMatch[2])
    : -1;
  const interval = Number(rawInterval);

  if (
    startMinute < 0 ||
    endMinute <= startMinute ||
    ![15, 30, 45, 60].includes(interval)
  ) {
    return { error: "Informe expediente e intervalo válidos." };
  }

  let blockedSlots: unknown;
  try {
    blockedSlots = JSON.parse(rawBlockedSlots);
  } catch {
    return { error: "A lista de pausas selecionadas é inválida." };
  }

  if (
    !Array.isArray(blockedSlots) ||
    !blockedSlots.every((slot): slot is string => typeof slot === "string")
  ) {
    return { error: "A lista de pausas selecionadas é inválida." };
  }

  const uniqueBlockedSlots = [...new Set(blockedSlots)];
  if (
    uniqueBlockedSlots.some((slot) => {
      const match = minutePattern.exec(slot);
      if (!match) return true;

      const minute = Number(match[1]) * 60 + Number(match[2]);
      return (
        minute < startMinute ||
        minute + interval > endMinute ||
        (minute - startMinute) % interval !== 0
      );
    })
  ) {
    return {
      error: "As pausas precisam coincidir com os intervalos do expediente.",
    };
  }

  const rawActiveWeekdays = formData.getAll("activeWeekday");
  const activeWeekdays = rawActiveWeekdays.map((value) =>
    typeof value === "string" ? Number(value) : -1,
  );
  if (
    activeWeekdays.some(
      (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6,
    )
  ) {
    return { error: "A seleção de dias de funcionamento é inválida." };
  }

  let weekdaysToSave: number[];
  if (applyTo === "all") {
    weekdaysToSave = [...new Set(activeWeekdays)];
    if (weekdaysToSave.length === 0) {
      return { error: "Selecione ao menos um dia de funcionamento." };
    }
  } else {
    const weekday = typeof rawWeekday === "string" ? Number(rawWeekday) : -1;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return { error: "Selecione um dia da semana válido." };
    }
    weekdaysToSave = [weekday];
  }

  const prisma = getPrismaClient();
  const values = { startMinute, endMinute, interval, blockedSlots: uniqueBlockedSlots };
  await prisma.$transaction(async (transaction) => {
    if (applyTo === "all") {
      await Promise.all(
        Array.from({ length: 7 }, (_, weekday) => {
          const isActive = weekdaysToSave.includes(weekday);
          return transaction.workingHours.upsert({
            where: { professionalId_weekday: { professionalId, weekday } },
            create: {
              professionalId,
              weekday,
              ...values,
              isActive,
            },
            update: isActive ? { ...values, isActive: true } : { isActive: false },
          });
        }),
      );
      return;
    }

    const weekday = weekdaysToSave[0];
    await transaction.workingHours.upsert({
      where: { professionalId_weekday: { professionalId, weekday } },
      create: {
        professionalId,
        weekday,
        ...values,
        isActive: true,
      },
      update: { ...values, isActive: true },
    });
  });

  revalidatePath("/dashboard/agenda/configuracoes");
  revalidatePath("/dashboard/calendar");
  return { success: "Regras de funcionamento salvas." };
}
