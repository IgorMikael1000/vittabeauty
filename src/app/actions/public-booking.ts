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
  parseDateTimeInTimezone,
} from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";

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
  const whatsapp = whatsappInput.replace(/\D/g, "");

  if (name.length < 2 || name.length > 100) {
    return { error: "O nome deve ter entre 2 e 100 caracteres." };
  }

  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return { error: "Informe um WhatsApp com DDD e até 15 dígitos." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: { id: true, timezone: true },
  });

  if (!professional) {
    return { error: "Este link de agendamento não está disponível." };
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
    },
  });

  if (!service) {
    return { error: "Este serviço não está disponível para agendamento online." };
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
  const onQuarterHour =
    workingHours !== null &&
    (startMinute - workingHours.startMinute) % 15 === 0;

  if (
    !workingHours?.isActive ||
    startMinute < workingHours.startMinute ||
    endMinute > workingHours.endMinute ||
    !onQuarterHour
  ) {
    return { error: "O horário escolhido não está mais disponível." };
  }

  const rawNotes = formData.get("notes");
  if (rawNotes !== null && typeof rawNotes !== "string") {
    return { error: "Observações inválidas." };
  }

  const notes =
    typeof rawNotes === "string" ? rawNotes.trim().slice(0, 500) || null : null;

  try {
    await prisma.$transaction(
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

        const existingClients = await transaction.client.findMany({
          where: { professionalId: professional.id },
          select: { id: true, whatsapp: true },
        });
        const existingClient = existingClients.find(
          (client) => client.whatsapp.replace(/\D/g, "") === whatsapp,
        );
        const client = existingClient
          ? await transaction.client.update({
              where: { id: existingClient.id },
              data: { name, whatsapp },
              select: { id: true, name: true },
            })
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
  redirect(`/agendar/${encodeURIComponent(slug)}?success=1`);
}
