"use server";

import { compare, hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import {
  getPasswordRequirements,
  hasValidProfessionalName,
} from "@/lib/professional-validation";
import { getPrismaClient } from "@/lib/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfessionalDetailsAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const nameValue = formData.get("name");
  const emailValue = formData.get("email");
  const phoneValue = formData.get("phone");
  const specialtyValue = formData.get("specialty");

  if (
    typeof nameValue !== "string" ||
    typeof emailValue !== "string" ||
    typeof phoneValue !== "string" ||
    typeof specialtyValue !== "string"
  ) {
    return { error: "Revise os dados informados." };
  }

  const name = nameValue.trim().replace(/\s+/g, " ");
  const email = emailValue.trim().toLowerCase();
  const phone = phoneValue.replace(/\D/g, "");
  const specialty = specialtyValue.trim();

  if (
    name.length < 2 ||
    name.length > 80 ||
    !hasValidProfessionalName(name)
  ) {
    return { error: "Informe o nome profissional com pelo menos duas palavras." };
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  if (phone.length < 10 || phone.length > 11) {
    return { error: "Informe um telefone com DDD e 10 ou 11 dígitos." };
  }

  if (specialty.length < 2 || specialty.length > 80) {
    return { error: "A especialidade deve ter entre 2 e 80 caracteres." };
  }

  const prisma = getPrismaClient();
  const duplicateEmail = await prisma.professional.findFirst({
    where: { email, id: { not: professionalId } },
    select: { id: true },
  });

  if (duplicateEmail) {
    return { error: "Este e-mail já está sendo usado por outra conta." };
  }

  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { name, email, phone, specialty },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Este e-mail já está sendo usado por outra conta." };
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/conta");
  revalidatePath("/dashboard/conta/dados");
  return { success: "Seus dados foram atualizados." };
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

export async function verifyCurrentPasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const password = formData.get("currentPassword");

  if (typeof password !== "string" || !password) {
    return { error: "Informe sua senha atual." };
  }

  if (new TextEncoder().encode(password).length > 72) {
    return { error: "Senha atual incorreta." };
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: { passwordHash: true },
  });

  if (!professional || !(await compare(password, professional.passwordHash))) {
    return { error: "A senha atual está incorreta." };
  }

  return { success: "Senha atual confirmada." };
}

export async function updatePasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { error: "Preencha os campos de senha." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não corresponde à nova senha." };
  }

  if (newPassword === currentPassword) {
    return { error: "Escolha uma senha diferente da senha atual." };
  }

  if (
    new TextEncoder().encode(currentPassword).length > 72 ||
    new TextEncoder().encode(newPassword).length > 72
  ) {
    return { error: "A senha deve ter no máximo 72 bytes." };
  }

  if (getPasswordRequirements(newPassword).some((requirement) => !requirement.met)) {
    return { error: "A nova senha não cumpre todos os requisitos de segurança." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { passwordHash: true },
  });

  if (
    !professional ||
    !(await compare(currentPassword, professional.passwordHash))
  ) {
    return {
      error: "Não foi possível confirmar a senha atual. Verifique novamente.",
    };
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.professional.update({
    where: { id: professionalId },
    data: { passwordHash },
  });

  revalidatePath("/dashboard/conta/seguranca");
  return { success: "Senha atualizada com segurança." };
}
