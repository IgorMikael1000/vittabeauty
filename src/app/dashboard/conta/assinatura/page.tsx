import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanCards } from "@/components/subscription/plan-cards";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
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

export default async function SubscriptionPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
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
      : "Gratuito";
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
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
      <div className="mt-5 rounded-2xl border border-vitta-border bg-white p-5 shadow-card">
        <p className="text-sm text-vitta-muted">
          Status:{" "}
          <strong className="text-vitta-text">
            {statusLabels[professional.subscriptionStatus] ??
              professional.subscriptionStatus}
          </strong>
        </p>
        <p className="mt-2 text-sm text-vitta-muted">
          Plano: <strong className="text-vitta-text">{currentPlan}</strong>
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
