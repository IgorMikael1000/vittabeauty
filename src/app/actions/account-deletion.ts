"use server";

import { v2 as cloudinary } from "cloudinary";
import { revalidatePath } from "next/cache";
import { clearFirebaseSession, getFirebaseSession } from "@/lib/firebase-session";
import { getCpfDigits } from "@/lib/professional-validation";
import { logAuthEvent } from "@/lib/auth-logger";
import { getPrismaClient } from "@/lib/prisma";
import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

type DeleteAccountResult = {
  error?: string;
  cleanupPending?: boolean;
  success?: string;
};

function getFirebaseErrorCode(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message.split(" ")[0].slice(0, 80);
  }
  return null;
}

async function deleteFirebaseUser(idToken: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY_NOT_CONFIGURED");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );
  if (response.ok) return;

  const responseBody: unknown = await response.json().catch(() => null);
  const errorCode = getFirebaseErrorCode(responseBody);
  if (errorCode === "USER_NOT_FOUND") return;

  logAuthEvent("account.deletion_firebase_failed", {
    outcome: "failed",
    code: errorCode ?? `HTTP_${response.status}`,
  });
  if (
    errorCode === "CREDENTIAL_TOO_OLD_LOGIN_AGAIN" ||
    errorCode === "TOKEN_EXPIRED"
  ) {
    throw new Error("FIREBASE_RECENT_LOGIN_REQUIRED");
  }
  throw new Error("FIREBASE_ACCOUNT_DELETION_FAILED");
}

async function deleteCloudinaryProfileImage(
  professionalId: string,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl) return;

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return;
  }
  if (url.hostname !== "res.cloudinary.com") return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_CREDENTIALS_NOT_CONFIGURED");
  }
  if (url.pathname.split("/")[1] !== cloudName) {
    throw new Error("CLOUDINARY_PROFILE_IMAGE_CLOUD_MISMATCH");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  const result = await cloudinary.uploader.destroy(
    `profile-images/${professionalId}`,
    { resource_type: "image", invalidate: true },
  );
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("CLOUDINARY_PROFILE_IMAGE_DELETION_FAILED");
  }
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
    return { success: "Conta excluída." };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !professional.deletionPendingAt &&
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

  if (!professional.deletionPendingAt) {
    try {
      await prisma.professional.update({
        where: { id: professional.id },
        data: { deletionPendingAt: new Date() },
      });
    } catch (error) {
      logAuthEvent("account.deletion_failed", {
        outcome: "failed",
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
      return {
        error:
          "Não foi possível iniciar a exclusão com segurança. Seus dados continuam preservados.",
      };
    }
  }

  try {
    await deleteFirebaseUser(idToken);
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "";
    const recentLoginRequired =
      errorCode === "FIREBASE_RECENT_LOGIN_REQUIRED";
    if (recentLoginRequired) {
      try {
        await prisma.professional.updateMany({
          where: {
            id: professional.id,
            deletionPendingAt: { not: null },
          },
          data: { deletionPendingAt: null },
        });
      } catch (rollbackError) {
        logAuthEvent("account.deletion_pending_reset_failed", {
          outcome: "failed",
          code:
            rollbackError instanceof Error
              ? rollbackError.name
              : "UNKNOWN_ERROR",
        });
        return {
          error:
            "A solicitação está pendente. Entre em contato com o suporte para concluir a exclusão.",
          cleanupPending: true,
        };
      }
    }
    logAuthEvent("account.deletion_failed", {
      outcome: "failed",
      code: recentLoginRequired
        ? "RECENT_LOGIN_REQUIRED"
        : errorCode
          ? errorCode.slice(0, 80)
          : "UNKNOWN_ERROR",
    });
    return {
      error: recentLoginRequired
        ? "Sua confirmação expirou. Confirme sua identidade novamente."
        : "A exclusão foi iniciada, mas ainda não pôde ser concluída. Tente novamente nesta tela.",
      ...(recentLoginRequired ? {} : { cleanupPending: true }),
    };
  }

  try {
    await deleteCloudinaryProfileImage(professional.id, professional.logoUrl);
  } catch (error) {
    logAuthEvent("account.deletion_cloudinary_failed", {
      outcome: "failed",
      code: error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN_ERROR",
    });
    return {
      error:
        "A exclusão está pendente porque não foi possível remover a foto de perfil. Tente novamente nesta tela.",
      cleanupPending: true,
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.adminAuditLog.deleteMany({
        where: { actorProfessionalId: professional.id },
      });
      await transaction.transaction.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.appointment.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.client.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.service.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.workingHours.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.calendarBlock.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.subscriptionPayment.deleteMany({
        where: { professionalId: professional.id },
      });
      await transaction.professional.deleteMany({
        where: { id: professional.id },
      });
    });
  } catch (error) {
    logAuthEvent("account.deletion_database_failed", {
      outcome: "failed",
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      error:
        "A autenticação foi removida, mas a exclusão dos dados está pendente. Tente novamente nesta tela para concluir.",
      cleanupPending: true,
    };
  }

  await clearFirebaseSession();
  revalidatePath("/", "layout");
  logAuthEvent("account.deleted", { outcome: "success" });
  return { success: "Conta excluída." };
}
