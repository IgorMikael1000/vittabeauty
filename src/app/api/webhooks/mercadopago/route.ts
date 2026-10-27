import {
  Invoice,
  MercadoPagoConfig,
  Payment,
  PreApproval,
  WebhookSignatureValidator,
} from "mercadopago";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { applyApprovedCheckoutPayment } from "@/lib/subscription-payments";
import {
  isSubscriptionPlanType,
  subscriptionPlans,
} from "@/lib/subscriptions";

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

async function handlePreapproval(preapprovalId: string): Promise<void> {
  const preapproval = await new PreApproval(getClient()).get({
    id: preapprovalId,
  });
  const reference = getPlanReference(preapproval.external_reference);
  if (
    !reference ||
    (preapproval.status !== "cancelled" && preapproval.status !== "canceled")
  ) {
    return;
  }

  await getPrismaClient().professional.updateMany({
    where: {
      id: reference.professionalId,
      mpSubscriptionId: preapprovalId,
    },
    data: { subscriptionStatus: "CANCELED" },
  });
}

async function handleAuthorizedPayment(paymentId: string): Promise<void> {
  const invoice = await new Invoice(getClient()).get({ id: paymentId });
  if (!invoice.preapproval_id) return;

  const preapproval = await new PreApproval(getClient()).get({
    id: invoice.preapproval_id,
  });
  const reference = getPlanReference(preapproval.external_reference);
  if (!reference) return;

  const paymentStatus = invoice.payment?.status;
  const isPaid = paymentStatus === "approved" || invoice.status === "processed";
  const isSubscriptionCancelled =
    preapproval.status === "cancelled" || preapproval.status === "canceled";

  if (!isPaid) {
    const isRejected =
      paymentStatus === "rejected" ||
      invoice.status === "recycling" ||
      invoice.status === "cancelled";
    if (isRejected) {
      await getPrismaClient().professional.updateMany({
        where: {
          id: reference.professionalId,
          expiresAt: { lte: new Date() },
        },
        data: { subscriptionStatus: "EXPIRED" },
      });
    }
    return;
  }

  const paidAtCandidate = new Date(
    invoice.last_modified ?? invoice.date_created ?? Date.now(),
  );
  const paidAt = Number.isNaN(paidAtCandidate.getTime())
    ? new Date()
    : paidAtCandidate;
  const plan = subscriptionPlans[reference.planType];

  try {
    await getPrismaClient().$transaction(async (transaction) => {
      await transaction.subscriptionPayment.create({
        data: {
          mercadoPagoPaymentId: paymentId,
          professionalId: reference.professionalId,
          planType: reference.planType,
          paidAt,
        },
      });

      const professional = await transaction.professional.findUnique({
        where: { id: reference.professionalId },
        select: { expiresAt: true },
      });
      if (!professional) {
        throw new Error("Subscription payment references an unknown account.");
      }

      const baseTime = Math.max(
        professional.expiresAt.getTime(),
        paidAt.getTime(),
      );
      await transaction.professional.update({
        where: { id: reference.professionalId },
        data: {
          subscriptionStatus: isSubscriptionCancelled ? "CANCELED" : "ACTIVE",
          planType: reference.planType,
          mpSubscriptionId: invoice.preapproval_id,
          expiresAt: new Date(baseTime + plan.durationDays * 24 * 60 * 60 * 1000),
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function handlePreferencePayment(paymentId: string): Promise<void> {
  const payment = await new Payment(getClient()).get({ id: paymentId });
  const reference = getPlanReference(payment.external_reference);
  if (!reference) return;

  if (payment.status !== "approved") {
    if (
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
    return;
  }

  const paidAtCandidate = new Date(
    payment.date_approved ?? payment.date_created ?? Date.now(),
  );
  const paidAt = Number.isNaN(paidAtCandidate.getTime())
    ? new Date()
    : paidAtCandidate;
  await applyApprovedCheckoutPayment({
    paymentId,
    externalReference: payment.external_reference,
    paidAt,
  });
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

  if (
    eventType.includes("subscription_preapproval") ||
    eventType === "preapproval"
  ) {
    await handlePreapproval(dataId);
  } else if (eventType.includes("authorized_payment")) {
    await handleAuthorizedPayment(dataId);
  } else if (eventType === "payment" || eventType.startsWith("payment.")) {
    await handlePreferencePayment(dataId);
  }

  return NextResponse.json({ received: true });
}
