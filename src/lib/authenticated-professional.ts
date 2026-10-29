import "server-only";
import { redirect } from "next/navigation";
import { getFirebaseSession } from "@/lib/firebase-session";
import { getPrismaClient } from "@/lib/prisma";

export async function getCurrentProfessionalId(): Promise<string | null> {
  const session = await getFirebaseSession();
  if (!session) return null;

  const professional = await getPrismaClient().professional.findUnique({
    where: { firebaseUid: session.uid },
    select: {
      id: true,
      deletionPendingAt: true,
      deletionRequestedAt: true,
    },
  });
  return professional &&
    !professional.deletionPendingAt &&
    !professional.deletionRequestedAt
    ? professional.id
    : null;
}

export async function getAuthenticatedProfessionalId(
  options: { allowExpired?: boolean } = {},
): Promise<string> {
  const session = await getFirebaseSession();
  if (!session) {
    redirect("/login");
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { firebaseUid: session.uid },
    select: {
      id: true,
      expiresAt: true,
      deletionPendingAt: true,
      deletionRequestedAt: true,
    },
  });
  if (!professional) {
    redirect("/login");
  }
  if (professional.deletionPendingAt) {
    redirect("/login");
  }
  if (professional.deletionRequestedAt) {
    redirect("/login");
  }

  if (!options.allowExpired) {
    if (professional.expiresAt <= new Date()) {
      await getPrismaClient().professional.updateMany({
        where: {
          id: professional.id,
          subscriptionStatus: { not: "EXPIRED" },
          expiresAt: { lte: new Date() },
        },
        data: { subscriptionStatus: "EXPIRED" },
      });
      redirect("/dashboard/conta/assinatura");
    }
  }

  return professional.id;
}
