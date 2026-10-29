"use client";

import { useState } from "react";

type PublicBookingDateCalendarProps = {
  slug: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  }>;
  selectedServiceId: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
  blockedDates: string[];
};

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(date: string, amount: number): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1))
    .toISOString()
    .slice(0, 10);
}

function dateForCalendarCell(month: string, index: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const mondayFirstOffset = (firstDay.getUTCDay() + 6) % 7;

  return new Date(
    Date.UTC(year, monthNumber - 1, index - mondayFirstOffset + 1),
  )
    .toISOString()
    .slice(0, 10);
}

export function PublicBookingDateCalendar({
  slug,
  services,
  selectedServiceId,
  selectedDate,
  minDate,
  maxDate,
  blockedDates,
}: PublicBookingDateCalendarProps) {
  const blockedDateSet = new Set(blockedDates);
  const initialDate =
    selectedDate >= minDate &&
    selectedDate <= maxDate &&
    !blockedDateSet.has(selectedDate)
      ? selectedDate
      : minDate;
  const [date, setDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(monthStart(initialDate));
  const firstMonth = monthStart(minDate);
  const lastMonth = monthStart(maxDate);
  const monthDate = new Date(`${visibleMonth}T12:00:00.000Z`);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);

  return (
    <form
      action={`/agendar/${encodeURIComponent(slug)}`}
      className="space-y-4"
    >
      <label className="block text-sm font-medium text-vitta-text">
        Serviço
        <select
          className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          defaultValue={selectedServiceId}
          name="serviceId"
          required
        >
          <option disabled value="">
            Selecione um serviço
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ·{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(service.price)}{" "}
              · {service.durationMinutes} min
            </option>
          ))}
        </select>
      </label>

      <input name="date" type="hidden" value={date} />

      <section aria-label="Seleção de data" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-vitta-text">
            Escolha uma data
          </h2>
          <div className="flex items-center gap-2">
            <button
              aria-label="Mês anterior"
              className="rounded-lg border border-vitta-border px-3 py-1.5 text-sm text-vitta-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={visibleMonth <= firstMonth}
              onClick={() => setVisibleMonth(shiftMonth(visibleMonth, -1))}
              type="button"
            >
              ‹
            </button>
            <span className="min-w-32 text-center text-sm font-semibold capitalize text-vitta-text">
              {monthLabel}
            </span>
            <button
              aria-label="Próximo mês"
              className="rounded-lg border border-vitta-border px-3 py-1.5 text-sm text-vitta-text disabled:cursor-not-allowed disabled:opacity-40"
              disabled={visibleMonth >= lastMonth}
              onClick={() => setVisibleMonth(shiftMonth(visibleMonth, 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((weekday) => (
            <span
              className="py-2 text-xs font-medium text-vitta-muted"
              key={weekday}
            >
              {weekday}
            </span>
          ))}
          {Array.from({ length: 42 }, (_, index) => {
            const cellDate = dateForCalendarCell(visibleMonth, index);
            const inMonth = cellDate.slice(0, 7) === visibleMonth.slice(0, 7);
            const isBlocked = blockedDateSet.has(cellDate);
            const isSelectable =
              inMonth &&
              cellDate >= minDate &&
              cellDate <= maxDate &&
              !isBlocked;

            if (!inMonth) {
              return <span aria-hidden="true" key={cellDate} />;
            }

            return (
              <button
                aria-label={`${cellDate}${isBlocked ? ", dia bloqueado" : ""}`}
                aria-pressed={date === cellDate}
                className={`aspect-square rounded-lg text-sm transition ${
                  isBlocked
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : !isSelectable
                      ? "cursor-not-allowed text-gray-300"
                      : date === cellDate
                        ? "bg-vitta font-semibold text-white"
                        : "text-vitta-text hover:bg-vitta-background"
                }`}
                disabled={!isSelectable}
                key={cellDate}
                onClick={() => setDate(cellDate)}
                type="button"
              >
                {Number(cellDate.slice(-2))}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-vitta-muted">
          Dias em cinza estão bloqueados ou fora do período disponível.
        </p>
      </section>

      <button
        className="w-full rounded-xl border border-vitta px-4 py-3 text-sm font-semibold text-vitta transition hover:bg-vitta/5"
        type="submit"
      >
        Consultar horários
      </button>
    </form>
  );
}
