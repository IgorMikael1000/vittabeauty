import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import {
  isSubscriptionPlanType,
  subscriptionPlans,
} from "@/lib/subscriptions";

type ApprovedCheckoutPayment = {
  paymentId: string;
  externalReference: string | undefined;
  paidAt: Date;
  expectedProfessionalId?: string;
};

export async function applyApprovedCheckoutPayment({
  paymentId,
  externalReference,
  paidAt,
  expectedProfessionalId,
}: ApprovedCheckoutPayment): Promise<boolean> {
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
  const prisma = getPrismaClient();

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.subscriptionPayment.create({
        data: {
          mercadoPagoPaymentId: paymentId,
          professionalId,
          planType,
          paidAt,
        },
      });

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
    });

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
