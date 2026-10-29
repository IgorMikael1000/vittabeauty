const LIVE_DEPOSIT_MAX_AMOUNT_ENV =
  "MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT";

export function getLiveModeDepositMaximumCents(): number | null {
  const configuredAmount = process.env[LIVE_DEPOSIT_MAX_AMOUNT_ENV];
  if (!configuredAmount || !/^\d{1,8}(?:\.\d{1,2})?$/.test(configuredAmount)) {
    return null;
  }

  const amount = Number(configuredAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function toDepositCents(amount: number): number {
  return Math.round(amount * 100);
}
