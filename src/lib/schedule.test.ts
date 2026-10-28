import { describe, expect, it } from "vitest";
import {
  getDateInTimezone,
  getWeekdayInTimezone,
  isAvailableWorkingHoursSlot,
  parseDateTimeInTimezone,
} from "./schedule";

const workingHours = {
  startMinute: 9 * 60,
  endMinute: 17 * 60,
  interval: 30,
  blockedSlots: [] as string[],
};

describe("isAvailableWorkingHoursSlot", () => {
  it("accepts a slot aligned with the working hours interval", () => {
    expect(
      isAvailableWorkingHoursSlot(9 * 60, 9 * 60 + 30, workingHours),
    ).toBe(true);
  });

  it.each([
    ["starts before opening", 8 * 60 + 30, 9 * 60],
    ["ends after closing", 16 * 60 + 30, 17 * 60 + 30],
    ["does not align with the interval", 9 * 60 + 15, 9 * 60 + 45],
    ["has a non-positive interval", 9 * 60, 9 * 60 + 30],
  ])("rejects a slot that %s", (_description, startMinute, endMinute) => {
    const rules =
      _description === "has a non-positive interval"
        ? { ...workingHours, interval: 0 }
        : workingHours;

    expect(
      isAvailableWorkingHoursSlot(
        Number(startMinute),
        Number(endMinute),
        rules,
      ),
    ).toBe(false);
  });

  it("rejects a slot that overlaps a blocked interval", () => {
    expect(
      isAvailableWorkingHoursSlot(11 * 60 + 30, 12 * 60 + 30, {
        ...workingHours,
        blockedSlots: ["12:00"],
      }),
    ).toBe(false);
  });

  it("allows a slot adjacent to a blocked interval", () => {
    expect(
      isAvailableWorkingHoursSlot(11 * 60 + 30, 12 * 60, {
        ...workingHours,
        blockedSlots: ["12:00"],
      }),
    ).toBe(true);
  });

  it("ignores malformed blocked slot values", () => {
    expect(
      isAvailableWorkingHoursSlot(11 * 60 + 30, 12 * 60, {
        ...workingHours,
        blockedSlots: ["12:60", "invalid"],
      }),
    ).toBe(true);
  });
});

describe("timezone helpers", () => {
  it("converts local date and time to the expected instant", () => {
    expect(
      parseDateTimeInTimezone("2026-06-15T09:30", "America/Sao_Paulo"),
    ).toEqual(new Date("2026-06-15T12:30:00.000Z"));
  });

  it.each(["2026-02-30T10:00", "2026-06-15 10:00", "2026-06-15T24:00"])(
    "rejects an invalid local date-time: %s",
    (value) => {
      expect(parseDateTimeInTimezone(value, "UTC")).toBeNull();
    },
  );

  it("rejects a local time skipped by a daylight-saving transition", () => {
    expect(
      parseDateTimeInTimezone("2024-03-10T02:30", "America/New_York"),
    ).toBeNull();
  });

  it("returns the date and weekday in the requested timezone", () => {
    const instant = new Date("2026-06-15T01:00:00.000Z");

    expect(getDateInTimezone(instant, "America/Sao_Paulo")).toBe("2026-06-14");
    expect(getWeekdayInTimezone(instant, "America/Sao_Paulo")).toBe(0);
    expect(getDateInTimezone(instant, "UTC")).toBe("2026-06-15");
  });
});
