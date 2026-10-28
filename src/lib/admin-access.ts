import "server-only";
import { redirect } from "next/navigation";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export async function requireAdmin(): Promise<string> {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });

  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: { role: true },
  });
  if (!professional) {
    redirect("/login");
  }
  if (professional.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return professionalId;
}
