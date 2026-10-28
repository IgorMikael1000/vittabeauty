"use server";

import { Prisma } from "@/generated/prisma/client";
import { compare } from "bcryptjs";
import { getCpfDigits, hasValidProfessionalName, isValidCpf } from "@/lib/professional-validation";
import {
  verifyFirebaseIdToken,
  verifyFirebaseIdTokenWithDiagnostics,
} from "@/lib/verify-firebase-token";
import { logAuthEvent } from "@/lib/auth-logger";
import {
  clearFirebaseSession,
  createFirebaseSession,
} from "@/lib/firebase-session";
import { getPrismaClient } from "@/lib/prisma";

export type FormState = {
  error?: string;
  success?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSafeErrorCode(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    typeof error.code === "string"
  ) {
    return `PRISMA_${error.code}`;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code.slice(0, 80);
  }
  if (error instanceof Error) return error.name.slice(0, 80);
  return "UNKNOWN_ERROR";
}

async function createSessionResult(
  idToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await createFirebaseSession(idToken);
    return { success: true };
  } catch (error) {
    logAuthEvent("session.create_failed", {
      outcome: "failed",
      code: getSafeErrorCode(error),
    });
    return {
      success: false,
      error: "Não foi possível iniciar a sessão. Tente novamente.",
    };
  }
}

