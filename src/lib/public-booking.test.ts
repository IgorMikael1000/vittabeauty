import { describe, expect, it } from "vitest";
import {
  buildAvailableSlots,
  getDayBounds,
  isValidBookingDate,
} from "./public-booking";

const now = new Date("2026-06-14T00:00:00.000Z");
const workingHours = {
  weekday: 1,
  startMinute: 9 * 60,
  endMinute: 12 * 60,
  interval: 30,
  blockedSlots: [] as string[],
  isActive: true,
};

function buildSlots(
  overrides: Partial<Parameters<typeof buildAvailableSlots>[0]> = {},
) {
  return buildAvailableSlots({
    date: "2026-06-15",
    timeZone: "UTC",
    durationMinutes: 60,
    workingHours,
    appointments: [],
    blocks: [],
    now,
    ...overrides,
  });
}

describe("buildAvailableSlots", () => {
  it("generates time slots at the configured interval", () => {
    expect(buildSlots().map((slot) => slot.value)).toEqual([
      "2026-06-15T09:00",
      "2026-06-15T09:30",
      "2026-06-15T10:00",
      "2026-06-15T10:30",
      "2026-06-15T11:00",
    ]);
  });

  it("excludes slots overlapping recurring blocked hours", () => {
    const slots = buildSlots({
      workingHours: { ...workingHours, blockedSlots: ["09:30"] },
    });

    expect(slots.map((slot) => slot.value)).toEqual([
      "2026-06-15T10:00",
      "2026-06-15T10:30",
      "2026-06-15T11:00",
    ]);
  });

  it("excludes slots overlapping appointments and calendar blocks", () => {
    const slots = buildSlots({
      appointments: [
        {
          startsAt: new Date("2026-06-15T10:15:00.000Z"),
          endsAt: new Date("2026-06-15T10:45:00.000Z"),
        },
      ],
      blocks: [
        {
          startsAt: new Date("2026-06-15T11:00:00.000Z"),
          endsAt: new Date("2026-06-15T11:30:00.000Z"),
        },
      ],
    });

    expect(slots.map((slot) => slot.value)).toEqual(["2026-06-15T09:00"]);
  });

  it("returns no slots when the day is inactive or does not match the weekday", () => {
    expect(
      buildSlots({
        workingHours: { ...workingHours, isActive: false },
      }),
    ).toEqual([]);
    expect(buildSlots({ date: "2026-06-16" })).toEqual([]);
  });

  it("returns no slots for invalid dates, past times, or invalid durations", () => {
    expect(buildSlots({ date: "2026-02-30" })).toEqual([]);
    expect(
      buildSlots({ now: new Date("2026-06-15T10:00:00.000Z") }).map(
        (slot) => slot.value,
      ),
    ).toEqual(["2026-06-15T10:30", "2026-06-15T11:00"]);
    expect(buildSlots({ durationMinutes: 0 })).toEqual([]);
    expect(buildSlots({ durationMinutes: 181 })).toEqual([]);
  });
});

describe("booking date helpers", () => {
  it("accepts dates from today through 90 days ahead", () => {
    const fixedNow = new Date("2026-06-15T12:00:00.000Z");

    expect(isValidBookingDate("2026-06-15", "UTC", fixedNow)).toBe(true);
    expect(isValidBookingDate("2026-09-13", "UTC", fixedNow)).toBe(true);
    expect(isValidBookingDate("2026-09-14", "UTC", fixedNow)).toBe(false);
    expect(isValidBookingDate("2026-06-14", "UTC", fixedNow)).toBe(false);
    expect(isValidBookingDate("invalid", "UTC", fixedNow)).toBe(false);
  });

  it("calculates timezone-aware day bounds", () => {
    expect(getDayBounds("2026-06-15", "America/Sao_Paulo")).toEqual({
      start: new Date("2026-06-15T03:00:00.000Z"),
      end: new Date("2026-06-16T03:00:00.000Z"),
    });
  });
});
