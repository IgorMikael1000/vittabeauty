const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export type WorkingHoursSlotRules = {
  startMinute: number;
  endMinute: number;
  interval: number;
  blockedSlots: string[];
};

export function isAvailableWorkingHoursSlot(
  startMinute: number,
  endMinute: number,
  rules: WorkingHoursSlotRules,
): boolean {
  if (
    rules.interval <= 0 ||
    startMinute < rules.startMinute ||
    endMinute > rules.endMinute ||
    (startMinute - rules.startMinute) % rules.interval !== 0
  ) {
    return false;
  }

  return !rules.blockedSlots.some((slot) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(slot);
    if (!match) return false;

    const blockedStart = Number(match[1]) * 60 + Number(match[2]);
    return blockedStart < endMinute && blockedStart + rules.interval > startMinute;
  });
}

export function parseDateTimeInTimezone(
  value: string,
  timeZone: string,
): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const parts = [yearText, monthText, dayText, hourText, minuteText].map(
    Number,
  );
  const [year, month, day, hour, minute] = parts;
  const requestedUtc = Date.UTC(year, month - 1, day, hour, minute);
  const requestedDate = new Date(requestedUtc);

  if (
    requestedDate.getUTCFullYear() !== year ||
    requestedDate.getUTCMonth() !== month - 1 ||
    requestedDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = requestedUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const formattedParts = formatter.formatToParts(new Date(timestamp));
    const values = Object.fromEntries(
      formattedParts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const representedUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
    );
    const adjustment = requestedUtc - representedUtc;

    timestamp += adjustment;

    if (adjustment === 0) {
      break;
    }
  }

  const result = new Date(timestamp);
  const verifiedParts = formatter.formatToParts(result);
  const verified = Object.fromEntries(
    verifiedParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  ) {
    return null;
  }

  return result;
}

export function getDateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getWeekdayInTimezone(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const index = weekdays.indexOf(weekday);

  if (index < 0) {
    throw new Error(`Could not determine weekday for timezone "${timeZone}".`);
  }

  return index;
}

export function getCalendarRange(
  dateText: string | undefined,
  view: string | undefined,
  timeZone: string,
): { start: Date; end: Date; view: "day" | "week" | "month"; date: string } {
  const date =
    dateText && /^\d{4}-\d{2}-\d{2}$/.test(dateText)
      ? parseDateTimeInTimezone(`${dateText}T12:00`, timeZone)
      : null;
  const selectedDate = date ?? new Date();
  const selectedText = getDateInTimezone(selectedDate, timeZone);
  const [year, month, day] = selectedText.split("-").map(Number);
  const selectedUtc = new Date(Date.UTC(year, month - 1, day));
  const selectedView =
    view === "week" || view === "month" ? view : "day";
  let first = selectedUtc;
  let afterLast = new Date(selectedUtc);

  if (selectedView === "week") {
    const weekday = getWeekdayInTimezone(selectedDate, timeZone);
    first = new Date(selectedUtc);
    first.setUTCDate(first.getUTCDate() - weekday);
    afterLast = new Date(first);
    afterLast.setUTCDate(afterLast.getUTCDate() + 7);
  } else if (selectedView === "month") {
    first = new Date(Date.UTC(year, month - 1, 1));
    afterLast = new Date(Date.UTC(year, month, 1));
  } else {
    afterLast.setUTCDate(afterLast.getUTCDate() + 1);
  }

  const toLocalDateTime = (value: Date): string =>
    `${value.toISOString().slice(0, 10)}T${value
      .toISOString()
      .slice(11, 16)}`;
  const start = parseDateTimeInTimezone(
    toLocalDateTime(first),
    timeZone,
  );
  const end = parseDateTimeInTimezone(
    toLocalDateTime(afterLast),
    timeZone,
  );

  if (!start || !end) {
    throw new Error(`Could not calculate calendar range for "${timeZone}".`);
  }

  return {
    start,
    end,
    view: selectedView,
    date: selectedText,
  };
}

export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
