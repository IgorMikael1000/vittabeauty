import { describe, expect, it } from "vitest";
import { decimalToCents, sumMoneyCents } from "./money";

describe("decimalToCents", () => {
  it.each([
    ["0", 0],
    ["19.9", 1990],
    ["19.90", 1990],
    ["-3.05", -305],
    ["120", 12000],
  ])("converts %s to integer cents", (amount, expected) => {
    expect(decimalToCents(amount)).toBe(expected);
  });

  it("accepts decimal-like values", () => {
    expect(decimalToCents({ toString: () => "42.17" })).toBe(4217);
  });

  it.each(["", "1.234", "1.2.3", "abc", " 1.00", "1e2"])(
    "rejects invalid monetary decimal %j",
    (amount) => {
      expect(() => decimalToCents(amount)).toThrow(
        `Invalid monetary decimal "${amount}".`,
      );
    },
  );

  it("rejects amounts exceeding safe integer precision", () => {
    expect(() => decimalToCents("90071992547410.00")).toThrow(
      "Monetary amount exceeds the supported precision.",
    );
  });
});

describe("sumMoneyCents", () => {
  it("sums decimal-like amounts without floating-point rounding", () => {
    expect(
      sumMoneyCents([
        { amount: { toString: () => "0.10" } },
        { amount: { toString: () => "0.20" } },
        { amount: { toString: () => "-0.05" } },
      ]),
    ).toBe(25);
  });

  it("returns zero for an empty list", () => {
    expect(sumMoneyCents([])).toBe(0);
  });
});
