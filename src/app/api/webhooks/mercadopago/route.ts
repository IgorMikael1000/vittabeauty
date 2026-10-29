import {
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
} from "mercadopago";
import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { syncCheckoutPayment } from "@/lib/subscription-payments";
import { isSubscriptionPlanType } from "@/lib/subscriptions";

export const runtime = "nodejs";

type WebhookPayload = {
  type?: unknown;
  action?: unknown;
  data?: { id?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPlanReference(value: string | undefined) {
  if (!value) return null;
  const separator = value.lastIndexOf(":");
  if (separator <= 0) return null;

  const professionalId = value.slice(0, separator);
  const planType = value.slice(separator + 1);
  if (!professionalId || !isSubscriptionPlanType(planType)) return null;
  return { professionalId, planType };
}

function getClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured.");
  }
  return new MercadoPagoConfig({ accessToken });
}

async function handlePreferencePayment(paymentId: string): Promise<void> {
  const payment = await new Payment(getClient()).get({ id: paymentId });
  const reference = getPlanReference(payment.external_reference);
  if (!reference) return;

  const paidAtValue = payment.date_approved ?? payment.date_created;
  const paidAt =
    paidAtValue && !Number.isNaN(new Date(paidAtValue).getTime())
      ? new Date(paidAtValue)
      : undefined;
  const paymentSynchronized = await syncCheckoutPayment({
    paymentId,
    externalReference: payment.external_reference,
    status: payment.status ?? "unknown",
    statusDetail: payment.status_detail,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    paymentMethod: payment.payment_method_id,
    paymentType: payment.payment_type_id,
    refundedAmount: payment.transaction_amount_refunded,
    paidAt,
  });

  console.info("[Mercado Pago] One-time payment webhook processed.", {
    correlationId: paymentId,
    status: payment.status ?? "unknown",
    synchronized: paymentSynchronized,
  });

  if (
    paymentSynchronized &&
    (payment.status === "rejected" || payment.status === "cancelled") &&
    payment.status_detail !== "pending_contingency" &&
    payment.status_detail !== "pending_review_manual"
  ) {
    await getPrismaClient().professional.updateMany({
      where: {
        id: reference.professionalId,
        expiresAt: { lte: new Date() },
      },
      data: { subscriptionStatus: "EXPIRED" },
    });
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("MERCADOPAGO_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  }

  let payload: WebhookPayload;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    payload = {
      type: body.type,
      action: body.action,
      data: isRecord(body.data) ? { id: body.data.id } : undefined,
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const payloadId =
    typeof payload.data?.id === "string" ||
    typeof payload.data?.id === "number"
      ? String(payload.data.id)
      : null;
  const dataId = url.searchParams.get("data.id") ?? payloadId;

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  if (!dataId) {
    return NextResponse.json({ error: "Missing resource ID." }, { status: 400 });
  }

  const eventType =
    typeof payload.type === "string"
      ? payload.type
      : typeof payload.action === "string"
        ? payload.action
        : url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";

  if (eventType === "payment" || eventType.startsWith("payment.")) {
    await handlePreferencePayment(dataId);
  }

  return NextResponse.json({ received: true });
}
