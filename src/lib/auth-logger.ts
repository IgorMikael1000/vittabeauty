type AuthLogDetails = {
  outcome?: "started" | "success" | "rejected" | "failed";
  provider?: string;
  code?: string;
  correlationId?: string;
};

export function logAuthEvent(
  event: string,
  details: AuthLogDetails = {},
): void {
  console.info(
    "[vitta-auth]",
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
}
