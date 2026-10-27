import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function getAuthenticatedProfessionalId(
  options: { allowExpired?: boolean } = {},
): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!options.allowExpired) {
    const professional = await getPrismaClient().professional.findUnique({
      where: { id: session.user.id },
      select: { expiresAt: true },
    });

    if (!professional) {
      redirect("/login");
    }

    if (professional.expiresAt <= new Date()) {
      await getPrismaClient().professional.updateMany({
        where: {
          id: session.user.id,
          subscriptionStatus: { not: "EXPIRED" },
          expiresAt: { lte: new Date() },
        },
        data: { subscriptionStatus: "EXPIRED" },
      });
      redirect("/dashboard/conta/assinatura");
    }
  }

  return session.user.id;
}
