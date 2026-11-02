"use client";

import { Analytics } from "@vercel/analytics/next";
import { sanitizeVercelAnalyticsEvent } from "@/lib/vercel-analytics";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) =>
        sanitizeVercelAnalyticsEvent(event, window.location.origin)
      }
    />
  );
}
