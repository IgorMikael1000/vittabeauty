import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-medium text-vitta">{session?.user.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
        Seu espaço de gestão
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          {
            href: "/dashboard/clients",
            title: "Clientes",
            description: "Cadastre contatos e acompanhe o histórico.",
          },
          {
            href: "/dashboard/services",
            title: "Serviços",
            description: "Organize seus procedimentos, preços e duração.",
          },
          {
            href: "/dashboard/calendar",
            title: "Agenda",
            description: "Consulte horários e organize atendimentos.",
          },
          {
            href: "/dashboard/booking-link",
            title: "Meu link de agendamento",
            description: "Compartilhe sua página pública pelo WhatsApp.",
          },
          {
            href: "/dashboard/finance",
            title: "Financeiro",
            description: "Acompanhe receitas, despesas e lucro estimado.",
          },
          {
            href: "/dashboard/reports",
            title: "Relatórios",
            description: "Veja faturamento, serviços e cancelamentos.",
          },
        ].map((item) => (
          <Link
            className="rounded-2xl border border-vitta-border bg-white p-6 shadow-card transition hover:border-vitta sm:p-7"
            href={item.href}
            key={item.href}
          >
            <h2 className="font-semibold text-vitta-text">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-vitta-muted">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
