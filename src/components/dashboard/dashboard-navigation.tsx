"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Início", icon: "home" },
  { href: "/dashboard/calendar", label: "Agenda", icon: "calendar" },
  { href: "/dashboard/clients", label: "Clientes", icon: "clients" },
  { href: "/dashboard/services", label: "Serviços", icon: "services" },
  { href: "/dashboard/finance", label: "Financeiro", icon: "finance" },
  { href: "/dashboard/reports", label: "Relatórios", icon: "reports" },
  { href: "/dashboard/booking-link", label: "Meu link", icon: "link" },
] as const;

const iconPaths = {
  home: "m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6",
  calendar: "M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm3 8h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01",
  clients: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.5a4 4 0 0 1 0 7.75M20 21v-2a4 4 0 0 0-3-3.87",
  services: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z",
  finance: "M4 5h16v14H4zM8 15l3-3 2 2 4-5M8 9h.01",
  reports: "M4 19V5m0 14h17M8 16v-4m5 4V8m5 8v-6",
  link: "M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71m2.72 6.36a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71",
} as const;

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="mt-5 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 md:mt-10 md:block md:space-y-1.5 md:overflow-visible md:px-0 md:pb-0"
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`group flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-[13px] font-semibold tracking-[0.01em] transition-all duration-200 md:w-full md:px-3.5 ${
              active
                ? "bg-gradient-to-r from-[#7950a5] to-[#956cba] text-white shadow-[0_8px_18px_rgba(121,80,165,0.22)]"
                : "text-vitta-text/75 hover:bg-white/75 hover:text-vitta"
            }`}
            href={item.href}
            key={item.href}
          >
            <svg
              aria-hidden="true"
              className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${active ? "text-white" : "text-vitta/75 group-hover:scale-105 group-hover:text-vitta"}`}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d={iconPaths[item.icon]} />
            </svg>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
