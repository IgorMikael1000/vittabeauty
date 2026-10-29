import {
  getDateInTimezone,
  getWeekdayInTimezone,
  isAvailableWorkingHoursSlot,
  parseDateTimeInTimezone,
} from "./schedule";

export type AvailableSlot = {
  value: string;
  startsAt: Date;
  endsAt: Date;
};

type BookingHours = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  interval: number;
  blockedSlots: string[];
  isActive: boolean;
};

type BusyPeriod = {
  startsAt: Date;
  endsAt: Date;
};

export function isValidBookingDate(
  date: string,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const dayStart = parseDateTimeInTimezone(`${date}T12:00`, timeZone);
  if (!dayStart || getDateInTimezone(dayStart, timeZone) !== date) {
    return false;
  }

  const todayText = getDateInTimezone(now, timeZone);
  const [year, month, day] = todayText.split("-").map(Number);
  const lastDate = new Date(Date.UTC(year, month - 1, day + 90))
    .toISOString()
    .slice(0, 10);

  return date >= todayText && date <= lastDate;
}

export function getDayBounds(
  date: string,
  timeZone: string,
): { start: Date; end: Date } | null {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  const start = parseDateTimeInTimezone(`${date}T00:00`, timeZone);
  const end = parseDateTimeInTimezone(`${nextDate}T00:00`, timeZone);

  return start && end ? { start, end } : null;
}

export function getFutureCalendarBlockBounds(
  date: string,
  timeZone: string,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const localNoon = parseDateTimeInTimezone(`${date}T12:00`, timeZone);
  const bounds = getDayBounds(date, timeZone);

  if (
    !localNoon ||
    getDateInTimezone(localNoon, timeZone) !== date ||
    !bounds ||
    bounds.start <= now
  ) {
    return null;
  }

  return bounds;
}

function getMinuteOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return values.hour * 60 + values.minute;
}

export function buildAvailableSlots({
  date,
  timeZone,
  durationMinutes,
  workingHours,
  appointments,
  blocks,
  now = new Date(),
}: {
  date: string;
  timeZone: string;
  durationMinutes: number;
  workingHours: BookingHours | null;
  appointments: BusyPeriod[];
  blocks: BusyPeriod[];
  now?: Date;
}): AvailableSlot[] {
  if (
    !workingHours?.isActive ||
    durationMinutes <= 0 ||
    !isValidBookingDate(date, timeZone, now)
  ) {
    return [];
  }

  const noon = parseDateTimeInTimezone(`${date}T12:00`, timeZone);
  if (!noon || getWeekdayInTimezone(noon, timeZone) !== workingHours.weekday) {
    return [];
  }

  const busyPeriods = [...appointments, ...blocks];
  const slots: AvailableSlot[] = [];

  for (
    let startMinute = workingHours.startMinute;
    startMinute + durationMinutes <= workingHours.endMinute;
    startMinute += workingHours.interval
  ) {
    const hour = Math.floor(startMinute / 60)
      .toString()
      .padStart(2, "0");
    const minute = (startMinute % 60).toString().padStart(2, "0");
    const value = `${date}T${hour}:${minute}`;
    const startsAt = parseDateTimeInTimezone(value, timeZone);

    if (!startsAt || startsAt <= now) {
      continue;
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    if (
      getDateInTimezone(endsAt, timeZone) !== date ||
      getMinuteOfDay(endsAt, timeZone) > workingHours.endMinute ||
      !isAvailableWorkingHoursSlot(startMinute, startMinute + durationMinutes, workingHours) ||
      busyPeriods.some(
        (period) => period.startsAt < endsAt && period.endsAt > startsAt,
      )
    ) {
      continue;
    }

    slots.push({ value, startsAt, endsAt });
  }

  return slots;
}
