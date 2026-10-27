import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f8f5fa]">
      <header className="border-b border-vitta-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta">
              Vitta Beauty
            </p>
            <p className="mt-1 text-lg font-semibold text-vitta-text">
              Administração
            </p>
          </div>
          <Link
            className="rounded-xl border border-vitta-border px-4 py-2 text-sm font-medium text-vitta-text transition hover:bg-vitta-background"
            href="/dashboard"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
        {children}
      </main>
      <footer className="py-6 text-center text-xs text-vitta-muted">
        Desenvolvido pela I&amp;T Solutions
      </footer>
    </div>
  );
}
