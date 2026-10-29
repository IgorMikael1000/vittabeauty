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
import {
  checkRequestRateLimit,
  RequestRateLimitUnavailableError,
} from "@/lib/request-rate-limit";
import { createMercadoPagoPixDeposit } from "@/lib/mercadopago-deposit-payments";

class BookingUnavailableError extends Error {}

function getPixFailureDiagnostics(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) {
    return { errorType: typeof error };
  }

  const details = error as {
    name?: unknown;
    status?: unknown;
    error?: unknown;
    causes?: unknown;
  };
  const diagnostics: Record<string, unknown> = {};

  if (typeof details.name === "string") {
    diagnostics.errorType = details.name.slice(0, 80);
  }
  if (
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 0 &&
    details.status <= 599
  ) {
    diagnostics.providerHttpStatus = details.status;
  }
  if (
    typeof details.error === "string" &&
    /^[a-zA-Z0-9_.-]{1,80}$/.test(details.error)
  ) {
    diagnostics.providerError = details.error;
  }
  if (Array.isArray(details.causes)) {
    diagnostics.providerCauseCodes = details.causes
      .slice(0, 5)
      .flatMap((cause: unknown) => {
        if (typeof cause !== "object" || cause === null || !("code" in cause)) {
          return [];
        }
        const code = cause.code;
        return typeof code === "string" &&
          /^[a-zA-Z0-9_.-]{1,80}$/.test(code)
          ? [code]
          : typeof code === "number" && Number.isFinite(code)
            ? [String(code)]
            : [];
      });
  }

  return diagnostics;
}

export async function createPublicBookingAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  let rateLimit;
  try {
    rateLimit = await checkRequestRateLimit("public-booking");
  } catch (error) {
    if (!(error instanceof RequestRateLimitUnavailableError)) throw error;
    return {
      error: "O agendamento está temporariamente indisponível. Tente novamente.",
    };
  }
  if (!rateLimit.allowed) {
    return {
      error: `Muitas solicitações. Aguarde ${Math.ceil(
        rateLimit.retryAfterSeconds / 60,
      )} min e tente novamente.`,
    };
  }

  const slug = formData.get("slug");
  const serviceId = formData.get("serviceId");
  const date = formData.get("date");
  const startsAtInput = formData.get("startsAt");
  const nameInput = formData.get("name");
  const whatsappInput = formData.get("whatsapp");
  const emailInput = formData.get("email");

  if (
    typeof slug !== "string" ||
    typeof serviceId !== "string" ||
    typeof date !== "string" ||
    typeof startsAtInput !== "string" ||
    typeof nameInput !== "string" ||
    typeof whatsappInput !== "string" ||
    (emailInput !== null && typeof emailInput !== "string")
  ) {
    return { error: "Preencha os campos obrigatórios do agendamento." };
  }

  const name = nameInput.trim();
  const whatsapp = normalizeClientWhatsapp(whatsappInput);
  const payerEmail =
    typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

  if (name.length < 2 || name.length > 100) {
    return { error: "O nome deve ter entre 2 e 100 caracteres." };
  }

  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return { error: "Informe um WhatsApp com DDD e até 15 dígitos." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: {
      slug,
      deletionPendingAt: null,
      deletionRequestedAt: null,
    },
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

  const depositAmount = Number(service.depositAmount ?? 0);
  if (depositAmount > Number(service.price)) {
    return {
      error: "O valor do sinal não pode ser maior que o valor do serviço.",
    };
  }

  const mercadoPagoConnection =
    depositAmount > 0
      ? await prisma.mercadoPagoConnection.findUnique({
          where: { professionalId: professional.id },
          select: { liveMode: true },
        })
      : null;
  const allowsLiveModeDeposits =
    process.env.MERCADOPAGO_ALLOW_LIVE_MODE_DEPOSITS === "true";
  const usesAutomaticPix = Boolean(
    mercadoPagoConnection &&
      (!mercadoPagoConnection.liveMode || allowsLiveModeDeposits),
  );

  if (
    usesAutomaticPix &&
    (payerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail))
  ) {
    return { error: "Informe um e-mail válido para gerar o Pix." };
  }

  if (mercadoPagoConnection?.liveMode && !allowsLiveModeDeposits) {
    return {
      error:
        "A conta Mercado Pago está em produção. A habilitação de cobranças reais está desativada.",
    };
  }

  if (depositAmount > 0 && !usesAutomaticPix && !professional.pixKey) {
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

  const depositPaymentExpiresAt = usesAutomaticPix
    ? new Date(Date.now() + 30 * 60_000)
    : null;
  let appointmentId: string;
  try {
    appointmentId = await prisma.$transaction(
      async (transaction) => {
        const [appointmentConflict, blockConflict] = await Promise.all([
          transaction.appointment.findFirst({
            where: {
              professionalId: professional.id,
              startsAt: { gte: bounds.start, lt: endsAt },
              endsAt: { gt: startsAt },
              OR: [
                { status: AppointmentStatus.CONFIRMED },
                {
                  status: AppointmentStatus.PENDING,
                  OR: [
                    { depositPaymentExpiresAt: null },
                    { depositPaymentExpiresAt: { gt: new Date() } },
                  ],
                },
              ],
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
            depositAmount,
            depositPaymentExpiresAt,
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
        if (depositPaymentExpiresAt) {
          await transaction.appointmentDepositPayment.create({
            data: {
              professionalId: professional.id,
              appointmentId: appointment.id,
              amount: depositAmount,
              expiresAt: depositPaymentExpiresAt,
            },
          });
        }
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

  if (depositPaymentExpiresAt) {
    let pixCreationPhase = "provider_request";
    try {
      const pixPayment = await createMercadoPagoPixDeposit({
        professionalId: professional.id,
        appointmentId,
        amount: depositAmount,
        payerEmail,
        payerName: name,
        expiresAt: depositPaymentExpiresAt,
      });
      pixCreationPhase = "persisting_payment_record";
      const paymentSaved =
        await prisma.appointmentDepositPayment.updateMany({
          where: {
            appointmentId,
            OR: [
              { providerPaymentId: null },
              { providerPaymentId: pixPayment.paymentId },
            ],
            status: { not: "approved" },
          },
          data: {
            providerPaymentId: pixPayment.paymentId,
            status: pixPayment.status,
            qrCode: pixPayment.qrCode,
            qrCodeBase64: pixPayment.qrCodeBase64,
          },
        });
      if (paymentSaved.count === 0) {
        const currentPayment =
          await prisma.appointmentDepositPayment.findUnique({
            where: { appointmentId },
            select: { providerPaymentId: true, status: true },
          });
        if (
          currentPayment?.providerPaymentId !== pixPayment.paymentId ||
          currentPayment.status !== "approved"
        ) {
          throw new Error(
            "The Pix payment record changed while the provider request was completing.",
          );
        }
      }
    } catch (error) {
      console.error("[mercadopago-deposit] Pix payment creation failed.", {
        appointmentId,
        phase: pixCreationPhase,
        ...getPixFailureDiagnostics(error),
      });
      await prisma.appointmentDepositPayment.updateMany({
        where: { appointmentId, status: { not: "approved" } },
        data: { status: "creation_failed" },
      });
      return {
        error:
          "Não foi possível confirmar a geração do Pix. Por segurança, o horário ficará reservado por até 30 minutos; se o QR Code não aparecer, fale com a profissional.",
      };
    }
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
