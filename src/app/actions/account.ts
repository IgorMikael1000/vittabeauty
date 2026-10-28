"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { hasValidProfessionalName } from "@/lib/professional-validation";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
import { getPrismaClient } from "@/lib/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfessionalDetailsAction(
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

  const currentProfessional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { email: true, firebaseUid: true },
  });
  if (email !== currentProfessional.email) {
    const rawIdToken = formData.get("firebaseIdToken");
    if (typeof rawIdToken !== "string" || !currentProfessional.firebaseUid) {
      return {
        error: "Reautentique sua conta Firebase antes de trocar o e-mail.",
      };
    }

    const identity = await verifyFirebaseIdToken(rawIdToken);
    if (
      !identity ||
      identity.uid !== currentProfessional.firebaseUid ||
      identity.email !== email
    ) {
      return {
        error: "O novo e-mail ainda não está atualizado na conta Firebase.",
      };
    }
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
  return duplicate
    ? { error: "Este e-mail já está sendo usado por outra conta." }
    : { success: "E-mail disponível." };
}
