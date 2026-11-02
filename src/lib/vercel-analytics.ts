import type { BeforeSendEvent } from "@vercel/analytics/next";

export function sanitizeVercelAnalyticsEvent(
  event: BeforeSendEvent,
  origin: string,
): BeforeSendEvent {
  const url = new URL(event.url, origin);
  url.search = "";
  url.hash = "";

  if (/^\/agendar\/[^/]+\/?$/.test(url.pathname)) {
    url.pathname = "/agendar/[slug]";
  }

  return { ...event, url: url.toString() };
}
