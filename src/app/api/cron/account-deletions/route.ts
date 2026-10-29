import { timingSafeEqual } from "node:crypto";
import {
  getAccountDeletionErrorDetails,
  logAccountDeletionEvent,
} from "@/lib/account-deletion-logger";
import { processPendingAccountDeletions } from "@/lib/account-deletion-worker";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) {
    logAccountDeletionEvent("cron.configuration_failed", {
      outcome: "failed",
      stage: "cron_authentication",
      code: "CRON_SECRET_NOT_CONFIGURED",
    });
    return Response.json(
      { error: "Cron authentication is not configured." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    logAccountDeletionEvent("cron.request_rejected", {
      outcome: "rejected",
      stage: "cron_authentication",
      code: "UNAUTHORIZED",
    });
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  logAccountDeletionEvent("cron.started", {
    outcome: "started",
    stage: "worker_start",
  });
  try {
    const result = await processPendingAccountDeletions();
    logAccountDeletionEvent("cron.completed", {
      outcome: "success",
      stage: "worker_complete",
      ...result,
      durationMs: Date.now() - startedAt,
    });
    return Response.json(result);
  } catch (error) {
    logAccountDeletionEvent("cron.failed", {
      outcome: "failed",
      stage: "worker_execution",
      durationMs: Date.now() - startedAt,
      ...getAccountDeletionErrorDetails(error),
    });
    return Response.json(
      { error: "Account deletion worker failed." },
      { status: 500 },
    );
  }
}
