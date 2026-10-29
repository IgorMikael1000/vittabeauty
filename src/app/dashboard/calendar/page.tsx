import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentControls } from "@/components/calendar/appointment-controls";
import { DeleteCalendarBlockForm } from "@/components/calendar/delete-calendar-block-form";
import { ScheduleForms } from "@/components/calendar/schedule-forms";
import { WhatsAppShortcuts } from "@/components/calendar/whatsapp-shortcuts";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import {
  formatTime,
  getCalendarRange,
  getDateInTimezone,
  parseDateTimeInTimezone,
} from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";
import { getWhatsAppNumber } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Agenda",
};

const appointmentStatusLabels = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
} as const;

function moveCalendarDate(
  dateText: string,
  view: "day" | "week" | "month",
  direction: -1 | 1,
): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (view === "month") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + direction);
  } else {
    date.setUTCDate(date.getUTCDate() + direction * (view === "week" ? 7 : 1));
  }

  return date.toISOString().slice(0, 10);
}

function calendarHref(date: string, view: string): string {
  return `/dashboard/calendar?date=${date}&view=${view}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const params = await searchParams;
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { timezone: true, name: true },
  });
  const range = getCalendarRange(params.date, params.view, professional.timezone);
  const [appointments, blocks, services] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          professionalId,
          startsAt: { gte: range.start, lt: range.end },
        },
        orderBy: { startsAt: "asc" },
        include: {
          client: { select: { name: true, whatsapp: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.calendarBlock.findMany({
        where: {
          professionalId,
          startsAt: { gte: range.start, lt: range.end },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.service.findMany({
        where: {
          professionalId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, durationMinutes: true },
      }),
    ]);

  const firstDay = getDateInTimezone(range.start, professional.timezone);
  const lastDay = getDateInTimezone(
    new Date(range.end.getTime() - 1),
    professional.timezone,
  );
  const days: string[] = [];
  const cursor = new Date(`${firstDay}T00:00:00.000Z`);

  while (cursor.toISOString().slice(0, 10) <= lastDay) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const title =
    range.view === "month"
      ? new Intl.DateTimeFormat("pt-BR", {
          timeZone: professional.timezone,
          month: "long",
          year: "numeric",
        }).format(
          parseDateTimeInTimezone(`${range.date}T12:00`, professional.timezone) ??
            new Date(),
        )
      : range.view === "week"
        ? `${new Intl.DateTimeFormat("pt-BR", {
            timeZone: professional.timezone,
            day: "2-digit",
            month: "short",
          }).format(range.start)} – ${new Intl.DateTimeFormat("pt-BR", {
            timeZone: professional.timezone,
            day: "2-digit",
            month: "short",
          }).format(new Date(range.end.getTime() - 1))}`
        : new Intl.DateTimeFormat("pt-BR", {
            timeZone: professional.timezone,
            dateStyle: "full",
          }).format(range.start);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="text-sm font-medium text-vitta">Organização</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
          Agenda
        </h1>
        <p className="mt-2 text-sm text-vitta-muted">
          Consulte compromissos e organize sua rotina.
        </p>
        </div>
        <Link
          className="rounded-xl border border-vitta-border bg-white px-4 py-2.5 text-sm font-semibold text-vitta-text transition hover:border-vitta/30 hover:text-vitta"
          href="/dashboard/agenda/configuracoes"
        >
          Configurações de funcionamento
        </Link>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-vitta-border bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold capitalize text-vitta-text">
                  {title}
                </h2>
                <p className="mt-1 text-xs text-vitta-muted">
                  Horário local: {professional.timezone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  aria-label="Período anterior"
                  className="rounded-lg border border-vitta-border px-3 py-2 text-sm font-medium text-vitta-text hover:bg-vitta-background"
                  href={calendarHref(
                    moveCalendarDate(range.date, range.view, -1),
                    range.view,
                  )}
                >
                  Anterior
                </Link>
                <Link
                  className="rounded-lg border border-vitta-border px-3 py-2 text-sm font-medium text-vitta-text hover:bg-vitta-background"
                  href="/dashboard/calendar"
                >
                  Hoje
                </Link>
                <Link
                  aria-label="Próximo período"
                  className="rounded-lg border border-vitta-border px-3 py-2 text-sm font-medium text-vitta-text hover:bg-vitta-background"
                  href={calendarHref(
                    moveCalendarDate(range.date, range.view, 1),
                    range.view,
                  )}
                >
                  Próximo
                </Link>
              </div>
            </div>
            <nav aria-label="Visualização da agenda" className="mt-4 flex gap-2">
              {(["day", "week", "month"] as const).map((view) => (
                <Link
                  aria-current={range.view === view ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    range.view === view
                      ? "bg-vitta text-white"
                      : "border border-vitta-border text-vitta-text hover:bg-vitta-background"
                  }`}
                  href={calendarHref(range.date, view)}
                  key={view}
                >
                  {view === "day"
                    ? "Dia"
                    : view === "week"
                      ? "Semana"
                      : "Mês"}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-4 space-y-3">
            {days.map((day) => {
              const dayStart =
                parseDateTimeInTimezone(`${day}T00:00`, professional.timezone) ??
                new Date(`${day}T00:00:00Z`);
              const weekdayLabel = new Intl.DateTimeFormat("pt-BR", {
                timeZone: professional.timezone,
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(
                parseDateTimeInTimezone(
                  `${day}T12:00`,
                  professional.timezone,
                ) ?? dayStart,
              );
              const dayAppointments = appointments.filter(
                (appointment) =>
                  getDateInTimezone(
                    appointment.startsAt,
                    professional.timezone,
                  ) === day,
              );
              const dayBlocks = blocks.filter(
                (block) =>
                  getDateInTimezone(block.startsAt, professional.timezone) ===
                  day,
              );
              const entries = [
                ...dayAppointments.map((appointment) => ({
                  type: "appointment" as const,
                  startsAt: appointment.startsAt,
                  appointment,
                })),
                ...dayBlocks.map((block) => ({
                  type: "block" as const,
                  startsAt: block.startsAt,
                  block,
                })),
              ].sort(
                (left, right) =>
                  left.startsAt.getTime() - right.startsAt.getTime(),
              );

              return (
                <section
                  aria-label={weekdayLabel}
                  className="rounded-2xl border border-vitta-border bg-white p-4 shadow-card sm:p-5"
                  key={day}
                >
                  <h3 className="mb-3 text-sm font-semibold capitalize text-vitta-text">
                    {weekdayLabel}
                  </h3>
                  {entries.length === 0 ? (
                    <p className="rounded-xl bg-vitta-background px-4 py-3 text-sm text-vitta-muted">
                      Sem compromissos ou bloqueios.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {entries.map((entry) =>
                        entry.type === "appointment" ? (
                          <li
                            className="rounded-xl border border-vitta-border p-4"
                            key={entry.appointment.id}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-vitta-text">
                                  {formatTime(
                                    entry.appointment.startsAt,
                                    professional.timezone,
                                  )}{" "}
                                  –{" "}
                                  {formatTime(
                                    entry.appointment.endsAt,
                                    professional.timezone,
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-vitta">
                                  {entry.appointment.client.name}
                                </p>
                              </div>
                              <span className="rounded-full bg-vitta-pink/15 px-2.5 py-1 text-xs font-medium text-vitta-text">
                                {appointmentStatusLabels[
                                  entry.appointment.status
                                ]}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-vitta-muted">
                              {entry.appointment.service.name}
                            </p>
                            <a
                              className="mt-1 inline-block text-xs text-vitta hover:underline"
                              href={`https://wa.me/${getWhatsAppNumber(entry.appointment.client.whatsapp)}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {entry.appointment.client.whatsapp}
                            </a>
                            <WhatsAppShortcuts
                              clientName={entry.appointment.client.name}
                              endsAt={entry.appointment.endsAt}
                              professionalName={professional.name}
                              serviceName={entry.appointment.service.name}
                              startsAt={entry.appointment.startsAt}
                              status={entry.appointment.status}
                              timeZone={professional.timezone}
                              whatsapp={entry.appointment.client.whatsapp}
                            />
                            {(entry.appointment.status === "PENDING" ||
                              entry.appointment.status === "CONFIRMED") && (
                              <AppointmentControls
                                appointmentId={entry.appointment.id}
                                startsAt={entry.appointment.startsAt}
                                status={entry.appointment.status}
                              />
                            )}
                          </li>
                        ) : (
                          <li
                            className="rounded-xl border border-dashed border-vitta-pink bg-vitta-pink/10 p-4"
                            key={entry.block.id}
                          >
                            <p className="font-semibold text-vitta-text">
                              {formatTime(
                                entry.block.startsAt,
                                professional.timezone,
                              )}{" "}
                              –{" "}
                              {formatTime(
                                entry.block.endsAt,
                                professional.timezone,
                              )}{" "}
                              · Horário bloqueado
                            </p>
                            <p className="mt-1 text-sm text-vitta-muted">
                              {entry.block.reason ?? "Indisponível"}
                            </p>
                            <DeleteCalendarBlockForm blockId={entry.block.id} />
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <aside className="min-w-0">
          <ScheduleForms services={services} />
        </aside>
      </div>
    </section>
  );
}
