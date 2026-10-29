import { describe, expect, it } from "vitest";
import { getReportPeriod } from "./report-period";

describe("getReportPeriod", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  const timeZone = "America/Sao_Paulo";

  it("defaults to the first and last day of the current month", () => {
    expect(getReportPeriod(undefined, undefined, timeZone, now)).toEqual({
      from: new Date("2026-06-01T03:00:00.000Z"),
      to: new Date("2026-07-01T03:00:00.000Z"),
      fromDate: "2026-06-01",
      toDate: "2026-06-30",
    });
  });

  it("keeps explicitly selected date bounds", () => {
    const period = getReportPeriod("2026-05-10", "2026-05-20", timeZone, now);

    expect(period.fromDate).toBe("2026-05-10");
    expect(period.toDate).toBe("2026-05-20");
    expect(period.from).toEqual(new Date("2026-05-10T03:00:00.000Z"));
    expect(period.to).toEqual(new Date("2026-05-21T03:00:00.000Z"));
  });

  it("falls back to the full current month when the range is invalid", () => {
    const period = getReportPeriod("invalid", undefined, timeZone, now);

    expect(period.fromDate).toBe("2026-06-01");
    expect(period.toDate).toBe("2026-06-30");
    expect(period.from).toEqual(new Date("2026-06-01T03:00:00.000Z"));
    expect(period.to).toEqual(new Date("2026-07-01T03:00:00.000Z"));
    expect(period.error).toBeDefined();
  });
});
