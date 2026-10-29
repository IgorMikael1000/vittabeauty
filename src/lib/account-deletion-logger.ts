type AccountDeletionOutcome =
  | "started"
  | "success"
  | "failed"
  | "rejected"
  | "skipped";

type AccountDeletionLogDetails = {
  outcome: AccountDeletionOutcome;
  stage?: string;
  code?: string;
  correlationId?: string;
  attempt?: number;
  retryAt?: string;
  processed?: number;
  completed?: number;
  failed?: number;
  skipped?: number;
  durationMs?: number;
  failedStage?: string;
  errorName?: string;
  errorCode?: string;
  errorMessage?: string;
};

function redactErrorMessage(message: string): string {
  return message
    .replace(
      /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'`]+/gi,
      "$1://[REDACTED]",
    )
    .replace(/\bhttps?:\/\/[^\s"'`]+/gi, "[REDACTED_URL]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b(password|secret|token|api[_-]?key)\s*[=:]\s*(['"]?)[^\s,;}'"]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[REDACTED_EMAIL]",
    )
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[REDACTED_CPF]")
    .slice(0, 500);
}

export function getAccountDeletionErrorDetails(error: unknown): {
  errorName: string;
  errorCode: string;
  errorMessage: string;
} {
  const errorName =
    error instanceof Error && /^[A-Za-z0-9_]{1,80}$/.test(error.name)
      ? error.name
      : "UnknownError";
  const rawCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "UNKNOWN_ERROR";
  const rawMessage =
    error instanceof Error ? error.message : "A non-Error value was thrown.";

  return {
    errorName,
    errorCode: /^[A-Za-z0-9_/-]{1,80}$/.test(rawCode)
      ? rawCode
      : "UNKNOWN_ERROR",
    errorMessage: redactErrorMessage(rawMessage) || "No error message.",
  };
}

export function logAccountDeletionEvent(
  event: string,
  details: AccountDeletionLogDetails,
): void {
  const line = `[account-deletion] ${JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...details,
  })}`;

  if (details.outcome === "failed") {
    console.error(line);
  } else if (details.outcome === "rejected") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
