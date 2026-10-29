import { afterEach, describe, expect, it } from "vitest";
import {
  getLiveModeDepositMaximumCents,
  toDepositCents,
} from "./mercadopago-live-deposit-limit";

const originalMaximum = process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT;

afterEach(() => {
  if (originalMaximum === undefined) {
    delete process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT;
  } else {
    process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT = originalMaximum;
  }
});

describe("Mercado Pago live deposit limit", () => {
  it("parses a positive amount into integer cents", () => {
    process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT = "1.00";

    expect(getLiveModeDepositMaximumCents()).toBe(100);
    expect(toDepositCents(1)).toBe(100);
  });

  it("rejects missing, invalid, and non-positive limits", () => {
    delete process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT;
    expect(getLiveModeDepositMaximumCents()).toBeNull();

    process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT = "0";
    expect(getLiveModeDepositMaximumCents()).toBeNull();

    process.env.MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT = "1,00";
    expect(getLiveModeDepositMaximumCents()).toBeNull();
  });
});
