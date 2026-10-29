import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RequestRateLimitPolicy = "login" | "registration" | "public-booking";

const policies: Record<
  RequestRateLimitPolicy,
  { requests: number; window: "10 m" | "1 h" }
> = {
  login: { requests: 10, window: "10 m" },
  registration: { requests: 5, window: "1 h" },
  "public-booking": { requests: 10, window: "10 m" },
};

const limiters = new Map<RequestRateLimitPolicy, Ratelimit>();
let redis: Redis | undefined;

export class RequestRateLimitUnavailableError extends Error {
  constructor() {
    super("Request rate limiting is unavailable.");
    this.name = "RequestRateLimitUnavailableError";
  }
}

function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new RequestRateLimitUnavailableError();
  }

  if (!redis) {
    redis = new Redis({ url, token });
  }
  return redis;
}

function getLimiter(policy: RequestRateLimitPolicy): Ratelimit {
  const cached = limiters.get(policy);
  if (cached) return cached;

  const configuration = policies[policy];
  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(
      configuration.requests,
      configuration.window,
    ),
    prefix: `vitta:request-limit:${policy}`,
    analytics: false,
  });
  limiters.set(policy, limiter);
  return limiter;
}

function getClientAddress(headersList: Headers): string | null {
  const realIp = headersList.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = headersList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}

export async function checkRequestRateLimit(
  policy: RequestRateLimitPolicy,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const headersList = await headers();
  const clientAddress = getClientAddress(headersList);
  if (!clientAddress) {
    console.error("[request-rate-limit] Client address is unavailable.", {
      policy,
    });
    throw new RequestRateLimitUnavailableError();
  }

  const addressHash = createHash("sha256")
    .update(clientAddress)
    .digest("hex");

  try {
    const result = await getLimiter(policy).limit(addressHash);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    console.error("[request-rate-limit] Backend request failed.", {
      policy,
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    throw new RequestRateLimitUnavailableError();
  }
}
