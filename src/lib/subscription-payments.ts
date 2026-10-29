import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import {
  isSubscriptionPlanType,
  subscriptionPlans,
} from "@/lib/subscriptions";

type CheckoutPayment = {
  paymentId: string;
  externalReference: string | undefined;
  status: string;
  statusDetail?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentType?: string;
  installments?: number;
  refundedAmount?: number;
  paidAt?: Date;
  expectedProfessionalId?: string;
};

export async function syncCheckoutPayment({
  paymentId,
  externalReference,
  status,
  statusDetail,
  amount,
  currency,
  paymentMethod,
  paymentType,
  installments,
  refundedAmount,
  paidAt,
  expectedProfessionalId,
}: CheckoutPayment): Promise<boolean> {
  if (!externalReference) return false;

  const separator = externalReference.lastIndexOf(":");
  if (separator <= 0) return false;

  const professionalId = externalReference.slice(0, separator);
  const planType = externalReference.slice(separator + 1);
  if (
    !professionalId ||
    (expectedProfessionalId && professionalId !== expectedProfessionalId) ||
    !isSubscriptionPlanType(planType)
  ) {
    return false;
  }

  const plan = subscriptionPlans[planType];
  if (
    amount === undefined ||
    Math.round(amount * 100) !== Math.round(plan.amount * 100) ||
    currency !== "BRL"
  ) {
    return false;
  }
  if (status === "approved" && !paidAt) {
    throw new Error("Approved Mercado Pago payment requires a paid date.");
  }

  const prisma = getPrismaClient();

  try {
    await prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.subscriptionPayment.findUnique({
          where: { mercadoPagoPaymentId: paymentId },
          select: { appliedAt: true, status: true },
        });
        const paymentData = {
          professionalId,
          planType,
          status,
          statusDetail: statusDetail ?? null,
          amount: amount ?? null,
          currency: currency ?? null,
          paymentMethod: paymentMethod ?? null,
          paymentType: paymentType ?? null,
          installments: installments ?? null,
          refundedAmount: refundedAmount ?? null,
          paidAt: paidAt ?? null,
        };

        if (existing) {
          await transaction.subscriptionPayment.update({
            where: { mercadoPagoPaymentId: paymentId },
            data: paymentData,
          });
        } else {
          await transaction.subscriptionPayment.create({
            data: {
              mercadoPagoPaymentId: paymentId,
              ...paymentData,
            },
          });
        }

        const isRevokedPayment =
          (status === "refunded" || status === "charged_back") &&
          existing?.status === "approved" &&
          existing.appliedAt !== null;
        if (isRevokedPayment) {
          await transaction.professional.updateMany({
            where: { id: professionalId },
            data: {
              subscriptionStatus: "EXPIRED",
              expiresAt: new Date(),
            },
          });
          return;
        }

        if (status !== "approved" || existing?.appliedAt || !paidAt) {
          return;
        }

        const claimed = await transaction.subscriptionPayment.updateMany({
          where: {
            mercadoPagoPaymentId: paymentId,
            appliedAt: null,
            status: "approved",
          },
          data: { appliedAt: paidAt },
        });
        if (claimed.count !== 1) return;

        const professional = await transaction.professional.findUnique({
          where: { id: professionalId },
          select: { expiresAt: true },
        });
        if (!professional) {
          throw new Error("Checkout payment references an unknown account.");
        }

        const baseTime = Math.max(
          professional.expiresAt.getTime(),
          paidAt.getTime(),
        );
        await transaction.professional.update({
          where: { id: professionalId },
          data: {
            subscriptionStatus: "ACTIVE",
            planType,
            expiresAt: new Date(
              baseTime + plan.durationDays * 24 * 60 * 60 * 1000,
            ),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return true;
    }
    throw error;
  }
}
