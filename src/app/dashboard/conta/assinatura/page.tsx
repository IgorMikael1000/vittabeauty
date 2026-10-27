import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { PlanCards } from "@/components/subscription/plan-cards";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import { syncCheckoutPayment } from "@/lib/subscription-payments";
import { subscriptionPlans } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Assinatura",
};

const statusLabels: Record<string, string> = {
  TRIAL: "Período grátis",
  ACTIVE: "Ativa",
  CANCELED: "Cancelada — acesso até o vencimento",
  EXPIRED: "Expirada",
};

type SubscriptionPageProps = {
  searchParams: Promise<{
    collection_id?: string | string[];
    collection_status?: string | string[];
    payment_id?: string | string[];
    status?: string | string[];
  }>;
};

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const query = await searchParams;
  const checkoutStatuses = [
    ...(Array.isArray(query.status) ? query.status : [query.status]),
    ...(Array.isArray(query.collection_status)
      ? query.collection_status
      : [query.collection_status]),
  ];
  const checkoutSucceeded = checkoutStatuses.some(
    (status) => status === "success" || status === "approved",
  );
  const paymentIdValue =
    typeof query.payment_id === "string"
      ? query.payment_id
      : typeof query.collection_id === "string"
        ? query.collection_id
        : undefined;
  let paymentNotice: { message: string; tone: "success" | "pending" | "error" } | null =
    null;

  if (checkoutSucceeded) {
    if (!paymentIdValue || !/^\d+$/.test(paymentIdValue)) {
      paymentNotice = {
        message:
          "O Mercado Pago retornou sem o identificador do pagamento. A confirmação será atualizada pelo webhook.",
        tone: "pending",
      };
    } else {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error(
          "MERCADOPAGO_ACCESS_TOKEN is not configured for checkout return validation.",
        );
        paymentNotice = {
          message:
            "Não foi possível consultar o pagamento agora. A confirmação será atualizada pelo webhook.",
          tone: "error",
        };
      } else {
        try {
          const payment = await new Payment(
            new MercadoPagoConfig({ accessToken }),
          ).get({ id: paymentIdValue });

          if (payment.status === "approved") {
            const paidAtValue = payment.date_approved ?? payment.date_created;
            if (!paidAtValue || Number.isNaN(new Date(paidAtValue).getTime())) {
              throw new Error(
                "Approved Mercado Pago payment has no valid creation date.",
              );
            }
            const applied = await syncCheckoutPayment({
              paymentId: paymentIdValue,
              externalReference: payment.external_reference,
              status: payment.status,
              statusDetail: payment.status_detail,
              amount: payment.transaction_amount,
              currency: payment.currency_id,
              paymentMethod: payment.payment_method_id,
              paymentType: payment.payment_type_id,
              refundedAmount: payment.transaction_amount_refunded,
              paidAt: new Date(paidAtValue),
              expectedProfessionalId: professionalId,
            });
            paymentNotice = applied
              ? {
                  message:
                    "Pagamento confirmado. Seu plano e prazo de acesso foram atualizados.",
                  tone: "success",
                }
              : {
                  message:
                    "O pagamento não corresponde a esta conta. O acesso não foi alterado.",
                  tone: "error",
                };
          } else {
            paymentNotice = {
              message:
                "O pagamento ainda está sendo processado. Esta página será atualizada após a confirmação.",
              tone: "pending",
            };
          }
        } catch (error) {
          console.error(
            "[Mercado Pago] Falha ao validar retorno do Checkout Pro:",
            error,
          );
          paymentNotice = {
            message:
              "Não foi possível confirmar o pagamento agora. A confirmação será atualizada pelo webhook.",
            tone: "error",
          };
        }
      }
    }
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: {
      subscriptionStatus: true,
      planType: true,
      expiresAt: true,
      mpSubscriptionId: true,
    },
  });
  if (!professional) {
    redirect("/login");
  }
  const currentPlan =
    professional.planType in subscriptionPlans
      ? subscriptionPlans[
          professional.planType as keyof typeof subscriptionPlans
        ].name
      : professional.subscriptionStatus === "TRIAL"
        ? "Período grátis (Trial)"
        : "Gratuito";
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(professional.expiresAt);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <Link
        className="text-sm font-medium text-vitta transition hover:underline"
        href="/dashboard/conta"
      >
        ← Minha Conta
      </Link>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
        Plano e pagamentos
      </p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-vitta-text">
        Assinatura
      </h1>
      {paymentNotice && (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            paymentNotice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : paymentNotice.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          {paymentNotice.message}
        </p>
      )}
      <div className="mt-5 rounded-2xl border border-vitta-border bg-white p-5 shadow-card">
        <p className="text-sm text-vitta-muted">
          Status:{" "}
          <strong className="text-vitta-text">
            {statusLabels[professional.subscriptionStatus] ??
              professional.subscriptionStatus}
          </strong>
        </p>
        <p className="mt-2 text-sm text-vitta-muted">
          Plano vigente:{" "}
          <strong className="text-vitta-text">{currentPlan}</strong>
        </p>
        <p className="mt-2 text-sm text-vitta-muted">
          Acesso até:{" "}
          <strong className="text-vitta-text">{expiresAt}</strong>
        </p>
        {professional.mpSubscriptionId && (
          <p className="mt-2 text-xs text-vitta-muted">
            Assinatura gerenciada pelo Mercado Pago.
          </p>
        )}
      </div>
      <h2 className="mt-8 text-lg font-semibold text-vitta-text">
        Escolha seu plano
      </h2>
      <p className="mt-1 text-sm text-vitta-muted">
        O checkout é processado com segurança pelo Mercado Pago.
      </p>
      <div className="mt-4">
        <PlanCards />
      </div>
    </section>
  );
}
