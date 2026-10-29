const retryBaseMs = 60_000;
const retryMaximumMs = 24 * 60 * 60 * 1000;

export function getAccountDeletionRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(Math.floor(attempt) - 1, 11));
  return Math.min(retryBaseMs * 2 ** exponent, retryMaximumMs);
}
