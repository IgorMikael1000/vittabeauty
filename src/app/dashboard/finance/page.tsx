import type { Metadata } from "next";
import Link from "next/link";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionStatusForm } from "@/components/finance/transaction-status-form";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import { getReportPeriod } from "@/lib/report-period";
import { formatDateTime } from "@/lib/schedule";
import { sumMoneyCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Financeiro",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCents(amount: number): string {
  return currency.format(amount / 100);
}

const transactionLabels = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
} as const;

const statusLabels = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELLED: "Cancelado",
} as const;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const professionalId = await getAuthenticatedProfessionalId();
  const query = await searchParams;
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { timezone: true },
  });
  const period = getReportPeriod(query.from, query.to, professional.timezone);
  const [
    expectedIncome,
    receivedIncome,
    expectedExpenses,
    paidExpenses,
    transactions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "INCOME",
        status: "PENDING",
        OR: [
          { dueAt: { gte: period.from, lt: period.to } },
          {
            dueAt: null,
            createdAt: { gte: period.from, lt: period.to },
          },
        ],
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "INCOME",
        status: "PAID",
        paidAt: { gte: period.from, lt: period.to },
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "EXPENSE",
        status: "PENDING",
        OR: [
          { dueAt: { gte: period.from, lt: period.to } },
          {
            dueAt: null,
            createdAt: { gte: period.from, lt: period.to },
          },
        ],
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "EXPENSE",
        status: "PAID",
        paidAt: { gte: period.from, lt: period.to },
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        professionalId,
        OR: [
          { dueAt: { gte: period.from, lt: period.to } },
          { paidAt: { gte: period.from, lt: period.to } },
          {
            AND: [
              { dueAt: null },
              { paidAt: null },
              { createdAt: { gte: period.from, lt: period.to } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        appointment: {
          select: {
            client: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const expectedIncomeCents = sumMoneyCents(expectedIncome);
  const receivedIncomeCents = sumMoneyCents(receivedIncome);
  const expectedExpenseCents = sumMoneyCents(expectedExpenses);
  const paidExpenseCents = sumMoneyCents(paidExpenses);
  const estimatedProfitCents = expectedIncomeCents - expectedExpenseCents;
  const cards = [
    {
      label: "Receitas previstas",
      value: formatCents(expectedIncomeCents),
      description: "Lançamentos pendentes no período",
    },
    {
      label: "Recebido",
      value: formatCents(receivedIncomeCents),
      description: "Pagamentos confirmados no período",
    },
    {
      label: "Despesas previstas",
      value: formatCents(expectedExpenseCents),
      description: `Pagas no período: ${formatCents(paidExpenseCents)}`,
    },
    {
      label: "Lucro estimado",
      value: formatCents(estimatedProfitCents),
      description: "Receitas previstas menos despesas previstas",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-medium text-vitta">Gestão</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
        Financeiro
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Registre receitas e despesas e acompanhe valores previstos e recebidos.
      </p>

      <form
        action="/dashboard/finance"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-vitta-border bg-white p-4 shadow-card"
      >
        <label className="text-sm font-medium text-vitta-text">
          De
          <input
            className="mt-1 block rounded-xl border border-vitta-border px-3 py-2.5"
            defaultValue={period.fromDate}
            name="from"
            required
            type="date"
          />
        </label>
        <label className="text-sm font-medium text-vitta-text">
          Até
          <input
            className="mt-1 block rounded-xl border border-vitta-border px-3 py-2.5"
            defaultValue={period.toDate}
            name="to"
            required
            type="date"
          />
        </label>
        <button
          className="rounded-xl border border-vitta-border px-4 py-2.5 text-sm font-semibold text-vitta-text hover:bg-vitta-background"
          type="submit"
        >
          Filtrar
        </button>
        <Link
          className="text-sm font-medium text-vitta hover:underline"
          href="/dashboard/reports"
        >
          Ver relatórios
        </Link>
      </form>
      {period.error && (
        <p className="mt-3 text-sm text-amber-800">{period.error}</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card"
            key={card.label}
          >
            <p className="text-sm font-medium text-vitta-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-vitta-text">
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-vitta-muted">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-vitta-text">
            Novo lançamento
          </h2>
          <TransactionForm />
        </aside>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-vitta-text">
            Lançamentos do período
          </h2>
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-vitta-border bg-white p-8 text-center">
              <p className="font-semibold text-vitta-text">
                Nenhum lançamento neste período
              </p>
              <p className="mt-2 text-sm text-vitta-muted">
                Os atendimentos criados na agenda aparecem como receitas
                previstas. Você também pode registrar despesas e outras receitas.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.map((transaction) => (
                <li
                  className="rounded-2xl border border-vitta-border bg-white p-4 shadow-card sm:p-5"
                  key={transaction.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === "INCOME"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-vitta-pink/15 text-vitta-text"
                          }`}
                        >
                          {transactionLabels[transaction.type]}
                        </span>
                        <span className="rounded-full bg-vitta-background px-2.5 py-1 text-xs font-medium text-vitta-text">
                          {statusLabels[transaction.status]}
                        </span>
                      </div>
                      <p className="mt-2 break-words font-semibold text-vitta-text">
                        {transaction.description}
                      </p>
                      {(transaction.category || transaction.appointment) && (
                        <p className="mt-1 text-sm text-vitta-muted">
                          {transaction.category}
                          {transaction.appointment &&
                            ` · ${transaction.appointment.client.name} · ${transaction.appointment.service.name}`}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-vitta-muted">
                        {transaction.status === "PAID" && transaction.paidAt
                          ? `Pago em ${formatDateTime(transaction.paidAt, professional.timezone)}`
                          : transaction.dueAt
                            ? `Previsto para ${formatDateTime(transaction.dueAt, professional.timezone)}`
                            : `Registrado em ${formatDateTime(transaction.createdAt, professional.timezone)}`}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-semibold ${
                        transaction.type === "INCOME"
                          ? "text-emerald-800"
                          : "text-vitta-text"
                      }`}
                    >
                      {transaction.type === "EXPENSE" ? "−" : "+"}
                      {currency.format(Number(transaction.amount))}
                    </p>
                  </div>
                  {transaction.status === "PENDING" && (
                    <TransactionStatusForm
                      canCancel={!transaction.appointmentId}
                      transactionId={transaction.id}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {transactions.length === 100 && (
            <p className="mt-3 text-xs text-vitta-muted">
              Exibindo até 100 lançamentos. Use os filtros para restringir o período.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
