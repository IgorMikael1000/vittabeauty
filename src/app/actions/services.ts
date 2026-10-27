"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import type { FormState } from "@/app/actions/auth";

export async function saveServiceAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const name = formData.get("name");
  const description = formData.get("description");
  const price = formData.get("price");
  const materialCost = formData.get("materialCost");
  const depositAmount = formData.get("depositAmount");
  const durationMinutes = formData.get("durationMinutes");
  const serviceId = formData.get("serviceId");

  if (
    typeof name !== "string" ||
    (description !== null && typeof description !== "string") ||
    typeof price !== "string" ||
    typeof materialCost !== "string" ||
    (depositAmount !== null && typeof depositAmount !== "string") ||
    typeof durationMinutes !== "string" ||
    (serviceId !== null && typeof serviceId !== "string")
  ) {
    return { error: "Revise os dados do serviço." };
  }

  const normalizedName = name.trim();
  const normalizedDescription = description?.trim() || null;
  const pricePattern = /^(?:\d{1,7})(?:[.,]\d{1,2})?$/;
  const normalizedPrice = price.replace(",", ".");
  const normalizedMaterialCost = materialCost.replace(",", ".");
  const normalizedDepositAmount =
    typeof depositAmount === "string" && depositAmount.trim()
      ? depositAmount.replace(",", ".")
      : "0";
  const parsedDuration = Number(durationMinutes);
  const isUpdate = typeof serviceId === "string" && Boolean(serviceId.trim());

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return { error: "O nome do serviço deve ter entre 2 e 100 caracteres." };
  }

  if (!pricePattern.test(price) || Number(normalizedPrice) <= 0) {
    return { error: "Informe um preço maior que zero, com até duas casas decimais." };
  }

  if (
    !/^(?:\d{1,8})(?:[.,]\d{1,2})?$/.test(materialCost) ||
    !Number.isFinite(Number(normalizedMaterialCost)) ||
    Number(normalizedMaterialCost) > 99_999_999.99
  ) {
    return {
      error: "Informe um custo de material válido, igual ou maior que zero e com até duas casas decimais.",
    };
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: { pixKey: true },
  });
  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  if (
    !/^(?:\d{1,8})(?:[.,]\d{1,2})?$/.test(normalizedDepositAmount) ||
    !Number.isFinite(Number(normalizedDepositAmount)) ||
    Number(normalizedDepositAmount) < 0 ||
    Number(normalizedDepositAmount) > Number(normalizedPrice)
  ) {
    return {
      error: "O valor do sinal deve ser igual ou maior que zero e não pode superar o preço do serviço.",
    };
  }

  if (!professional.pixKey && Number(normalizedDepositAmount) > 0) {
    return {
      error: "Cadastre sua chave PIX antes de configurar um sinal para o serviço.",
    };
  }

  if (
    !Number.isInteger(parsedDuration) ||
    parsedDuration < 5 ||
    parsedDuration > 1440
  ) {
    return { error: "A duração deve ser um número entre 5 e 1.440 minutos." };
  }

  if ((normalizedDescription?.length ?? 0) > 500) {
    return { error: "A descrição deve ter no máximo 500 caracteres." };
  }

  const data = {
    name: normalizedName,
    description: normalizedDescription,
    price: normalizedPrice,
    materialCost: normalizedMaterialCost,
    depositAmount: normalizedDepositAmount,
    durationMinutes: parsedDuration,
    onlineBookingEnabled: formData.get("onlineBookingEnabled") === "on",
    isActive: isUpdate ? formData.get("isActive") === "on" : true,
  };
  const prisma = getPrismaClient();

  if (isUpdate && typeof serviceId === "string") {
    const result = await prisma.service.updateMany({
      where: { id: serviceId.trim(), professionalId },
      data,
    });

    if (result.count !== 1) {
      return { error: "Serviço não encontrado nesta conta." };
    }
  } else {
    await prisma.service.create({
      data: {
        ...data,
        professionalId,
      },
    });
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/clients");
  return { success: serviceId ? "Serviço atualizado." : "Serviço cadastrado." };
}

export async function savePixKeyAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const pixKeyValue = formData.get("pixKey");

  if (typeof pixKeyValue !== "string") {
    return { error: "Informe uma chave PIX válida." };
  }

  const pixKey = pixKeyValue.trim();
  if (pixKey.length < 3 || pixKey.length > 200) {
    return { error: "A chave PIX deve ter entre 3 e 200 caracteres." };
  }

  await getPrismaClient().professional.update({
    where: { id: professionalId },
    data: { pixKey },
  });

  revalidatePath("/dashboard/services");
  revalidatePath("/agendar/[slug]", "page");
  return { success: "Chave PIX salva." };
}

export async function toggleServiceActiveAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const serviceId = formData.get("serviceId");
  const active = formData.get("active");

  if (
    typeof serviceId !== "string" ||
    !serviceId.trim() ||
    (active !== "true" && active !== "false")
  ) {
    return { error: "Serviço inválido." };
  }

  const result = await getPrismaClient().service.updateMany({
    where: { id: serviceId, professionalId },
    data: { isActive: active === "true" },
  });

  if (result.count !== 1) {
    return { error: "Serviço não encontrado nesta conta." };
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/calendar");
  return { success: active === "true" ? "Serviço reativado." : "Serviço desativado." };
}
