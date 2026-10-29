import "server-only";

import { getPrismaClient } from "@/lib/prisma";
import {
  getMercadoPagoConnectedAccount,
  getMercadoPagoPaymentClient,
} from "@/lib/mercadopago-connected-account";
import {
  getLiveModeDepositMaximumCents,
  toDepositCents,
} from "@/lib/mercadopago-live-deposit-limit";

const DEPOSIT_REFERENCE_PREFIX = "vitta-deposit:";

function getPublicOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredOrigin) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  const origin = new URL(configuredOrigin);
  const isLocalhost =
    origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (
    (origin.protocol !== "https:" &&
      !(isLocalhost && origin.protocol === "http:")) ||
    origin.username ||
    origin.password
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an HTTPS application origin.");
  }
  return origin.origin;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function normalizeQRCode(value: string | undefined): string | null {
  if (
    !value ||
    value.length > 100_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    return null;
  }
  return value;
}

export async function createMercadoPagoPixDeposit(input: {
  professionalId: string;
  appointmentId: string;
  amount: number;
  payerEmail: string;
  payerName: string;
  expiresAt: Date;
}): Promise<{
  paymentId: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
}> {
  const connection = await getMercadoPagoConnectedAccount(
    input.professionalId,
  );
  const liveModeDepositMaximumCents =
    getLiveModeDepositMaximumCents();
  if (
    connection.liveMode &&
    (process.env.MERCADOPAGO_ALLOW_LIVE_MODE_DEPOSITS !== "true" ||
      liveModeDepositMaximumCents === null ||
      !Number.isFinite(input.amount) ||
      input.amount <= 0 ||
      toDepositCents(input.amount) > liveModeDepositMaximumCents)
  ) {
    throw new Error(
      "Pix deposit is blocked by the live-mode safety configuration.",
    );
  }

  const payerNames = input.payerName.trim().split(/\s+/);
  const payment = await getMercadoPagoPaymentClient(
    connection.accessToken,
  ).create({
    body: {
      transaction_amount: input.amount,
      description: "Sinal de agendamento · Vitta Beauty",
      payment_method_id: "pix",
      payer: {
        email: input.payerEmail,
        first_name: payerNames[0],
        last_name: payerNames.slice(1).join(" ") || undefined,
      },
      external_reference: `${DEPOSIT_REFERENCE_PREFIX}${input.appointmentId}`,
      notification_url: `${getPublicOrigin()}/api/webhooks/mercadopago/deposits`,
      date_of_expiration: input.expiresAt.toISOString(),
    },
    requestOptions: {
      idempotencyKey: `vitta-deposit-${input.appointmentId}`,
    },
  });

  if (
    typeof payment.id !== "number" ||
    payment.id <= 0 ||
    payment.status !== "pending" ||
    payment.payment_method_id !== "pix" ||
    payment.currency_id !== "BRL" ||
    typeof payment.transaction_amount !== "number" ||
    toCents(payment.transaction_amount) !== toCents(input.amount) ||
    String(payment.collector_id) !== connection.accountId ||
    payment.external_reference !==
      `${DEPOSIT_REFERENCE_PREFIX}${input.appointmentId}`
  ) {
    throw new Error(
      "Mercado Pago returned a Pix payment that did not match the appointment.",
    );
  }

  return {
    paymentId: String(payment.id),
    status: payment.status,
    qrCode: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: normalizeQRCode(
      payment.point_of_interaction?.transaction_data?.qr_code_base64,
    ),
  };
}

function getAppointmentIdFromExternalReference(
  externalReference: string | undefined,
): string | null {
  if (!externalReference?.startsWith(DEPOSIT_REFERENCE_PREFIX)) return null;
  const appointmentId = externalReference.slice(
    DEPOSIT_REFERENCE_PREFIX.length,
  );
  return appointmentId && !appointmentId.includes(":") ? appointmentId : null;
}

