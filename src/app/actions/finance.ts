"use server";

import {
  TransactionStatus,
  TransactionType,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import { parseDateTimeInTimezone } from "@/lib/schedule";

export async function createTransactionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const typeValue = formData.get("type");
  const descriptionValue = formData.get("description");
  const categoryValue = formData.get("category");
  const amountValue = formData.get("amount");
  const dueDateValue = formData.get("dueDate");
  const paid = formData.get("paid") === "on";

  if (
    (typeValue !== "INCOME" && typeValue !== "EXPENSE") ||
    typeof descriptionValue !== "string" ||
    typeof amountValue !== "string" ||
    (categoryValue !== null && typeof categoryValue !== "string") ||
    (dueDateValue !== null && typeof dueDateValue !== "string")
  ) {
    return { error: "Revise os dados do lançamento." };
  }

  const description = descriptionValue.trim();
  const category = categoryValue?.trim() || null;
  const amountPattern = /^\d{1,8}(?:[.,]\d{1,2})?$/;
  const normalizedAmount = amountValue.replace(",", ".");
  const numericAmount = Number(normalizedAmount);

  if (description.length < 2 || description.length > 120) {
    return { error: "A descrição deve ter entre 2 e 120 caracteres." };
  }

  if (
    category &&
    (category.length < 2 || category.length > 60)
  ) {
    return { error: "A categoria deve ter entre 2 e 60 caracteres." };
  }

  if (
    !amountPattern.test(amountValue) ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 99_999_999.99
  ) {
    return { error: "Informe um valor maior que zero com até duas casas decimais." };
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { timezone: true },
  });

  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  let dueAt: Date | null = null;
  if (dueDateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateValue)) {
      return { error: "Informe uma data válida para o lançamento." };
    }

    dueAt = parseDateTimeInTimezone(
      `${dueDateValue}T12:00`,
      professional.timezone,
    );

    if (!dueAt) {
      return { error: "Informe uma data válida para o lançamento." };
    }
  }

  await prisma.transaction.create({
    data: {
      professionalId,
      type:
        typeValue === "INCOME"
          ? TransactionType.INCOME
          : TransactionType.EXPENSE,
      status: paid ? TransactionStatus.PAID : TransactionStatus.PENDING,
      amount: normalizedAmount,
      description,
      category,
      dueAt,
      paidAt: paid ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return { success: "Lançamento financeiro registrado." };
}

export async function updateTransactionStatusAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const transactionId = formData.get("transactionId");
  const nextStatusValue = formData.get("status");

  if (
    typeof transactionId !== "string" ||
    !transactionId.trim() ||
    (nextStatusValue !== "PAID" && nextStatusValue !== "CANCELLED")
  ) {
    return { error: "Ação financeira inválida." };
  }

  const transactionStatus =
    nextStatusValue === "PAID"
      ? TransactionStatus.PAID
      : TransactionStatus.CANCELLED;
  const prisma = getPrismaClient();
  const current = await prisma.transaction.findFirst({
    where: { id: transactionId, professionalId },
    select: { id: true, status: true, appointmentId: true },
  });

  if (!current) {
    return { error: "Lançamento não encontrado nesta conta." };
  }

  if (current.status !== TransactionStatus.PENDING) {
    return { error: "Somente lançamentos pendentes podem ser atualizados." };
  }

  if (
    transactionStatus === TransactionStatus.CANCELLED &&
    current.appointmentId
  ) {
    return {
      error:
        "Para cancelar uma receita de atendimento, cancele o atendimento pela agenda.",
    };
  }

  const result = await prisma.transaction.updateMany({
    where: {
      id: current.id,
      professionalId,
      status: TransactionStatus.PENDING,
    },
    data: {
      status: transactionStatus,
      paidAt:
        transactionStatus === TransactionStatus.PAID ? new Date() : null,
    },
  });

  if (result.count !== 1) {
    return { error: "O lançamento foi atualizado em outra operação." };
  }

  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return {
    success:
      transactionStatus === TransactionStatus.PAID
        ? "Pagamento registrado."
        : "Lançamento cancelado.",
  };
}
