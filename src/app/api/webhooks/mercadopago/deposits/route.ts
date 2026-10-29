import { WebhookSignatureValidator } from "mercadopago";
import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { processMercadoPagoPixDepositNotification } from "@/lib/mercadopago-deposit-payments";

export const runtime = "nodejs";

type WebhookPayload = {
  type?: unknown;
  action?: unknown;
  user_id?: unknown;
  data?: { id?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asIdentifier(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.MERCADOPAGO_DEPOSIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[mercadopago-deposit] MERCADOPAGO_DEPOSIT_WEBHOOK_SECRET is not configured.",
    );
    return NextResponse.json(
      { error: "Deposit webhook is not configured." },
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
      user_id: body.user_id,
      data: isRecord(body.data) ? { id: body.data.id } : undefined,
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const payloadId = asIdentifier(payload.data?.id);
  const paymentId = url.searchParams.get("data.id") ?? payloadId;
  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: paymentId,
      secret,
      toleranceSeconds: 300,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const eventType =
    typeof payload.type === "string"
      ? payload.type
      : typeof payload.action === "string"
        ? payload.action
        : url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  if (!eventType.startsWith("payment")) {
    return NextResponse.json({ received: true, ignored: true });
  }
  if (!paymentId) {
    return NextResponse.json(
      { error: "Missing payment ID." },
      { status: 400 },
    );
  }

  let accountId = asIdentifier(payload.user_id);
  if (!accountId) {
    const existingPayment =
      await getPrismaClient().appointmentDepositPayment.findUnique({
        where: { providerPaymentId: paymentId },
        select: {
          professional: {
            select: {
              mercadoPagoConnection: { select: { accountId: true } },
            },
          },
        },
      });
    accountId =
      existingPayment?.professional.mercadoPagoConnection?.accountId ?? null;
  }
  if (!accountId) {
    return NextResponse.json(
      { error: "Unable to identify the connected Mercado Pago account." },
      { status: 503 },
    );
  }

  try {
    const result = await processMercadoPagoPixDepositNotification({
      paymentId,
      accountId,
    });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("[mercadopago-deposit] Notification processing failed.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      paymentId,
    });
    return NextResponse.json(
      { error: "Deposit notification processing failed." },
      { status: 500 },
    );
  }
}