export async function processMercadoPagoPixDepositNotification(input: {
  paymentId: string;
  accountId: string;
}): Promise<"ignored" | "processed" | "late-payment"> {
  if (!/^\d{1,30}$/.test(input.paymentId) || !/^\d{1,30}$/.test(input.accountId)) {
    return "ignored";
  }

  const connectionRecord =
    await getPrismaClient().mercadoPagoConnection.findUnique({
      where: { accountId: input.accountId },
      select: { professionalId: true, accountId: true },
    });
  if (!connectionRecord) return "ignored";

  const connection = await getMercadoPagoConnectedAccount(
    connectionRecord.professionalId,
  );
  const payment = await getMercadoPagoPaymentClient(
    connection.accessToken,
  ).get({ id: input.paymentId });

  const appointmentId = getAppointmentIdFromExternalReference(
    payment.external_reference,
  );
  if (
    String(payment.id) !== input.paymentId ||
    String(payment.collector_id) !== connectionRecord.accountId ||
    payment.payment_method_id !== "pix" ||
    payment.currency_id !== "BRL" ||
    !appointmentId
  ) {
    return "ignored";
  }

  const depositPayment =
    await getPrismaClient().appointmentDepositPayment.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          select: {
            id: true,
            professionalId: true,
            status: true,
            startsAt: true,
            endsAt: true,
            depositAmount: true,
            priceAtBooking: true,
            client: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    });
  if (
    !depositPayment ||
    depositPayment.professionalId !== connectionRecord.professionalId ||
    depositPayment.appointment.professionalId !==
      connectionRecord.professionalId ||
    (depositPayment.providerPaymentId !== null &&
      depositPayment.providerPaymentId !== input.paymentId) ||
    !payment.transaction_amount ||
    toCents(payment.transaction_amount) !== toCents(Number(depositPayment.amount)) ||
    toCents(Number(depositPayment.appointment.depositAmount)) !==
      toCents(Number(depositPayment.amount))
  ) {
    return "ignored";
  }

  const normalizedStatus = payment.status ?? "unknown";
  const prisma = getPrismaClient();
  const paidAtValue = payment.date_approved;
  const paidAt =
    paidAtValue && !Number.isNaN(new Date(paidAtValue).getTime())
      ? new Date(paidAtValue)
      : new Date();
  const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
  const qrCodeBase64 = normalizeQRCode(
    payment.point_of_interaction?.transaction_data?.qr_code_base64,
  );

  if (normalizedStatus !== "approved") {
    await prisma.$transaction(async (transaction) => {
      const isReversal =
        normalizedStatus === "refunded" ||
        normalizedStatus === "charged_back";
      const paymentUpdate =
        await transaction.appointmentDepositPayment.updateMany({
          where: {
            id: depositPayment.id,
            OR: [
              { providerPaymentId: null },
              { providerPaymentId: input.paymentId },
            ],
            status: isReversal ? "approved" : { not: "approved" },
          },
          data: {
            providerPaymentId: input.paymentId,
            status: normalizedStatus,
            qrCode,
            qrCodeBase64,
          },
        });
      if (
        paymentUpdate.count === 1 &&
        isReversal
      ) {
        await transaction.transaction.updateMany({
          where: {
            depositPaymentId: depositPayment.id,
            status: "PAID",
          },
          data: { status: "CANCELLED", paidAt: null },
        });
      }
    });
    return "processed";
  }

  return prisma.$transaction(
    async (transaction) => {
      const paymentUpdated =
        await transaction.appointmentDepositPayment.updateMany({
          where: {
            id: depositPayment.id,
            OR: [
              { providerPaymentId: null },
              { providerPaymentId: input.paymentId },
            ],
            status: { not: "approved" },
          },
          data: {
            providerPaymentId: input.paymentId,
            status: "approved",
            paidAt,
            qrCode,
            qrCodeBase64,
          },
        });
      if (paymentUpdated.count !== 1) return "processed";

      const currentAppointment = await transaction.appointment.findUnique({
        where: {
          id_professionalId: {
            id: depositPayment.appointmentId,
            professionalId: depositPayment.professionalId,
          },
        },
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          depositPaymentExpiresAt: true,
          priceAtBooking: true,
        },
      });

      const now = new Date();
      const isBeforeExpiration =
        currentAppointment?.depositPaymentExpiresAt !== null &&
        currentAppointment?.depositPaymentExpiresAt !== undefined &&
        currentAppointment.depositPaymentExpiresAt > now;
      const otherAppointment = currentAppointment
        ? await transaction.appointment.findFirst({
            where: {
              professionalId: depositPayment.professionalId,
              id: { not: currentAppointment.id },
              startsAt: { lt: currentAppointment.endsAt },
              endsAt: { gt: currentAppointment.startsAt },
              OR: [
                { status: "CONFIRMED" },
                {
                  status: "PENDING",
                  OR: [
                    { depositPaymentExpiresAt: null },
                    { depositPaymentExpiresAt: { gt: now } },
                  ],
                },
              ],
            },
            select: { id: true },
          })
        : null;

      const canConfirm =
        currentAppointment?.status === "PENDING" &&
        isBeforeExpiration &&
        !otherAppointment;
      let appointmentConfirmed = currentAppointment?.status === "CONFIRMED";
      if (canConfirm && currentAppointment) {
        const appointmentUpdate = await transaction.appointment.updateMany({
          where: {
            id: currentAppointment.id,
            professionalId: depositPayment.professionalId,
            status: "PENDING",
            depositPaymentExpiresAt: { gt: now },
          },
          data: { status: "CONFIRMED" },
        });
        appointmentConfirmed = appointmentUpdate.count === 1;
      }

      const servicePrice = Number(
        depositPayment.appointment.priceAtBooking,
      );
      const balance = Math.max(
        0,
        Math.round((servicePrice - Number(depositPayment.amount)) * 100) /
          100,
      );
      const shouldKeepBalance = appointmentConfirmed;
      await transaction.transaction.updateMany({
        where: {
          appointmentId: depositPayment.appointmentId,
          professionalId: depositPayment.professionalId,
          type: "INCOME",
          status: "PENDING",
        },
        data: shouldKeepBalance
          ? {
              amount: balance,
              status: balance > 0 ? "PENDING" : "CANCELLED",
              description: `Saldo · ${depositPayment.appointment.service.name} · ${depositPayment.appointment.client.name}`,
              category: "Saldo de atendimento",
            }
          : { status: "CANCELLED" },
      });

      if (!shouldKeepBalance) {
        console.error("[mercadopago-deposit] Paid deposit could not confirm appointment.", {
          appointmentId: depositPayment.appointmentId,
          status: currentAppointment?.status ?? "missing",
          expired: !isBeforeExpiration,
          conflictingAppointmentId: otherAppointment?.id ?? null,
        });
      }

      await transaction.transaction.create({
        data: {
          professionalId: depositPayment.professionalId,
          depositPaymentId: depositPayment.id,
          type: "INCOME",
          status: "PAID",
          amount: depositPayment.amount,
          description: `Sinal · ${depositPayment.appointment.service.name} · ${depositPayment.appointment.client.name}`,
          category: "Sinal de agendamento",
          dueAt: depositPayment.appointment.startsAt,
          paidAt,
        },
      });

      return shouldKeepBalance ? "processed" : "late-payment";
    },
    { isolationLevel: "Serializable" },
  );
}
