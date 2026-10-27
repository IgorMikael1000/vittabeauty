"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/clients", label: "Clientes" },
  { href: "/dashboard/services", label: "Serviços" },
  { href: "/dashboard/calendar", label: "Agenda" },
  { href: "/dashboard/booking-link", label: "Meu link de agendamento" },
  { href: "/dashboard/finance", label: "Financeiro" },
  { href: "/dashboard/reports", label: "Relatórios" },
];

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="mt-4 flex max-w-full gap-1 overflow-x-auto pb-1 md:mt-6 md:block md:space-y-1 md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`block shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition md:whitespace-normal ${
              active
                ? "bg-vitta/10 text-vitta"
                : "text-vitta-text hover:bg-vitta-background"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
