"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { hasValidProfessionalName } from "@/lib/professional-validation";
import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";
import {
  createFirebaseSession,
  getFirebaseSession,
} from "@/lib/firebase-session";
import { logAuthEvent } from "@/lib/auth-logger";
import { getPrismaClient } from "@/lib/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfessionalDetailsAction(
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const nameValue = formData.get("name");
  const phoneValue = formData.get("phone");
  const specialtyValue = formData.get("specialty");

  if (
    typeof nameValue !== "string" ||
    typeof phoneValue !== "string" ||
    typeof specialtyValue !== "string"
  ) {
    return { error: "Revise os dados informados." };
  }
  const name = nameValue.trim().replace(/\s+/g, " ");
  const phone = phoneValue.replace(/\D/g, "");
  const specialty = specialtyValue.trim();

  if (
    name.length < 2 ||
    name.length > 80 ||
    !hasValidProfessionalName(name)
  ) {
    return { error: "Informe o nome profissional com pelo menos duas palavras." };
  }

  if (phone.length < 10 || phone.length > 11) {
    return { error: "Informe um telefone com DDD e 10 ou 11 dígitos." };
  }

  if (specialty.length < 2 || specialty.length > 80) {
    return { error: "A especialidade deve ter entre 2 e 80 caracteres." };
  }

  const prisma = getPrismaClient();
  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { name, phone, specialty },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Os dados informados já estão sendo usados por outra conta.",
      };
    }

    logAuthEvent("profile.details_update_failed", {
      outcome: "failed",
      code:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? `PRISMA_${error.code}`
          : error instanceof Error
            ? error.name
            : "UNKNOWN_ERROR",
    });
    return { error: "Não foi possível salvar os dados profissionais." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/conta");
  revalidatePath("/dashboard/conta/dados");
  logAuthEvent("profile.details_updated", { outcome: "success" });
  return { success: "Seus dados foram atualizados." };
}

export async function syncProfessionalEmailFromFirebaseAction(
  idToken: string,
): Promise<FormState> {
  const session = await getFirebaseSession();
  if (!session) {
    logAuthEvent("account.email_sync_rejected", {
      outcome: "rejected",
      code: "SESSION_MISSING",
    });
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity || identity.uid !== session.uid || !identity.emailVerified) {
    logAuthEvent("account.email_sync_rejected", {
      outcome: "rejected",
      code: "FIREBASE_IDENTITY_MISMATCH_OR_UNVERIFIED",
    });
    return {
      error: "Não foi possível confirmar o novo e-mail nesta sessão.",
    };
  }

  if (
    identity.providers.includes("google.com") ||
    !identity.providers.includes("password")
  ) {
    logAuthEvent("account.email_sync_rejected", {
      outcome: "rejected",
      provider: identity.providers[0],
      code: "PROVIDER_NOT_ALLOWED",
    });
    return { error: "Esta conta não pode alterar o e-mail pelo Vitta Beauty." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { firebaseUid: identity.uid },
    select: { id: true, email: true },
  });
  if (!professional) {
    logAuthEvent("account.email_sync_rejected", {
      outcome: "rejected",
      code: "PROFILE_NOT_FOUND",
    });
    return { error: "Não encontramos o perfil profissional desta conta." };
  }

  if (professional.email !== identity.email) {
    const duplicate = await prisma.professional.findFirst({
      where: { email: identity.email, id: { not: professional.id } },
      select: { id: true },
    });
    if (duplicate) {
      logAuthEvent("account.email_sync_rejected", {
        outcome: "rejected",
        code: "EMAIL_ALREADY_IN_USE",
      });
      return { error: "Este e-mail já está sendo usado por outra conta." };
    }

    try {
      await prisma.professional.update({
        where: { id: professional.id },
        data: { email: identity.email },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        logAuthEvent("account.email_sync_rejected", {
          outcome: "rejected",
          code: "PRISMA_P2002",
        });
        return { error: "Este e-mail já está sendo usado por outra conta." };
      }
      logAuthEvent("account.email_sync_failed", {
        outcome: "failed",
        code:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? `PRISMA_${error.code}`
            : error instanceof Error
              ? error.name
              : "UNKNOWN_ERROR",
      });
      return { error: "Não foi possível atualizar o e-mail no perfil." };
    }
  }

  try {
    await createFirebaseSession(idToken);
  } catch (error) {
    logAuthEvent("account.email_sync_session_refresh_failed", {
      outcome: "failed",
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      error:
        "E-mail atualizado, mas não foi possível renovar a sessão. Entre novamente.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/conta");
  revalidatePath("/dashboard/conta/dados");
  logAuthEvent("account.email_updated", {
    outcome: "success",
    provider: "password",
  });
  return { success: "E-mail atualizado e confirmado." };
}

export async function recordFirebasePasswordChangeAction(
  idToken: string,
): Promise<FormState> {
  const session = await getFirebaseSession();
  const identity = await verifyFirebaseIdToken(idToken);
  if (
    !session ||
    !identity ||
    identity.uid !== session.uid ||
    !identity.providers.includes("password") ||
    identity.providers.includes("google.com")
  ) {
    logAuthEvent("account.password_change_rejected", {
      outcome: "rejected",
      code: "SESSION_OR_PROVIDER_MISMATCH",
    });
    return { error: "Não foi possível confirmar a alteração da senha." };
  }

  logAuthEvent("account.password_updated", {
    outcome: "success",
    provider: "password",
  });
  return { success: "Alteração registrada." };
}

export async function updateProfileImageAction(
  logoUrl: string,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();

  if (
    typeof logoUrl !== "string" ||
    new TextEncoder().encode(logoUrl).byteLength > 50 * 1024
  ) {
    return { error: "A imagem deve ter no máximo 50 KB." };
  }

  const imageMatch = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    logoUrl,
  );

  if (!imageMatch) {
    return { error: "Envie uma imagem WebP válida." };
  }

  const imageBytes = Buffer.from(imageMatch[1], "base64");
  if (
    imageBytes.length < 12 ||
    imageBytes.toString("base64") !== imageMatch[1] ||
    imageBytes.toString("ascii", 0, 4) !== "RIFF" ||
    imageBytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return { error: "Envie uma imagem WebP válida." };
  }

  await getPrismaClient().professional.update({
    where: { id: professionalId },
    data: { logoUrl },
  });

  revalidatePath("/dashboard/conta");
  return { success: "Foto de perfil atualizada." };
}

export async function checkProfessionalEmailAction(
  email: string,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
    return { error: "Informe um e-mail válido." };
  }

  const duplicate = await getPrismaClient().professional.findFirst({
    where: { email: normalizedEmail, id: { not: professionalId } },
    select: { id: true },
  });
  logAuthEvent("account.email_availability_checked", {
    outcome: duplicate ? "rejected" : "success",
    code: duplicate ? "EMAIL_ALREADY_IN_USE" : undefined,
  });
  return duplicate
    ? { error: "Este e-mail já está sendo usado por outra conta." }
    : { success: "E-mail disponível." };
}
