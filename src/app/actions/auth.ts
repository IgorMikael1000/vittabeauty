"use server";

import { Prisma } from "@/generated/prisma/client";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import {
  getCpfDigits,
  getPasswordRequirements,
  hasValidProfessionalName,
  isValidCpf,
} from "@/lib/professional-validation";

export type FormState = {
  error?: string;
  success?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Informe seu e-mail e sua senha." };
  }

  if (
    email.length > 254 ||
    new TextEncoder().encode(password).length > 72
  ) {
    return { error: "E-mail ou senha inválidos." };
  }

  try {
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }

    throw error;
  }

  return {};
}

export async function registerAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = formData.get("name");
  const emailInput = formData.get("email");
  const password = formData.get("password");
  const cpfInput = formData.get("cpf");
  const phoneInput = formData.get("phone");
  const specialtyInput = formData.get("specialty");

  if (
    typeof name !== "string" ||
    typeof emailInput !== "string" ||
    typeof password !== "string" ||
    typeof cpfInput !== "string" ||
    typeof phoneInput !== "string" ||
    typeof specialtyInput !== "string"
  ) {
    return { error: "Preencha todos os campos." };
  }

  const normalizedName = name.trim();
  const email = emailInput.trim().toLowerCase();
  const cpf = getCpfDigits(cpfInput);
  const phone = phoneInput.replace(/\D/g, "");
  const specialty = specialtyInput.trim();
  const passwordBytes = new TextEncoder().encode(password).length;

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return { error: "O nome deve ter entre 2 e 80 caracteres." };
  }

  if (!hasValidProfessionalName(normalizedName)) {
    return { error: "Informe seu nome e sobrenome." };
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

  const unmetPasswordRequirements = getPasswordRequirements(password).filter(
    (requirement) => !requirement.met,
  );
  if (unmetPasswordRequirements.length > 0 || passwordBytes > 72) {
    return {
      error:
        passwordBytes > 72
          ? "A senha deve ter no máximo 72 bytes."
          : "A senha precisa cumprir todos os requisitos exibidos.",
    };
  }

  const prisma = getPrismaClient();
  const existingProfessional = await prisma.professional.findFirst({
    where: { OR: [{ email }, { cpf }] },
    select: { id: true },
  });

  if (existingProfessional) {
    const [existingEmail, existingCpf] = await Promise.all([
      prisma.professional.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.professional.findUnique({
        where: { cpf },
        select: { id: true },
      }),
    ]);

    return {
      error: existingCpf
        ? "Este CPF já está cadastrado."
        : existingEmail
          ? "Este e-mail já está cadastrado."
          : "Já existe um cadastro com estes dados.",
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
  const passwordHash = await hash(password, 12);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

    try {
      await prisma.professional.create({
        data: {
          name: normalizedName,
          email,
          cpf,
          phone,
          specialty,
          passwordHash,
          slug,
        },
      });

      redirect(`/login?registered=1&email=${encodeURIComponent(email)}`);
    } catch (error) {
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
          return { error: "Este CPF já está cadastrado." };
        }
        if (duplicateEmail) {
          return { error: "Este e-mail já está cadastrado." };
        }

        continue;
      }

      throw error;
    }
  }

  return { error: "Não foi possível gerar um link exclusivo. Tente novamente." };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
