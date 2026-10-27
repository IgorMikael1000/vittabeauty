"use server";

import {
  AppointmentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import {
  getDateInTimezone,
  getWeekdayInTimezone,
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
    localStartMinute < workingHours.startMinute ||
    localEndMinute > workingHours.endMinute
  ) {
    return "O horário está fora do expediente configurado.";
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

export async function createCalendarBlockAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { timezone: true },
  });

  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  const startsAt = readDateTime(formData.get("startsAt"), professional.timezone);
  const endsAt = readDateTime(formData.get("endsAt"), professional.timezone);
  const rawReason = formData.get("reason");

  if (
    !startsAt ||
    !endsAt ||
    startsAt <= new Date() ||
    endsAt <= startsAt ||
    getDateInTimezone(startsAt, professional.timezone) !==
      getDateInTimezone(endsAt, professional.timezone)
  ) {
    return { error: "Informe um período futuro válido para o bloqueio." };
  }

  if (rawReason !== null && typeof rawReason !== "string") {
    return { error: "Motivo do bloqueio inválido." };
  }

  const reason = typeof rawReason === "string" ? rawReason.trim() || null : null;

  if ((reason?.length ?? 0) > 120) {
    return { error: "O motivo deve ter no máximo 120 caracteres." };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
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
          throw new SlotValidationError(
            "Este período conflita com outro atendimento ou bloqueio.",
          );
        }

        await transaction.calendarBlock.create({
          data: { professionalId, startsAt, endsAt, reason },
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
          "A agenda foi alterada por outra operação. Atualize a página e tente novamente.",
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/calendar");
  return { success: "Horário bloqueado." };
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
    select: { id: true, startsAt: true, status: true },
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
      data: { status: nextStatus },
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

export async function saveWorkingHoursAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const days = Array.from({ length: 7 }, (_, weekday) => {
    const active = formData.get(`day-${weekday}-active`) === "on";
    const start = formData.get(`day-${weekday}-start`);
    const end = formData.get(`day-${weekday}-end`);

    if (typeof start !== "string" || typeof end !== "string") {
      return { error: `Configure os horários de ${weekday}.` } as const;
    }

    const minutePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const startMatch = minutePattern.exec(start);
    const endMatch = minutePattern.exec(end);
    const startMinute = startMatch
      ? Number(startMatch[1]) * 60 + Number(startMatch[2])
      : -1;
    const endMinute = endMatch
      ? Number(endMatch[1]) * 60 + Number(endMatch[2])
      : -1;

    if (active && (startMinute < 0 || endMinute <= startMinute)) {
      return {
        error: "O fim do expediente precisa ser posterior ao início.",
      } as const;
    }

    return {
      weekday,
      startMinute: active ? startMinute : 9 * 60,
      endMinute: active ? endMinute : 17 * 60,
      isActive: active,
    } as const;
  });

  const invalidDay = days.find((day) => "error" in day);

  if (invalidDay && "error" in invalidDay) {
    return { error: invalidDay.error };
  }

  const prisma = getPrismaClient();
  await prisma.$transaction(
    days.map((day) => {
      if ("error" in day) {
        throw new Error(day.error);
      }

      const { weekday, ...data } = day;

      return prisma.workingHours.upsert({
        where: { professionalId_weekday: { professionalId, weekday } },
        create: { professionalId, weekday, ...data },
        update: data,
      });
    }),
  );

  revalidatePath("/dashboard/calendar");
  return { success: "Horários de funcionamento salvos." };
}