export async function loginWithFirebaseAction(
  idToken: string,
): Promise<{
  registrationRequired?: boolean;
  email?: string;
  googleRegistration?: boolean;
  success?: boolean;
  error?: string;
}> {
  logAuthEvent("login.started", { outcome: "started" });
  let tokenValidation;
  try {
    tokenValidation = await verifyFirebaseIdTokenWithDiagnostics(idToken);
  } catch (error) {
    logAuthEvent("login.token_verification_failed", {
      outcome: "failed",
      code: getSafeErrorCode(error),
    });
    return {
      error: "Não foi possível validar sua conta agora. Tente novamente.",
    };
  }

  const identity = tokenValidation.identity;
  if (!identity) {
    logAuthEvent("login.token_rejected", {
      outcome: "rejected",
      code: tokenValidation.diagnostic ?? "TOKEN_VALIDATION_FAILED",
    });
    return {
      error: "Não foi possível validar sua conta. Tente novamente.",
    };
  }

  const usesGoogleProvider = identity.providers.includes("google.com");
  const provider = usesGoogleProvider ? "google.com" : identity.providers[0];
  if (!identity.emailVerified && !usesGoogleProvider) {
    logAuthEvent("login.email_not_verified", {
      outcome: "rejected",
      provider,
    });
    return {
      error: "Confirme seu e-mail antes de entrar no Vitta Beauty.",
    };
  }

  try {
    const prisma = getPrismaClient();
    let professional = await prisma.professional.findUnique({
      where: { firebaseUid: identity.uid },
      select: { id: true, email: true, firebaseUid: true },
    });

    if (professional && professional.email !== identity.email) {
      const duplicateEmail = await prisma.professional.findUnique({
        where: { email: identity.email },
        select: { id: true },
      });
      if (duplicateEmail && duplicateEmail.id !== professional.id) {
        return {
          error: "Este e-mail já está vinculado a outra conta.",
        };
      }

      try {
        professional = await prisma.professional.update({
          where: { id: professional.id },
          data: { email: identity.email },
          select: { id: true, email: true, firebaseUid: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return {
            error: "Este e-mail já está vinculado a outra conta.",
          };
        }
        throw error;
      }
    }

    if (!professional) {
      professional = await prisma.professional.findUnique({
        where: { email: identity.email },
        select: { id: true, email: true, firebaseUid: true },
      });
    }

    if (!professional) {
      logAuthEvent("login.registration_required", {
        outcome: "success",
        provider,
      });
      return {
        registrationRequired: true,
        email: identity.email,
        googleRegistration: identity.providers.includes("google.com"),
      };
    }

    if (professional.firebaseUid && professional.firebaseUid !== identity.uid) {
      return {
        error: "Este e-mail já está vinculado a outra conta Firebase.",
      };
    }

    if (!professional.firebaseUid) {
      await prisma.professional.update({
        where: { id: professional.id },
        data: { firebaseUid: identity.uid, passwordHash: null },
      });
    } else {
      await prisma.professional.updateMany({
        where: { id: professional.id, firebaseUid: identity.uid },
        data: { passwordHash: null },
      });
    }

    if (usesGoogleProvider && identity.photoUrl) {
      await prisma.professional.updateMany({
        where: { id: professional.id, logoUrl: null },
        data: { logoUrl: identity.photoUrl },
      });
    }

    const result = await createSessionResult(idToken);
    logAuthEvent(
      result.success ? "login.completed" : "login.session_creation_failed",
      {
        outcome: result.success ? "success" : "failed",
        provider,
        ...(!result.success
          ? { code: "SESSION_CREATION_FAILED" }
          : {}),
      },
    );
    return result;
  } catch (error) {
    logAuthEvent("login.database_failed", {
      outcome: "failed",
      provider,
      code: getSafeErrorCode(error),
    });
    return {
      error: "Não foi possível consultar seu cadastro. Tente novamente.",
    };
  }
}

export async function registerAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  logAuthEvent("registration.started", { outcome: "started" });
  const nameInput = formData.get("name");
  const emailInput = formData.get("email");
  const cpfInput = formData.get("cpf");
  const phoneInput = formData.get("phone");
  const specialtyInput = formData.get("specialty");
  const idToken = formData.get("firebaseIdToken");
  const method = formData.get("authMethod");

  if (
    typeof nameInput !== "string" ||
    typeof emailInput !== "string" ||
    typeof cpfInput !== "string" ||
    typeof phoneInput !== "string" ||
    typeof specialtyInput !== "string" ||
    typeof idToken !== "string" ||
    (method !== "password" && method !== "google")
  ) {
    return { error: "Preencha todos os campos e tente novamente." };
  }

  const normalizedName = nameInput.trim().replace(/\s+/g, " ");
  const email = emailInput.trim().toLowerCase();
  const cpf = getCpfDigits(cpfInput);
  const phone = phoneInput.replace(/\D/g, "");
  const specialty = specialtyInput.trim();

  if (
    normalizedName.length < 2 ||
    normalizedName.length > 80 ||
    !hasValidProfessionalName(normalizedName)
  ) {
    return { error: "Informe seu nome e sobrenome ou o nome do negócio." };
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  if (!isValidCpf(cpf)) {
    return { error: "Informe um CPF válido." };
  }
  if (phone.length < 10 || phone.length > 11) {
    return { error: "Informe um telefone com DDD e 10 ou 11 dígitos." };
  }
  if (specialty.length < 2 || specialty.length > 80) {
    return { error: "Informe sua especialidade (de 2 a 80 caracteres)." };
  }

  let tokenValidation;
  try {
    tokenValidation = await verifyFirebaseIdTokenWithDiagnostics(idToken);
  } catch (error) {
    logAuthEvent("registration.token_verification_failed", {
      outcome: "failed",
      code: getSafeErrorCode(error),
    });
    return {
      error: "Não foi possível validar sua conta. Tente novamente.",
    };
  }

  const identity = tokenValidation.identity;
  if (!identity) {
    logAuthEvent("registration.token_rejected", {
      outcome: "rejected",
      code: tokenValidation.diagnostic ?? "TOKEN_VALIDATION_FAILED",
    });
    return {
      error: "Não foi possível validar sua conta. Tente novamente.",
    };
  }

  if (
    identity.email !== email ||
    (method === "google" &&
      !identity.providers.includes("google.com")) ||
    (method === "password" && !identity.providers.includes("password"))
  ) {
    logAuthEvent("registration.identity_mismatch", {
      outcome: "rejected",
      provider: method,
    });
    return {
      error: "A autenticação Firebase não corresponde a este cadastro.",
    };
  }

  try {
    const prisma = getPrismaClient();
    const existingByUid = await prisma.professional.findUnique({
      where: { firebaseUid: identity.uid },
      select: { id: true, email: true },
    });
    if (existingByUid) {
      if (
        method !== "google" ||
        existingByUid.email !== email ||
        identity.email !== email
      ) {
        logAuthEvent("registration.firebase_uid_already_exists", {
          outcome: "rejected",
          provider: method,
        });
        return {
          error: "Esta conta Firebase já possui um cadastro.",
        };
      }
      if (identity.photoUrl) {
        await prisma.professional.updateMany({
          where: { id: existingByUid.id, logoUrl: null },
          data: { logoUrl: identity.photoUrl },
        });
      }
      const sessionResult = await createSessionResult(idToken);
      if (sessionResult.success) {
        logAuthEvent("registration.completed", {
          outcome: "success",
          provider: method,
        });
      }
      return sessionResult.success
        ? { success: "Cadastro realizado." }
        : { error: sessionResult.error };
    }

    const duplicate = await prisma.professional.findFirst({
      where: { OR: [{ email }, { cpf }, { firebaseUid: identity.uid }] },
      select: { email: true, cpf: true },
    });
    if (duplicate) {
      logAuthEvent("registration.duplicate_profile", {
        outcome: "rejected",
        provider: method,
        code: duplicate.cpf === cpf ? "CPF_EXISTS" : "EMAIL_EXISTS",
      });
      return {
        error:
          duplicate.cpf === cpf
            ? "Este CPF já está cadastrado."
            : "Este e-mail já está cadastrado.",
      };
    }

    const slugBase =
      normalizedName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "profissional";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
      try {
        await prisma.professional.create({
          data: {
            name: normalizedName,
            email,
            firebaseUid: identity.uid,
            cpf,
            phone,
            specialty,
            logoUrl: method === "google" ? identity.photoUrl : null,
            slug,
            subscriptionStatus: "TRIAL",
            planType: "FREE",
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });

        if (method === "google") {
          const sessionResult = await createSessionResult(idToken);
          if (!sessionResult.success) {
            return { error: sessionResult.error };
          }
        }

        logAuthEvent("registration.completed", {
          outcome: "success",
          provider: method,
        });
        return { success: "Cadastro realizado." };
      } catch (error) {
        logAuthEvent("registration.profile_create_failed", {
          outcome: "failed",
          provider: method,
          code: getSafeErrorCode(error),
        });
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const duplicateEmail = await prisma.professional.findUnique({
            where: { email },
            select: { id: true },
          });
          const duplicateCpf = await prisma.professional.findUnique({
            where: { cpf },
            select: { id: true },
          });
          if (duplicateCpf) {
            logAuthEvent("registration.duplicate_profile", {
              outcome: "rejected",
              provider: method,
              code: "CPF_EXISTS",
            });
            return {
              error: "Este CPF já está cadastrado.",
            };
          }
          if (duplicateEmail) {
            logAuthEvent("registration.duplicate_profile", {
              outcome: "rejected",
              provider: method,
              code: "EMAIL_EXISTS",
            });
            return {
              error: "Este e-mail já está cadastrado.",
            };
          }
          continue;
        }
        return {
          error:
            "Não foi possível salvar seu cadastro agora. Tente novamente em instantes.",
        };
      }
    }

    return {
      error: "Não foi possível gerar um link exclusivo. Tente novamente.",
    };
  } catch (error) {
    logAuthEvent("registration.database_failed", {
      outcome: "failed",
      provider: method,
      code: getSafeErrorCode(error),
    });
    return {
      error: "Não foi possível consultar ou salvar seu cadastro.",
    };
  }
}

export async function verifyLegacyCredentialsAction(
  emailInput: string,
  password: string,
): Promise<boolean> {
  const email = emailInput.trim().toLowerCase();
  if (
    !emailPattern.test(email) ||
    email.length > 254 ||
    !password ||
    new TextEncoder().encode(password).length > 72
  ) {
    return false;
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { email },
    select: { passwordHash: true, firebaseUid: true },
  });
  if (!professional?.passwordHash || professional.firebaseUid) {
    return false;
  }

  return compare(password, professional.passwordHash);
}

export async function linkLegacyFirebaseAccountAction(
  idToken: string,
): Promise<FormState> {
  const identity = await verifyFirebaseIdToken(idToken);
  if (
    !identity ||
    identity.emailVerified ||
    !identity.providers.includes("password")
  ) {
    return { error: "Não foi possível vincular a conta Firebase." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { email: identity.email },
    select: { id: true, firebaseUid: true, passwordHash: true },
  });
  if (
    !professional ||
    professional.firebaseUid ||
    !professional.passwordHash
  ) {
    return { error: "Não foi possível vincular a conta Firebase." };
  }

  try {
    await prisma.professional.update({
      where: { id: professional.id },
      data: { firebaseUid: identity.uid, passwordHash: null },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Não foi possível vincular a conta Firebase." };
    }
    throw error;
  }

  return { success: "Conta Firebase vinculada." };
}

export async function logoutAction(): Promise<void> {
  await clearFirebaseSession();
}
