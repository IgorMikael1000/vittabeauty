import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { auth } from "@/auth";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { getPrismaClient } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const professional = await getPrismaClient().professional.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, specialty: true },
  });

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="min-w-0 border-b border-[#e9e1ed]/80 bg-white/70 px-4 pb-2 pt-5 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-[258px] md:shrink-0 md:border-b-0 md:border-r md:px-5 md:pb-6 md:pt-8">
        <Link
          aria-label="Vitta Beauty — início"
          className="relative block h-[118px] w-[220px] max-w-full overflow-hidden"
          href="/dashboard"
        >
          <Image
            alt="Vitta Beauty"
            className="absolute left-1/2 top-1/2 h-[212px] w-[318px] max-w-none -translate-x-1/2 -translate-y-[40%]"
            height={408}
            priority
            src="/brand/logo_vitta.png"
            width={612}
          />
        </Link>
        <DashboardNavigation />
        <div className="mt-10 hidden rounded-[20px] border border-[#eee5f2] bg-gradient-to-br from-[#fbf8fc] to-[#f4edf8] p-4 md:block">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#9b6bad] shadow-sm">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <path d="M12 3v18m9-9H3m15.36-6.36-12.72 12.72m12.72 0L5.64 5.64" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[#49365a]">Um espaço só seu</p>
          <p className="mt-1.5 text-[11px] leading-5 text-vitta-muted">
            Sua rotina de beleza e cuidado, organizada com leveza.
          </p>
        </div>
      </aside>

      <div className="flex min-h-[calc(100vh-9.5rem)] min-w-0 flex-1 flex-col md:min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#e9e1ed]/70 bg-[#f9f7fa]/85 px-5 py-3.5 backdrop-blur-xl sm:px-8 md:px-10">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-vitta-muted/75">
              Espaço profissional
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tracking-[-0.01em] text-vitta-text">
              {professional.name}
            </p>
            <p className="truncate text-[11px] font-medium text-vitta-muted">
              {professional.specialty ?? "Profissional da beleza"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="hidden h-8 w-px bg-[#e9e1ed] sm:block" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#eedbee] to-[#f7e7ef] text-xs font-semibold text-[#714992]">
              {professional.name.slice(0, 1).toUpperCase()}
            </span>
            <form action={logoutAction}>
              <button
                className="rounded-full border border-[#e8e0ec] bg-white/80 px-3.5 py-2 text-xs font-semibold text-vitta-text/75 transition hover:border-vitta/30 hover:bg-white hover:text-vitta"
                type="submit"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 px-4 py-7 sm:px-8 sm:py-9 md:px-10">{children}</div>
      </div>
    </div>
  );
}
