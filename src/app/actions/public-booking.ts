"use server";

import {
  AppointmentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { getDayBounds, isValidBookingDate } from "@/lib/public-booking";
import {
  getDateInTimezone,
  getWeekdayInTimezone,
  isAvailableWorkingHoursSlot,
  parseDateTimeInTimezone,
} from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";
import {
  normalizeClientName,
  normalizeClientWhatsapp,
} from "@/lib/client-normalization";

class BookingUnavailableError extends Error {}

const activeAppointmentStatuses: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export async function createPublicBookingAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const slug = formData.get("slug");
  const serviceId = formData.get("serviceId");
  const date = formData.get("date");
  const startsAtInput = formData.get("startsAt");
  const nameInput = formData.get("name");
  const whatsappInput = formData.get("whatsapp");

  if (
    typeof slug !== "string" ||
    typeof serviceId !== "string" ||
    typeof date !== "string" ||
    typeof startsAtInput !== "string" ||
    typeof nameInput !== "string" ||
    typeof whatsappInput !== "string"
  ) {
    return { error: "Preencha os campos obrigatórios do agendamento." };
  }

  const name = nameInput.trim();
  const whatsapp = normalizeClientWhatsapp(whatsappInput);

  if (name.length < 2 || name.length > 100) {
    return { error: "O nome deve ter entre 2 e 100 caracteres." };
  }

  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return { error: "Informe um WhatsApp com DDD e até 15 dígitos." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: { id: true, timezone: true, pixKey: true, expiresAt: true },
  });

  if (!professional) {
    return { error: "Este link de agendamento não está disponível." };
  }

  if (professional.expiresAt <= new Date()) {
    return {
      error:
        "Este profissional está temporariamente indisponível para agendamentos online.",
    };
  }

  if (!isValidBookingDate(date, professional.timezone)) {
    return { error: "Escolha uma data disponível nos próximos 90 dias." };
  }

  const startsAt = parseDateTimeInTimezone(
    startsAtInput,
    professional.timezone,
  );

  if (
    !startsAt ||
    startsAt <= new Date() ||
    getDateInTimezone(startsAt, professional.timezone) !== date
  ) {
    return { error: "O horário escolhido não é válido." };
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      professionalId: professional.id,
      isActive: true,
      onlineBookingEnabled: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      durationMinutes: true,
      depositAmount: true,
    },
  });

  if (!service) {
    return { error: "Este serviço não está disponível para agendamento online." };
  }

  if (Number(service.depositAmount ?? 0) > 0 && !professional.pixKey) {
    return {
      error:
        "O sinal deste serviço está temporariamente indisponível. Entre em contato com a profissional.",
    };
  }

  const endsAt = new Date(
    startsAt.getTime() + service.durationMinutes * 60_000,
  );
  const bounds = getDayBounds(date, professional.timezone);

  if (
    !bounds ||
    startsAt < bounds.start ||
    endsAt > bounds.end
  ) {
    return { error: "O horário escolhido não é válido." };
  }

  const workingHours = await prisma.workingHours.findUnique({
    where: {
      professionalId_weekday: {
        professionalId: professional.id,
        weekday: getWeekdayInTimezone(startsAt, professional.timezone),
      },
    },
  });

  const localStartParts = new Intl.DateTimeFormat("en-US", {
    timeZone: professional.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startsAt);
  const localEndParts = new Intl.DateTimeFormat("en-US", {
    timeZone: professional.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(endsAt);
  const startValues = Object.fromEntries(
    localStartParts.map((part) => [part.type, part.value]),
  );
  const endValues = Object.fromEntries(
    localEndParts.map((part) => [part.type, part.value]),
  );
  const startMinute =
    Number(startValues.hour) * 60 + Number(startValues.minute);
  const endMinute = Number(endValues.hour) * 60 + Number(endValues.minute);
  if (
    !workingHours?.isActive ||
    !isAvailableWorkingHoursSlot(startMinute, endMinute, workingHours)
  ) {
    return {
      error: "O horário escolhido não está mais disponível ou coincide com uma pausa.",
    };
  }

  const rawNotes = formData.get("notes");
  if (rawNotes !== null && typeof rawNotes !== "string") {
    return { error: "Observações inválidas." };
  }

  const notes =
    typeof rawNotes === "string" ? rawNotes.trim().slice(0, 500) || null : null;

  let appointmentId: string;
  try {
    appointmentId = await prisma.$transaction(
      async (transaction) => {
        const [appointmentConflict, blockConflict] = await Promise.all([
          transaction.appointment.findFirst({
            where: {
              professionalId: professional.id,
              status: { in: activeAppointmentStatuses },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
            select: { id: true },
          }),
          transaction.calendarBlock.findFirst({
            where: {
              professionalId: professional.id,
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
            select: { id: true },
          }),
        ]);

        if (appointmentConflict || blockConflict) {
          throw new BookingUnavailableError(
            "Este horário acabou de ser reservado. Escolha outro horário.",
          );
        }

        const existingClientByWhatsapp = await transaction.$queryRaw<
          Array<{ id: string; name: string; whatsapp: string }>
        >`
          SELECT "id", "name", "whatsapp"
          FROM "Client"
          WHERE "professionalId" = ${professional.id}
            AND regexp_replace("whatsapp", '[^0-9]', '', 'g') = ${whatsapp}
          ORDER BY "createdAt" ASC
          LIMIT 1
        `;
        const existingClientByName = existingClientByWhatsapp.length
          ? []
          : await transaction.$queryRaw<
              Array<{ id: string; name: string; whatsapp: string }>
            >`
              SELECT "id", "name", "whatsapp"
              FROM "Client"
              WHERE "professionalId" = ${professional.id}
                AND lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g')) =
                    ${normalizeClientName(name)}
              ORDER BY "createdAt" ASC
              LIMIT 1
            `;
        const existingClient =
          existingClientByWhatsapp[0] ?? existingClientByName[0];
        const client = existingClient
          ? { id: existingClient.id, name: existingClient.name }
          : await transaction.client.create({
              data: {
                professionalId: professional.id,
                name,
                whatsapp,
              },
              select: { id: true, name: true },
            });

        const appointment = await transaction.appointment.create({
          data: {
            professionalId: professional.id,
            clientId: client.id,
            serviceId: service.id,
            startsAt,
            endsAt,
            priceAtBooking: service.price,
            depositAmount: service.depositAmount ?? 0,
            status: AppointmentStatus.PENDING,
            notes,
          },
          select: { id: true },
        });

        await transaction.transaction.create({
          data: {
            professionalId: professional.id,
            appointmentId: appointment.id,
            type: "INCOME",
            status: "PENDING",
            amount: service.price,
            description: `${service.name} · ${client.name}`,
            category: "Agendamento online",
            dueAt: startsAt,
          },
        });
        return appointment.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof BookingUnavailableError) {
      return { error: error.message };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        error:
          "A agenda acabou de ser alterada. Atualize os horários e tente novamente.",
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  const search = new URLSearchParams({
    success: "1",
    appointmentId,
  });
  redirect(
    `/agendar/${encodeURIComponent(slug)}?${search.toString()}`,
  );
}
