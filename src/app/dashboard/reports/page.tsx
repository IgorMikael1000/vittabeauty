import type { Metadata } from "next";
import Link from "next/link";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { sumScheduledMaterialCosts } from "@/lib/financial-aggregates";
import { getPrismaClient } from "@/lib/prisma";
import { getReportPeriod } from "@/lib/report-period";
import { decimalToCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Relatórios",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCents(amount: number): string {
  return currency.format(amount / 100);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const query = await searchParams;
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { timezone: true },
  });
  const period = getReportPeriod(query.from, query.to, professional.timezone);
  const now = new Date();
  const forecastFrom = period.from > now ? period.from : now;
  const [
    incomeReceived,
    incomeExpected,
    expensesPaid,
    expensesExpected,
    appointmentGroups,
    futureAppointments,
    futureServiceCostCents,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "INCOME",
        status: "PAID",
        paidAt: { gte: period.from, lt: period.to },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "INCOME",
        status: "PENDING",
        appointmentId: null,
        OR: [
          { dueAt: { gte: period.from, lt: period.to } },
          {
            dueAt: null,
            createdAt: { gte: period.from, lt: period.to },
          },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "EXPENSE",
        status: "PAID",
        paidAt: { gte: period.from, lt: period.to },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "EXPENSE",
        status: "PENDING",
        appointmentId: null,
        OR: [
          { dueAt: { gte: period.from, lt: period.to } },
          {
            dueAt: null,
            createdAt: { gte: period.from, lt: period.to },
          },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.appointment.groupBy({
      by: ["serviceId", "status"],
      where: {
        professionalId,
        startsAt: { gte: period.from, lt: period.to },
      },
      _count: { _all: true },
    }),
    prisma.appointment.aggregate({
      where: {
        professionalId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: forecastFrom, lt: period.to },
      },
      _sum: { priceAtBooking: true },
    }),
    sumScheduledMaterialCosts(professionalId, forecastFrom, period.to),
  ]);

  const appointmentCount = appointmentGroups.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const cancelledCount = appointmentGroups.reduce(
    (total, group) =>
      group.status === "CANCELLED" ? total + group._count._all : total,
    0,
  );
  const topServiceCounts = appointmentGroups
    .filter((group) => group.status === "COMPLETED")
    .sort((left, right) => right._count._all - left._count._all)
    .slice(0, 5);
  const topServiceDetails = topServiceCounts.length
    ? await prisma.service.findMany({
        where: {
          professionalId,
          id: { in: topServiceCounts.map((group) => group.serviceId) },
        },
        select: { id: true, name: true },
      })
    : [];
  const serviceNames = new Map(
    topServiceDetails.map((service) => [service.id, service.name]),
  );
  const topServices = topServiceCounts.map((group) => ({
    id: group.serviceId,
    name: serviceNames.get(group.serviceId) ?? "Serviço removido",
    count: group._count._all,
  }));
  const cancellationRate =
    appointmentCount > 0
      ? (cancelledCount / appointmentCount) * 100
      : 0;
  const incomeReceivedCents = decimalToCents(
    incomeReceived._sum.amount ?? "0",
  );
  const incomeExpectedCents =
    decimalToCents(incomeExpected._sum.amount ?? "0") +
    decimalToCents(futureAppointments._sum.priceAtBooking ?? "0");
  const expensesPaidCents = decimalToCents(expensesPaid._sum.amount ?? "0");
  const expensesExpectedCents =
    decimalToCents(expensesExpected._sum.amount ?? "0") +
    futureServiceCostCents;
  const periodLabel = `${period.fromDate} – ${period.toDate}`;
  const cards = [
    {
      label: "Faturamento recebido",
      value: formatCents(incomeReceivedCents),
      description: "Receitas efetivamente pagas no período",
    },
    {
      label: "Receitas previstas",
      value: formatCents(incomeExpectedCents),
      description: "Receitas pendentes com vencimento no período",
    },
    {
      label: "Despesas pagas",
      value: formatCents(expensesPaidCents),
      description: "Despesas efetivamente pagas no período",
    },
    {
      label: "Lucro realizado",
      value: formatCents(incomeReceivedCents - expensesPaidCents),
      description: "Faturamento recebido menos despesas pagas",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-medium text-vitta">Acompanhamento</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
        Relatórios
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Resumo financeiro e indicadores da sua agenda.
      </p>

      <form
        action="/dashboard/reports"
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
          Atualizar relatório
        </button>
        <Link
          className="text-sm font-medium text-vitta hover:underline"
          href={`/dashboard/finance?from=${period.fromDate}&to=${period.toDate}`}
        >
          Abrir financeiro
        </Link>
      </form>
      {period.error && (
        <p className="mt-3 text-sm text-amber-800">{period.error}</p>
      )}
      <p className="mt-3 text-xs text-vitta-muted">
        Período: {periodLabel}. Faturamento recebido usa a data do pagamento;
        receitas previstas usam a data prevista. O relatório considera
        atendimentos pela data agendada.
      </p>

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

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-vitta-muted">
            Atendimentos agendados
          </p>
          <p className="mt-2 text-3xl font-semibold text-vitta-text">
            {appointmentCount}
          </p>
          <p className="mt-2 text-xs text-vitta-muted">
            No período selecionado
          </p>
        </article>
        <article className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-vitta-muted">
            Cancelamentos
          </p>
          <p className="mt-2 text-3xl font-semibold text-vitta-text">
            {cancellationRate.toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}
            %
          </p>
          <p className="mt-2 text-xs text-vitta-muted">
            {cancelledCount} de {appointmentCount} atendimentos
          </p>
        </article>
        <article className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-vitta-muted">
            Despesas previstas
          </p>
          <p className="mt-2 text-2xl font-semibold text-vitta-text">
            {formatCents(expensesExpectedCents)}
          </p>
          <p className="mt-2 text-xs text-vitta-muted">
            Despesas pendentes e materiais de agendamentos futuros pendentes ou confirmados
          </p>
        </article>
      </div>

      <section className="mt-7 rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-vitta-text">
          Serviços mais realizados
        </h2>
        <p className="mt-1 text-sm text-vitta-muted">
          Contagem de atendimentos concluídos por serviço.
        </p>
        {topServices.length === 0 ? (
          <p className="mt-5 rounded-xl bg-vitta-background p-4 text-sm text-vitta-muted">
            Ainda não há atendimentos concluídos neste período.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-vitta-border">
            {topServices.map((service, index) => (
              <li
                className="flex items-center justify-between gap-4 py-3"
                key={service.id}
              >
                <span className="min-w-0 text-sm text-vitta-text">
                  <span className="mr-2 font-semibold text-vitta">
                    {index + 1}.
                  </span>
                  {service.name}
                </span>
                <span className="shrink-0 rounded-full bg-vitta-background px-3 py-1 text-xs font-medium text-vitta-text">
                  {service.count}{" "}
                  {service.count === 1 ? "atendimento" : "atendimentos"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
