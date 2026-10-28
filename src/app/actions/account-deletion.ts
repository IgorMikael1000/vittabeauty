"use server";

import { MercadoPagoConfig, PreApproval } from "mercadopago";
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

async function cancelSubscription(subscriptionId: string): Promise<void> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN_NOT_CONFIGURED");
  }

  const client = new PreApproval(new MercadoPagoConfig({ accessToken }));
  const subscription = await client.get({ id: subscriptionId });
  if (subscription.status === "cancelled" || subscription.status === "canceled") {
    return;
  }

  const updated = await client.update({
    id: subscriptionId,
    body: { status: "cancelled" },
  });
  if (updated.status !== "cancelled" && updated.status !== "canceled") {
    throw new Error("MERCADO_PAGO_CANCELLATION_NOT_CONFIRMED");
  }
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

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (identity.authTime > nowSeconds + 30 || nowSeconds - identity.authTime > 5 * 60) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "RECENT_LOGIN_REQUIRED",
    });
    return {
      error: "Confirme sua identidade novamente para excluir a conta.",
    };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { firebaseUid: session.uid },
    select: {
      id: true,
      email: true,
      cpf: true,
      mpSubscriptionId: true,
    },
  });
  if (!professional) {
    logAuthEvent("account.deletion_rejected", {
      outcome: "rejected",
      code: "PROFILE_NOT_FOUND",
    });
    return { error: "Não encontramos o perfil vinculado à sua sessão." };
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

  if (professional.mpSubscriptionId) {
    try {
      await cancelSubscription(professional.mpSubscriptionId);
      logAuthEvent("account.deletion_subscription_cancelled", {
        outcome: "success",
      });
    } catch (error) {
      logAuthEvent("account.deletion_subscription_cancellation_failed", {
        outcome: "failed",
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
      return {
        error:
          "Não foi possível cancelar sua assinatura no Mercado Pago. Seus dados não foram excluídos; entre em contato com o suporte.",
      };
    }
  }

  try {
    await deleteFirebaseUser(idToken);
  } catch (error) {
    const recentLoginRequired =
      error instanceof Error &&
      error.message === "FIREBASE_RECENT_LOGIN_REQUIRED";
    logAuthEvent("account.deletion_failed", {
      outcome: "failed",
      code: recentLoginRequired
        ? "RECENT_LOGIN_REQUIRED"
        : error instanceof Error
          ? error.message.slice(0, 80)
          : "UNKNOWN_ERROR",
    });
    return {
      error: recentLoginRequired
        ? "Sua confirmação expirou. Confirme sua identidade novamente."
        : "Não foi possível excluir a autenticação Firebase. Seus dados continuam preservados.",
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
      await transaction.professional.delete({
        where: { id: professional.id },
      });
    });
  } catch (error) {
    await clearFirebaseSession();
    logAuthEvent("account.deletion_database_failed", {
      outcome: "failed",
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      error:
        "A autenticação foi removida, mas não conseguimos concluir a exclusão dos dados. Entre em contato com o suporte para finalizar a solicitação.",
      cleanupPending: true,
    };
  }

  await clearFirebaseSession();
  revalidatePath("/", "layout");
  logAuthEvent("account.deleted", { outcome: "success" });
  return { success: "Conta excluída." };
}
