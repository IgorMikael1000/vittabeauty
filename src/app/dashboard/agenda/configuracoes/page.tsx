import type { Metadata } from "next";
import Link from "next/link";
import { WorkingHoursSettings } from "@/components/calendar/working-hours-settings";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Configurações da agenda",
};

export default async function AgendaSettingsPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const savedHours = await getPrismaClient().workingHours.findMany({
    where: { professionalId },
    orderBy: { weekday: "asc" },
  });
  const workingHours = Array.from({ length: 7 }, (_, weekday) => {
    const saved = savedHours.find((hours) => hours.weekday === weekday);
    return {
      weekday,
      startMinute: saved?.startMinute ?? 9 * 60,
      endMinute: saved?.endMinute ?? 17 * 60,
      interval: saved?.interval ?? 15,
      blockedSlots: saved?.blockedSlots ?? [],
      isActive: saved?.isActive ?? false,
    };
  });

  return (
    <section className="mx-auto w-full max-w-4xl">
      <Link
        className="text-sm font-semibold text-vitta hover:underline"
        href="/dashboard/calendar"
      >
        ← Voltar para a agenda
      </Link>
      <div className="mt-4">
        <p className="text-sm font-medium text-vitta">Organização</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
          Regras de funcionamento
        </h1>
        <p className="mt-2 text-sm text-vitta-muted">
          Configure o expediente, a frequência dos horários e as pausas
          recorrentes da agenda.
        </p>
      </div>
      <div className="mt-7">
        <WorkingHoursSettings workingHours={workingHours} />
      </div>
    </section>
  );
}
