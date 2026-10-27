"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import type { FormState } from "@/app/actions/auth";

function readClientFields(formData: FormData) {
  const name = formData.get("name");
  const whatsapp = formData.get("whatsapp");
  const preferredServiceId = formData.get("preferredServiceId");
  const notes = formData.get("notes");

  if (
    typeof name !== "string" ||
    typeof whatsapp !== "string" ||
    (preferredServiceId !== null && typeof preferredServiceId !== "string") ||
    (notes !== null && typeof notes !== "string")
  ) {
    return { error: "Revise os dados informados." } as const;
  }

  const normalizedName = name.trim();
  const normalizedWhatsapp = whatsapp.trim();
  const normalizedNotes = notes?.trim() || null;
  const normalizedServiceId = preferredServiceId?.trim() || null;
  const digits = normalizedWhatsapp.replace(/\D/g, "");

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return { error: "O nome deve ter entre 2 e 100 caracteres." } as const;
  }

  if (digits.length < 10 || digits.length > 15) {
    return { error: "Informe um WhatsApp com DDD e até 15 dígitos." } as const;
  }

  if ((normalizedNotes?.length ?? 0) > 1000) {
    return { error: "As observações devem ter no máximo 1.000 caracteres." } as const;
  }

  return {
    data: {
      name: normalizedName,
      whatsapp: normalizedWhatsapp,
      preferredServiceId: normalizedServiceId,
      notes: normalizedNotes,
    },
  } as const;
}

export async function saveClientAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const fields = readClientFields(formData);

  if ("error" in fields) {
    return fields;
  }

  const rawId = formData.get("clientId");
  const clientId = typeof rawId === "string" ? rawId.trim() : "";
  const prisma = getPrismaClient();

  if (fields.data.preferredServiceId) {
    const service = await prisma.service.findFirst({
      where: {
        id: fields.data.preferredServiceId,
        professionalId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!service) {
      return { error: "O serviço preferido selecionado não está disponível." };
    }
  }

  if (clientId) {
    const result = await prisma.client.updateMany({
      where: { id: clientId, professionalId },
      data: fields.data,
    });

    if (result.count !== 1) {
      return { error: "Cliente não encontrado nesta conta." };
    }
  } else {
    await prisma.client.create({
      data: {
        ...fields.data,
        professionalId,
      },
    });
  }

  revalidatePath("/dashboard/clients");
  return { success: clientId ? "Cliente atualizado." : "Cliente cadastrado." };
}

export async function deleteClientAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId();
  const rawId = formData.get("clientId");

  if (typeof rawId !== "string" || !rawId.trim()) {
    return { error: "Cliente inválido." };
  }

  const prisma = getPrismaClient();
  const client = await prisma.client.findFirst({
    where: { id: rawId, professionalId },
    select: {
      id: true,
      _count: { select: { appointments: true } },
    },
  });

  if (!client) {
    return { error: "Cliente não encontrado nesta conta." };
  }

  if (client._count.appointments > 0) {
    return {
      error:
        "Este cliente possui histórico de atendimentos. Para preservar o histórico, não é possível excluí-lo.",
    };
  }

  try {
    await prisma.client.deleteMany({
      where: { id: client.id, professionalId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        error:
          "Este cliente possui registros vinculados e não pode ser excluído.",
      };
    }

    throw error;
  }

  revalidatePath("/dashboard/clients");
  return { success: "Cliente excluído." };
}
