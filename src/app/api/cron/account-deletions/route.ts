import { timingSafeEqual } from "node:crypto";
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
    console.error("[account-deletion] CRON_SECRET is not configured.");
    return Response.json(
      { error: "Cron authentication is not configured." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processPendingAccountDeletions();
    return Response.json(result);
  } catch (error) {
    console.error("[account-deletion] Worker run failed.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return Response.json(
      { error: "Account deletion worker failed." },
      { status: 500 },
    );
  }
}
