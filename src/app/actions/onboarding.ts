"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export async function completeWelcomeTourAction(
  previousState: FormState,
): Promise<FormState> {
  void previousState;
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const result = await getPrismaClient().professional.updateMany({
    where: { id: professionalId, hasSeenWelcome: false },
    data: { hasSeenWelcome: true },
  });

  if (result.count === 0) {
    const professional = await getPrismaClient().professional.findUnique({
      where: { id: professionalId },
      select: { id: true },
    });
    if (!professional) {
      return { error: "Não foi possível localizar sua conta. Entre novamente." };
    }
  }

  revalidatePath("/dashboard");
  return { success: "Boas-vindas concluídas." };
}
