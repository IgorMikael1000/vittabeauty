import { describe, expect, it } from "vitest";
import { getAccountDeletionRetryDelayMs } from "./account-deletion-retry";

describe("getAccountDeletionRetryDelayMs", () => {
  it("uses exponential retries capped at 24 hours", () => {
    expect(getAccountDeletionRetryDelayMs(1)).toBe(60_000);
    expect(getAccountDeletionRetryDelayMs(2)).toBe(120_000);
    expect(getAccountDeletionRetryDelayMs(3)).toBe(240_000);
    expect(getAccountDeletionRetryDelayMs(12)).toBe(24 * 60 * 60 * 1000);
    expect(getAccountDeletionRetryDelayMs(20)).toBe(24 * 60 * 60 * 1000);
  });
});
