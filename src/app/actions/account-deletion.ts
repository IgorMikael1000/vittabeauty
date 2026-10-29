"use server";

import { revalidatePath } from "next/cache";
import { clearFirebaseSession, getFirebaseSession } from "@/lib/firebase-session";
import { getCpfDigits } from "@/lib/professional-validation";
import { logAuthEvent } from "@/lib/auth-logger";
import { processAccountDeletionJob } from "@/lib/account-deletion-worker";
import { getPrismaClient } from "@/lib/prisma";
import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

type DeleteAccountResult = {
  error?: string;
  pending?: boolean;
  success?: string;
};

function getCloudinaryPublicId(
  professionalId: string,
  imageUrl: string | null,
): string | null {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    if (url.hostname === "res.cloudinary.com") {
      return `profile-images/${professionalId}`;
    }
  } catch {
    return null;
  }

  return null;
}

export async function deleteProfessionalAccountAction(
  emailInput: string,
  cpfInput: string,
  idToken: string,
): Promise<DeleteAccountResult> {
  const session = await getFirebaseSession();
  if (!session) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "SESSION_MISSING",
    });
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  if (
    typeof emailInput !== "string" ||
    emailInput.length > 254 ||
    typeof cpfInput !== "string" ||
    cpfInput.length > 32 ||
    typeof idToken !== "string" ||
    idToken.length > 10_000
  ) {
    return { error: "Confirme o e-mail e o CPF cadastrados." };
  }

  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity || identity.uid !== session.uid) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "FIREBASE_IDENTITY_MISMATCH",
    });
    return { error: "Não foi possível confirmar sua identidade. Entre novamente." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { firebaseUid: session.uid },
    select: {
      id: true,
      email: true,
      cpf: true,
      deletionRequestedAt: true,
      deletionPendingAt: true,
      logoUrl: true,
    },
  });
  if (!professional) {
    logAuthEvent("account.deleted", {
      outcome: "success",
      code: "ALREADY_DELETED",
    });
    await clearFirebaseSession();
    return { success: "Sua conta já foi excluída." };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !professional.deletionPendingAt &&
    !professional.deletionRequestedAt &&
    (identity.authTime > nowSeconds + 30 ||
      nowSeconds - identity.authTime > 5 * 60)
  ) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "RECENT_LOGIN_REQUIRED",
    });
    return {
      error: "Confirme sua identidade novamente para excluir a conta.",
    };
  }

  if (!professional.cpf) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "PROFILE_CPF_MISSING",
    });
    return {
      error:
        "Não há um CPF cadastrado para validar esta solicitação. Entre em contato com o suporte.",
    };
  }

  if (
    emailInput.trim().toLowerCase() !== professional.email.toLowerCase() ||
    getCpfDigits(cpfInput) !== getCpfDigits(professional.cpf)
  ) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "CONFIRMATION_MISMATCH",
    });
    return { error: "O e-mail ou CPF informado não corresponde ao cadastro." };
  }

  const cloudinaryPublicId = getCloudinaryPublicId(
    professional.id,
    professional.logoUrl,
  );
  const requestedAt = new Date();
  let jobId: string;

  try {
    jobId = await prisma.$transaction(async (transaction) => {
      await transaction.professional.updateMany({
        where: {
          id: professional.id,
          deletionRequestedAt: null,
        },
        data: { deletionRequestedAt: requestedAt },
      });

      const existingJob = await transaction.accountDeletionJob.findUnique({
        where: { professionalId: professional.id },
        select: { id: true },
      });
      if (existingJob) return existingJob.id;

      const job = await transaction.accountDeletionJob.create({
        data: {
          professionalId: professional.id,
          firebaseUid: session.uid,
          cloudinaryPublicId,
        },
        select: { id: true },
      });
      return job.id;
    });
  } catch (error) {
    logAuthEvent("account.deletion_request_failed", {
      outcome: "failed",
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      error:
        "Não foi possível registrar a solicitação com segurança. Seus dados continuam preservados.",
    };
  }

  logAuthEvent("account.deletion_requested", {
    outcome: "started",
    correlationId: jobId,
  });

  let deletionCompleted = false;
  try {
    deletionCompleted =
      (await processAccountDeletionJob(jobId)) === "completed";
  } catch {
    deletionCompleted = false;
  }

  await clearFirebaseSession();
  revalidatePath("/", "layout");

  if (!deletionCompleted) {
    return {
      success:
        "Não foi possível concluir a exclusão agora. Sua solicitação ficará pendente e será tentada novamente automaticamente.",
      pending: true,
    };
  }

  return { success: "Sua conta foi excluída com sucesso." };
}
