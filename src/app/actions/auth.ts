"use server";

import { Prisma } from "@/generated/prisma/client";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

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

  if (
    typeof name !== "string" ||
    typeof emailInput !== "string" ||
    typeof password !== "string"
  ) {
    return { error: "Preencha todos os campos." };
  }

  const normalizedName = name.trim();
  const email = emailInput.trim().toLowerCase();
  const passwordBytes = new TextEncoder().encode(password).length;

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return { error: "O nome deve ter entre 2 e 80 caracteres." };
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  if (password.length < 8 || passwordBytes > 72) {
    return { error: "A senha deve ter ao menos 8 caracteres e até 72 bytes." };
  }

  const prisma = getPrismaClient();
  const existingProfessional = await prisma.professional.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingProfessional) {
    return { error: "Este e-mail já está cadastrado." };
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
          passwordHash,
          slug,
        },
      });

      redirect("/login?registered=1");
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicateEmail = await prisma.professional.findUnique({
          where: { email },
          select: { id: true },
        });

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
