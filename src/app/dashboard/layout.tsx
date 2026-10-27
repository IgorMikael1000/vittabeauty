import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { auth } from "@/auth";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="min-w-0 border-b border-vitta-border bg-white px-5 py-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r md:px-6 md:py-8">
        <Link className="text-lg font-bold tracking-tight text-vitta" href="/dashboard">
          Vitta Beauty
        </Link>
        <DashboardNavigation />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-vitta-border bg-white px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-vitta-text">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-vitta-muted">{session.user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              className="rounded-xl border border-vitta-border px-4 py-2 text-sm font-medium text-vitta-text transition hover:bg-vitta-background"
              type="submit"
            >
              Sair
            </button>
          </form>
        </header>
        <div className="flex-1 px-5 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
