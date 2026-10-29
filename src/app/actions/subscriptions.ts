"use server";

import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  isSubscriptionPlanType,
  subscriptionPlans,
} from "@/lib/subscriptions";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

type SubscriptionCheckoutState = {
  error?: string;
  initUrl?: string;
};

function getApplicationUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : null);

  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for payment checkout.");
  }

  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && process.env.NODE_ENV !== "development") {
    throw new Error("Payment checkout requires an HTTPS application URL.");
  }

  return url.origin;
}

export async function createSubscriptionCheckoutAction(
  _previousState: SubscriptionCheckoutState,
  formData: FormData,
): Promise<SubscriptionCheckoutState> {
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

  try {
    const applicationUrl = getApplicationUrl();
    const preference = new Preference(
      new MercadoPagoConfig({ accessToken }),
    );
    const checkoutUrl = new URL(
      "/dashboard/conta/assinatura",
      applicationUrl,
    );
    const body = {
      items: [
        {
          id: `vitta-plan-${planTypeValue.toLowerCase()}`,
          title: `Vitta Beauty - Plano ${plan.name}`,
          quantity: 1,
          unit_price: plan.amount,
          currency_id: "BRL",
        },
      ],
      payer: { email: professional.email },
      back_urls: {
        success: new URL(
          `${checkoutUrl.pathname}?status=success`,
          applicationUrl,
        ).toString(),
        failure: new URL(
          `${checkoutUrl.pathname}?status=failure`,
          applicationUrl,
        ).toString(),
        pending: new URL(
          `${checkoutUrl.pathname}?status=pending`,
          applicationUrl,
        ).toString(),
      },
      auto_return: "approved",
      external_reference: `${professionalId}:${planTypeValue}`,
      notification_url: `${applicationUrl}/api/webhooks/mercadopago`,
    } satisfies Parameters<Preference["create"]>[0]["body"];
    const checkoutPreference = await preference.create({
      body,
    });

    const initUrl =
      checkoutPreference.init_point ?? checkoutPreference.sandbox_init_point;
    if (!initUrl) {
      throw new Error("Mercado Pago did not return checkout details.");
    }

    console.info("[Mercado Pago] One-time checkout preference created.", {
      correlationId: checkoutPreference.id ?? crypto.randomUUID(),
      status: "created",
    });
    return { initUrl };
  } catch (error) {
    console.error("[Mercado Pago] One-time checkout creation failed.", {
      correlationId: crypto.randomUUID(),
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      error: "Não foi possível iniciar o pagamento. Tente novamente em instantes.",
    };
  }
}
