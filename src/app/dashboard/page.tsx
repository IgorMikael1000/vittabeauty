import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { sumMoneyCents } from "@/lib/money";
import { getPrismaClient } from "@/lib/prisma";
import { formatTime, getCalendarRange } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Visão geral",
};

const dashboardItems = [
  {
    href: "/dashboard/clients",
    title: "Clientes",
    eyebrow: "Relacionamento",
    description: "Cadastre contatos e acompanhe o histórico.",
    icon: "clients",
  },
  {
    href: "/dashboard/services",
    title: "Serviços",
    eyebrow: "Seu trabalho",
    description: "Organize seus procedimentos, preços e duração.",
    icon: "services",
  },
  {
    href: "/dashboard/calendar",
    title: "Agenda",
    eyebrow: "Organização",
    description: "Consulte horários e organize atendimentos.",
    icon: "calendar",
  },
  {
    href: "/dashboard/booking-link",
    title: "Meu link de agendamento",
    eyebrow: "Mais praticidade",
    description: "Compartilhe sua página pública pelo WhatsApp.",
    icon: "link",
  },
  {
    href: "/dashboard/finance",
    title: "Financeiro",
    eyebrow: "Controle",
    description: "Acompanhe receitas, despesas e lucro estimado.",
    icon: "finance",
  },
  {
    href: "/dashboard/reports",
    title: "Relatórios",
    eyebrow: "Visão do negócio",
    description: "Veja faturamento, serviços e cancelamentos.",
    icon: "reports",
  },
] as const;

export default async function DashboardPage() {
  const session = await auth();
  const professionalId = await getAuthenticatedProfessionalId();
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { timezone: true },
  });
  const now = new Date();
  const today = getCalendarRange(undefined, "day", professional.timezone);
  const [nextAppointment, pendingAppointments, completedAppointments, income] =
    await Promise.all([
      prisma.appointment.findFirst({
        where: {
          professionalId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { gte: now },
        },
        orderBy: { startsAt: "asc" },
        select: {
          startsAt: true,
          client: { select: { name: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.appointment.count({
        where: {
          professionalId,
          status: "PENDING",
          startsAt: { gte: now },
        },
      }),
      prisma.appointment.count({
        where: {
          professionalId,
          status: "COMPLETED",
          startsAt: { gte: today.start, lt: today.end },
        },
      }),
      prisma.transaction.findMany({
        where: {
          professionalId,
          type: "INCOME",
          OR: [
            {
              status: "PAID",
              paidAt: { gte: today.start, lt: today.end },
            },
            {
              status: "PENDING",
              dueAt: { gte: today.start, lt: today.end },
            },
            {
              status: "PENDING",
              dueAt: null,
              createdAt: { gte: today.start, lt: today.end },
            },
          ],
        },
        select: { amount: true, status: true },
      }),
    ]);

  const receivedTodayCents = sumMoneyCents(
    income.filter((transaction) => transaction.status === "PAID"),
  );
  const expectedTodayCents = sumMoneyCents(
    income.filter((transaction) => transaction.status === "PENDING"),
  );
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const widgets = [
    {
      href: "/dashboard/calendar",
      label: "Próximo atendimento",
      value: nextAppointment
        ? formatTime(nextAppointment.startsAt, professional.timezone)
        : "Agenda livre",
      detail: nextAppointment
        ? `${nextAppointment.client.name} · ${nextAppointment.service.name}`
        : "Nenhum atendimento futuro",
      icon: "calendar",
    },
    {
      href: "/dashboard/calendar",
      label: "Aguardando confirmação",
      value: String(pendingAppointments),
      detail:
        pendingAppointments === 1
          ? "1 agendamento pendente"
          : "agendamentos pendentes",
      icon: "pending",
    },
    {
      href: "/dashboard/finance",
      label: "Faturamento de hoje",
      value: currency.format(receivedTodayCents / 100),
      detail: `Previsto: ${currency.format(expectedTodayCents / 100)}`,
      icon: "finance",
    },
    {
      href: "/dashboard/calendar",
      label: "Atendimentos realizados",
      value: String(completedAppointments),
      detail:
        completedAppointments === 1 ? "concluído hoje" : "concluídos hoje",
      icon: "completed",
    },
  ] as const;

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#56376f] via-[#7950a5] to-[#a875ae] px-6 py-8 shadow-[0_22px_55px_rgba(86,55,111,0.2)] sm:px-9 sm:py-10 lg:px-11 lg:py-9">
        <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/[0.04]" />
        <div aria-hidden="true" className="absolute -bottom-36 right-28 -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-9">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Seu espaço, seu momento
          </p>
          <h1 className="mt-3 text-[29px] font-semibold leading-[1.12] tracking-[-0.045em] text-white sm:text-[38px]">
            Olá, {session?.user.name?.split(" ")[0] ?? "profissional"}.
            <br className="hidden sm:block" /> Que bom ter você por aqui.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-[15px]">
            Cuide da sua rotina profissional com a mesma atenção que você dedica
            a cada cliente.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-[#63417c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fcf8ff]"
            href="/dashboard/calendar"
          >
            Abrir minha agenda
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-3">
          {widgets.map((widget) => (
            <Link
              className="group min-w-0 rounded-[18px] border border-white/15 bg-white/[0.11] p-3.5 text-white shadow-sm backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.17] sm:rounded-[20px] sm:p-4"
              href={widget.href}
              key={widget.label}
            >
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] text-white/65 sm:text-[11px]">
                <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-white/75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d={widgetIconPaths[widget.icon]} />
                </svg>
                <span className="truncate">{widget.label}</span>
              </span>
              <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] sm:text-xl">
                {widget.value}
              </p>
              <p className="mt-1 truncate text-[11px] leading-4 text-white/70 sm:text-xs">
                {widget.detail}
              </p>
            </Link>
          ))}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-2 right-3 -z-10 hidden h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] lg:flex">
          <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-[42px] font-light text-white/60">
            V
          </span>
        </div>
        </div>
      </div>

      <div className="mb-4 mt-9 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
            Sua rotina
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-vitta-text sm:text-[22px]">
            Acesse seu espaço
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardItems.map((item) => (
          <Link
            className="group rounded-[22px] border border-[#ebe5ef] bg-white/80 p-5 shadow-[0_8px_28px_rgba(48,40,58,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d8c8e3] hover:bg-white hover:shadow-card sm:p-5"
            href={item.href}
            key={item.href}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f5eff8] text-[#865ba5] transition-colors group-hover:bg-[#efe5f5]">
                <svg aria-hidden="true" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d={homeIconPaths[item.icon]} />
                </svg>
              </span>
              <svg aria-hidden="true" className="mt-1 h-4 w-4 text-[#b8a9c1] transition group-hover:translate-x-0.5 group-hover:text-vitta" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-vitta-muted/75">
              {item.eyebrow}
            </p>
            <h3 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-vitta-text">
              {item.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-5 text-vitta-muted">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

const homeIconPaths = {
  clients: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.5a4 4 0 0 1 0 7.75M20 21v-2a4 4 0 0 0-3-3.87",
  services: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z",
  calendar: "M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z",
  link: "M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71m2.72 6.36a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71",
  finance: "M4 5h16v14H4zM8 15l3-3 2 2 4-5",
  reports: "M4 19V5m0 14h17M8 16v-4m5 4V8m5 8v-6",
} as const;

const widgetIconPaths = {
  calendar: "M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z",
  pending: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  finance: "M4 5h16v14H4zM8 15l3-3 2 2 4-5",
  completed: "m5 12 4 4L19 6",
} as const;
