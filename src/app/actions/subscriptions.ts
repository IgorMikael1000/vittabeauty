"use server";

import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import {
  isSubscriptionPlanType,
  subscriptionPlans,
} from "@/lib/subscriptions";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

function serializeErrorDetails(error: unknown): string {
  const seen = new WeakSet<object>();

  return (
    JSON.stringify(
      { error },
      (_key, value: unknown) => {
        if (typeof value === "bigint") {
          return value.toString();
        }

        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);

          if (value instanceof Error) {
            return Object.fromEntries(
              Object.getOwnPropertyNames(value).map((property) => [
                property,
                Reflect.get(value, property),
              ]),
            );
          }
        }

        return value;
      },
      2,
    ) ?? String(error)
  );
}

function getApplicationUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : null);

  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for subscription checkout.");
  }

  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && process.env.NODE_ENV !== "development") {
    throw new Error("Subscription checkout requires an HTTPS application URL.");
  }

  return url.origin;
}

export async function createSubscriptionCheckoutAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const planTypeValue = formData.get("planType");

  if (
    typeof planTypeValue !== "string" ||
    !isSubscriptionPlanType(planTypeValue)
  ) {
    return { error: "Selecione um plano válido." };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      error: "O checkout está temporariamente indisponível. Tente novamente mais tarde.",
    };
  }

  const plan = subscriptionPlans[planTypeValue];
  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: { email: true },
  });

  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  let initPoint: string;
  let subscriptionId: string;
  try {
    const applicationUrl = getApplicationUrl();
    const preApproval = new PreApproval(
      new MercadoPagoConfig({ accessToken }),
    );
    const body = {
      reason: `Vitta Beauty · Plano ${plan.name}`,
      external_reference: `${professionalId}:${planTypeValue}`,
      payer_email: professional.email,
      back_url: `${applicationUrl}/dashboard/conta/assinatura?checkout=return`,
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: "months",
        transaction_amount: plan.amount,
        currency_id: "BRL",
      },
    } satisfies Parameters<PreApproval["create"]>[0]["body"];
    console.log("Payload enviado ao MP:", JSON.stringify(body, null, 2));
    const subscription = await preApproval.create({
      body,
    });

    if (!subscription.id || !subscription.init_point) {
      throw new Error("Mercado Pago did not return checkout details.");
    }

    initPoint = subscription.init_point;
    subscriptionId = subscription.id;
  } catch (error) {
    console.error(
      "[Mercado Pago] Falha detalhada ao criar assinatura:",
      serializeErrorDetails(error),
    );
    return {
      error: "Não foi possível iniciar o checkout. Tente novamente em instantes.",
    };
  }

  await getPrismaClient().professional.update({
    where: { id: professionalId },
    data: { mpSubscriptionId: subscriptionId },
  });

  redirect(initPoint);
}
