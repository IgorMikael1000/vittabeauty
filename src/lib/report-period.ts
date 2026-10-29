import {
  getDateInTimezone,
  parseDateTimeInTimezone,
} from "./schedule";

export type ReportPeriod = {
  from: Date;
  to: Date;
  fromDate: string;
  toDate: string;
  error?: string;
};

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function nextCalendarDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return next.toISOString().slice(0, 10);
}

export function getReportPeriod(
  fromInput: string | undefined,
  toInput: string | undefined,
  timeZone: string,
  now: Date = new Date(),
): ReportPeriod {
  const today = getDateInTimezone(now, timeZone);
  const [year, month] = today.split("-");
  const defaultFrom = `${year}-${month}-01`;
  const defaultTo = new Date(
    Date.UTC(Number(year), Number(month), 0),
  )
    .toISOString()
    .slice(0, 10);
  const fromDate = fromInput ?? defaultFrom;
  const toDate = toInput ?? defaultTo;
  const from = isCalendarDate(fromDate)
    ? parseDateTimeInTimezone(`${fromDate}T00:00`, timeZone)
    : null;
  const endDate = isCalendarDate(toDate) ? nextCalendarDate(toDate) : null;
  const to = endDate
    ? parseDateTimeInTimezone(`${endDate}T00:00`, timeZone)
    : null;

  if (
    !from ||
    !to ||
    fromDate > toDate ||
    to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000
  ) {
    const defaultStart = parseDateTimeInTimezone(
      `${defaultFrom}T00:00`,
      timeZone,
    );
    const defaultEndDate = nextCalendarDate(defaultTo);
    const defaultEnd = parseDateTimeInTimezone(
      `${defaultEndDate}T00:00`,
      timeZone,
    );

    if (!defaultStart || !defaultEnd) {
      throw new Error(
        `Could not calculate the report period for timezone "${timeZone}".`,
      );
    }

    return {
      from: defaultStart,
      to: defaultEnd,
      fromDate: defaultFrom,
      toDate: defaultTo,
      error: "Período inválido. Exibindo os dados do mês atual.",
    };
  }

  return { from, to, fromDate, toDate };
}
