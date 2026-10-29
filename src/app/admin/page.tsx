import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { decimalToCents } from "@/lib/money";
import {
  describeMercadoPagoPayment,
  describePaymentInstallments,
  estimateMercadoPagoFee,
} from "@/lib/mercadopago-fees";

export const metadata: Metadata = {
  title: "Administração",
};

type AdminPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

function isDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00-03:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCents(value: number): string {
  return formatCurrency(value / 100);
}

function formatPercent(value: number | null): string {
  if (value === null) return "Não disponível";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | null): string {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

const paymentStatusLabels: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  in_process: "Em processamento",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contestado",
};

const planLabels: Record<string, string> = {
  MONTHLY: "Mensal",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  FREE: "Gratuito",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const actorProfessionalId = await requireAdmin();
  const query = await searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const from = isDateInput(query.from) ? query.from : defaultFrom;
  const to = isDateInput(query.to) ? query.to : defaultTo;
  if (from > to) {
    redirect("/admin");
  }

  const rangeStart = new Date(`${from}T00:00:00-03:00`);
  const rangeEnd = new Date(`${to}T23:59:59.999-03:00`);
  const prisma = getPrismaClient();
  const professionalOnly = { role: "PROFESSIONAL" as const };
  const professionalPaymentsOnly = { professional: professionalOnly };

  await prisma.adminAuditLog.create({
    data: {
      actorProfessionalId,
      action: "VIEW_ADMIN_OVERVIEW",
    },
  });

  const [
    totalProfessionals,
    activeProfessionals,
    trialProfessionals,
    expiredProfessionals,
    newProfessionals,
    paidPayments,
    paymentsWithoutAmount,
    approvedPaymentDetails,
    pendingPayments,
    refundedPayments,
    recentProfessionals,
    recentPayments,
  ] = await Promise.all([
    prisma.professional.count({ where: professionalOnly }),
    prisma.professional.count({
      where: { ...professionalOnly, expiresAt: { gt: now } },
    }),
    prisma.professional.count({
      where: {
        ...professionalOnly,
        subscriptionStatus: "TRIAL",
        expiresAt: { gt: now },
      },
    }),
    prisma.professional.count({
      where: { ...professionalOnly, expiresAt: { lte: now } },
    }),
    prisma.professional.count({
      where: {
        ...professionalOnly,
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
    }),
    prisma.subscriptionPayment.aggregate({
      where: {
        ...professionalPaymentsOnly,
        status: "approved",
        paidAt: { gte: rangeStart, lte: rangeEnd },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.subscriptionPayment.count({
      where: {
        ...professionalPaymentsOnly,
        status: "approved",
        amount: null,
        paidAt: { gte: rangeStart, lte: rangeEnd },
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: {
        ...professionalPaymentsOnly,
        status: "approved",
        paidAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        amount: true,
        refundedAmount: true,
        paymentMethod: true,
        paymentType: true,
        installments: true,
      },
    }),
    prisma.subscriptionPayment.count({
      where: {
        ...professionalPaymentsOnly,
        status: { in: ["pending", "in_process"] },
        OR: [
          { paidAt: { gte: rangeStart, lte: rangeEnd } },
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
    }),
    prisma.subscriptionPayment.count({
      where: {
        ...professionalPaymentsOnly,
        status: { in: ["refunded", "charged_back"] },
        OR: [
          { paidAt: { gte: rangeStart, lte: rangeEnd } },
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
    }),
    prisma.professional.findMany({
      where: professionalOnly,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        expiresAt: true,
        subscriptionStatus: true,
        planType: true,
        role: true,
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: {
        ...professionalPaymentsOnly,
        OR: [
          { paidAt: { gte: rangeStart, lte: rangeEnd } },
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        mercadoPagoPaymentId: true,
        planType: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        paymentType: true,
        installments: true,
        status: true,
        statusDetail: true,
        refundedAmount: true,
        paidAt: true,
        professional: { select: { name: true, email: true } },
      },
    }),
  ]);
  const grossRevenueCents = decimalToCents(
    paidPayments._sum.amount ?? "0",
  );
  let estimatedFeeCents = 0;
  let recognizedGrossCents = 0;
  let estimatedNetCents = 0;
  let feeRecognizedPaymentCount = 0;

  for (const payment of approvedPaymentDetails) {
    if (payment.amount === null) continue;

    const amountCents = decimalToCents(payment.amount);
    const fee = estimateMercadoPagoFee({
      amountCents,
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      installments: payment.installments,
    });
    if (!fee) continue;

    const refundedCents = Math.min(
      amountCents,
      decimalToCents(payment.refundedAmount ?? "0"),
    );
    estimatedFeeCents += fee.feeCents;
    recognizedGrossCents += amountCents;
    estimatedNetCents += amountCents - fee.feeCents - refundedCents;
    feeRecognizedPaymentCount += 1;
  }

  const unpricedPaymentCount =
    paidPayments._count._all - feeRecognizedPaymentCount;
  const averageFeeRate =
    recognizedGrossCents > 0
      ? estimatedFeeCents / recognizedGrossCents
      : null;
  const unknownHistoricalCount = paymentsWithoutAmount;
  const paymentRows = recentPayments.map((payment) => {
    const amountCents =
      payment.amount === null ? null : decimalToCents(payment.amount);
    const fee =
      payment.status === "approved" && amountCents !== null
        ? estimateMercadoPagoFee({
            amountCents,
            paymentMethod: payment.paymentMethod,
            paymentType: payment.paymentType,
            installments: payment.installments,
          })
        : null;
    const refundedCents =
      amountCents === null
        ? 0
        : Math.min(
            amountCents,
            decimalToCents(payment.refundedAmount ?? "0"),
          );
    const netCents =
      amountCents !== null && fee
        ? amountCents - fee.feeCents - refundedCents
        : null;

    return {
      ...payment,
      amountCents,
      feeCents: fee?.feeCents ?? null,
      netCents,
      paymentDescription: describeMercadoPagoPayment({
        paymentMethod: payment.paymentMethod,
        paymentType: payment.paymentType,
      }),
      installmentDescription: describePaymentInstallments({
        installments: payment.installments,
        paymentType: payment.paymentType,
      }),
    };
  });

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta">
            Indicadores da plataforma
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-vitta-text">
            Visão geral
          </h1>
          <p className="mt-2 text-sm text-vitta-muted">
            Painel administrativo somente para consulta.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid gap-1 text-xs font-medium text-vitta-muted">
            De
            <input
              className="rounded-lg border border-vitta-border bg-white px-3 py-2 text-sm text-vitta-text"
              defaultValue={from}
              name="from"
              type="date"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-vitta-muted">
            Até
            <input
              className="rounded-lg border border-vitta-border bg-white px-3 py-2 text-sm text-vitta-text"
              defaultValue={to}
              name="to"
              type="date"
            />
          </label>
          <button
            className="rounded-lg bg-vitta px-4 py-2.5 text-sm font-semibold text-white hover:bg-vitta/90"
            type="submit"
          >
            Filtrar
          </button>
        </form>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-vitta-text">
          Resumo financeiro do período
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Faturamento bruto",
              value: formatCents(grossRevenueCents),
              detail: "Pagamentos aprovados, antes de taxas e estornos",
            },
            {
              label: "Taxas estimadas",
              value: formatCents(estimatedFeeCents),
              detail: `${feeRecognizedPaymentCount} pagamentos com tarifa identificada`,
            },
            {
              label: "Líquido estimado",
              value: formatCents(estimatedNetCents),
              detail: `Após taxas e estornos nos pagamentos calculados (${feeRecognizedPaymentCount})`,
            },
            {
              label: "Taxa média efetiva",
              value: formatPercent(averageFeeRate),
              detail: `Ponderada pelo valor dos ${feeRecognizedPaymentCount} pagamentos calculados`,
            },
          ].map((metric) => (
            <article
              className="rounded-2xl border border-vitta-border bg-white p-4 shadow-card"
              key={metric.label}
            >
              <p className="text-xs font-medium text-vitta-muted">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-vitta-text">
                {metric.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-vitta-muted">
                {metric.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-vitta-text">
          Indicadores da plataforma
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Pagamentos aprovados", value: String(paidPayments._count._all) },
            { label: "Profissionais", value: String(totalProfessionals) },
            { label: "Acesso vigente", value: String(activeProfessionals) },
            { label: "Trials vigentes", value: String(trialProfessionals) },
            { label: "Acessos expirados", value: String(expiredProfessionals) },
            { label: "Novos cadastros no período", value: String(newProfessionals) },
            { label: "Pagamentos pendentes", value: String(pendingPayments) },
            { label: "Pagamentos reembolsados/contestados", value: String(refundedPayments) },
          ].map((metric) => (
            <article
              className="rounded-2xl border border-vitta-border bg-white p-4 shadow-card"
              key={metric.label}
            >
              <p className="text-xs font-medium text-vitta-muted">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-vitta-text">
                {metric.value}
              </p>
            </article>
          ))}
        </div>
      </section>
      {unpricedPaymentCount > 0 && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
          Não foi possível estimar a taxa de {unpricedPaymentCount} pagamento(s)
          aprovado(s) do período porque a forma de pagamento, o parcelamento ou
          uma tarifa correspondente não está disponível. Esses pagamentos
          aparecem no faturamento bruto, mas ficam fora dos totais líquidos e
          da taxa média calculada.
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-vitta-muted">
        Taxas estimadas conforme a tabela informada para o Mercado Pago. O valor
        líquido considera somente pagamentos com tarifa identificada e desconta
        estornos registrados.
      </p>
      {unknownHistoricalCount > 0 && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
          Existem {unknownHistoricalCount} pagamentos aprovados neste período
          sem valor salvo no banco. Eles são registros históricos anteriores ao
          detalhamento do pagamento e não entram no total de receita.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-vitta-border bg-white shadow-card">
        <div className="border-b border-vitta-border px-5 py-4">
          <h2 className="text-lg font-semibold text-vitta-text">
            Profissionais
          </h2>
          <p className="mt-1 text-xs text-vitta-muted">
            Exibindo as 100 contas mais recentes. Nenhuma ação destrutiva está disponível.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-[#faf7fb] text-xs text-vitta-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Profissional</th>
                <th className="px-5 py-3 font-semibold">Cadastro</th>
                <th className="px-5 py-3 font-semibold">Plano</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Expiração</th>
                <th className="px-5 py-3 font-semibold">Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vitta-border">
              {recentProfessionals.map((professional) => (
                <tr key={professional.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-vitta-text">
                      {professional.name}
                    </p>
                    <p className="mt-0.5 text-xs text-vitta-muted">
                      {professional.email}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-vitta-muted">
                    {formatDate(professional.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-vitta-text">
                    {planLabels[professional.planType] ?? professional.planType}
                  </td>
                  <td className="px-5 py-3 text-vitta-text">
                    {professional.subscriptionStatus}
                  </td>
                  <td className="px-5 py-3 text-vitta-muted">
                    {formatDate(professional.expiresAt)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        professional.expiresAt > now
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {professional.expiresAt > now ? "Vigente" : "Expirado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-vitta-border bg-white shadow-card">
        <div className="border-b border-vitta-border px-5 py-4">
          <h2 className="text-lg font-semibold text-vitta-text">
            Pagamentos do Mercado Pago
          </h2>
          <p className="mt-1 text-xs text-vitta-muted">
            Até 100 registros criados ou pagos no período selecionado. Valores
            líquidos e taxas são estimativas conforme a forma de pagamento.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="bg-[#faf7fb] text-xs text-vitta-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Pagamento</th>
                <th className="px-5 py-3 font-semibold">Profissional</th>
                <th className="px-5 py-3 font-semibold">Plano</th>
                <th className="px-5 py-3 text-right font-semibold">Bruto</th>
                <th className="px-5 py-3 text-right font-semibold">Taxa</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Líquido estimado
                </th>
                <th className="px-5 py-3 font-semibold">
                  Forma de pagamento
                </th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vitta-border">
              {paymentRows.map((payment) => (
                <tr key={payment.mercadoPagoPaymentId}>
                  <td className="px-5 py-3 font-mono text-xs text-vitta-muted">
                    {payment.mercadoPagoPaymentId}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-vitta-text">
                      {payment.professional.name}
                    </p>
                    <p className="mt-0.5 text-xs text-vitta-muted">
                      {payment.professional.email}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-vitta-text">
                    {planLabels[payment.planType] ?? payment.planType}
                  </td>
                  <td className="px-5 py-3 text-right text-vitta-text">
                    {payment.amountCents === null
                      ? "Valor indisponível"
                      : formatCents(payment.amountCents)}
                    {payment.refundedAmount &&
                      payment.refundedAmount.toNumber() > 0 && (
                        <span className="block text-xs text-red-700">
                          Estornado:{" "}
                          {formatCurrency(payment.refundedAmount.toNumber())}
                        </span>
                      )}
                  </td>
                  <td className="px-5 py-3 text-right text-vitta-muted">
                    {payment.status !== "approved"
                      ? "—"
                      : payment.feeCents === null
                        ? "Não calculada"
                        : formatCents(payment.feeCents)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-vitta-text">
                    {payment.status !== "approved"
                      ? "—"
                      : payment.netCents === null
                        ? "Não calculado"
                        : formatCents(payment.netCents)}
                  </td>
                  <td className="px-5 py-3 text-vitta-muted">
                    <span>{payment.paymentDescription}</span>
                    {payment.installmentDescription && (
                      <span className="mt-1 block text-xs text-vitta-muted">
                        {payment.installmentDescription}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-vitta-text">
                    {paymentStatusLabels[payment.status] ?? payment.status}
                    {payment.statusDetail && (
                      <span className="block text-xs text-vitta-muted">
                        {payment.statusDetail}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-vitta-muted">
                    {formatDate(payment.paidAt)}
                  </td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-vitta-muted"
                    colSpan={9}
                  >
                    Nenhum pagamento com data no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 text-xs text-vitta-muted">
        Os valores representam pagamentos processados pelo Vitta Beauty, não o
        faturamento dos atendimentos dos profissionais.
      </p>
    </section>
  );
}
