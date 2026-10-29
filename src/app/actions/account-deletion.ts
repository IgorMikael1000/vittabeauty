"use server";

import { revalidatePath } from "next/cache";
import { clearFirebaseSession, getFirebaseSession } from "@/lib/firebase-session";
import { getCpfDigits } from "@/lib/professional-validation";
import {
  getAccountDeletionErrorDetails,
  logAccountDeletionEvent,
} from "@/lib/account-deletion-logger";
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
  logAccountDeletionEvent("request.started", { outcome: "started" });

  let session;
  try {
    session = await getFirebaseSession();
  } catch (error) {
    logAccountDeletionEvent("request.failed", {
      outcome: "failed",
      stage: "session_lookup",
      ...getAccountDeletionErrorDetails(error),
    });
    return { error: "Não foi possível validar sua sessão. Tente novamente." };
  }

  if (!session) {
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "SESSION_MISSING",
      stage: "session_lookup",
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
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "INVALID_INPUT",
      stage: "input_validation",
    });
    return { error: "Confirme o e-mail e o CPF cadastrados." };
  }

  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    logAccountDeletionEvent("request.failed", {
      outcome: "failed",
      stage: "firebase_identity_verification",
      ...getAccountDeletionErrorDetails(error),
    });
    return {
      error: "Não foi possível confirmar sua identidade. Tente novamente.",
    };
  }

  if (!identity || identity.uid !== session.uid) {
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "FIREBASE_IDENTITY_MISMATCH",
      stage: "firebase_identity_verification",
    });
    return { error: "Não foi possível confirmar sua identidade. Entre novamente." };
  }

  let prisma: ReturnType<typeof getPrismaClient>;
  try {
    prisma = getPrismaClient();
  } catch (error) {
    logAccountDeletionEvent("request.failed", {
      outcome: "failed",
      stage: "database_client_initialization",
      ...getAccountDeletionErrorDetails(error),
    });
    return { error: "Não foi possível acessar os dados da conta. Tente novamente." };
  }

  let professional;
  try {
    professional = await prisma.professional.findUnique({
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
  } catch (error) {
    logAccountDeletionEvent("request.failed", {
      outcome: "failed",
      stage: "professional_lookup",
      ...getAccountDeletionErrorDetails(error),
    });
    return { error: "Não foi possível localizar sua conta. Tente novamente." };
  }

  if (!professional) {
    logAccountDeletionEvent("request.already_deleted", {
      outcome: "success",
      code: "ALREADY_DELETED",
      stage: "professional_lookup",
    });
    try {
      await clearFirebaseSession();
    } catch (error) {
      logAccountDeletionEvent("session_cleanup.failed", {
        outcome: "failed",
        stage: "session_cleanup",
        ...getAccountDeletionErrorDetails(error),
      });
    }
    return { success: "Sua conta já foi excluída." };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !professional.deletionPendingAt &&
    !professional.deletionRequestedAt &&
    (identity.authTime > nowSeconds + 30 ||
      nowSeconds - identity.authTime > 5 * 60)
  ) {
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "RECENT_LOGIN_REQUIRED",
      stage: "recent_authentication_check",
    });
    return {
      error: "Confirme sua identidade novamente para excluir a conta.",
    };
  }

  if (!professional.cpf) {
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "PROFILE_CPF_MISSING",
      stage: "confirmation_validation",
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
    logAccountDeletionEvent("request.rejected", {
      outcome: "rejected",
      code: "CONFIRMATION_MISMATCH",
      stage: "confirmation_validation",
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
    logAccountDeletionEvent("request.failed", {
      outcome: "failed",
      stage: "job_persistence",
      correlationId: professional.id,
      ...getAccountDeletionErrorDetails(error),
    });
    return {
      error:
        "Não foi possível registrar a solicitação com segurança. Seus dados continuam preservados.",
    };
  }

  logAccountDeletionEvent("request.queued", {
    outcome: "success",
    stage: "job_persistence",
    correlationId: jobId,
  });

  let deletionCompleted = false;
  try {
    const result = await processAccountDeletionJob(jobId);
    deletionCompleted = result === "completed";
    logAccountDeletionEvent("request.processing_finished", {
      outcome: deletionCompleted ? "success" : "failed",
      stage: "immediate_deletion",
      correlationId: jobId,
      code: result === "already_processing" ? "JOB_ALREADY_PROCESSING" : undefined,
    });
  } catch (error) {
    logAccountDeletionEvent("request.processing_failed", {
      outcome: "failed",
      stage: "immediate_deletion",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
  }

  try {
    await clearFirebaseSession();
  } catch (error) {
    logAccountDeletionEvent("session_cleanup.failed", {
      outcome: "failed",
      stage: "session_cleanup",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
  }
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    logAccountDeletionEvent("cache_revalidation.failed", {
      outcome: "failed",
      stage: "cache_revalidation",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
  }
  return deletionCompleted
    ? { success: "Sua conta foi excluída com sucesso." }
    : {
        success:
          "Não foi possível concluir a exclusão agora. Sua solicitação ficará pendente e será tentada novamente automaticamente.",
        pending: true,
      };
}
