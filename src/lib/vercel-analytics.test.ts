import { describe, expect, it } from "vitest";
import { sanitizeVercelAnalyticsEvent } from "./vercel-analytics";

describe("sanitizeVercelAnalyticsEvent", () => {
  it("removes booking slugs and query data from page views", () => {
    const event = sanitizeVercelAnalyticsEvent(
      {
        type: "pageview",
        url: "https://vittabeauty.vercel.app/agendar/maria-silva?appointmentId=secret&email=client%40example.com#pix",
      },
      "https://vittabeauty.vercel.app",
    );
    const url = new URL(event.url);

    expect(url.pathname).toBe("/agendar/[slug]");
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });

  it("removes query data and preserves normal routes and event types", () => {
    const event = sanitizeVercelAnalyticsEvent(
      {
        type: "event",
        url: "/login?email=client%40example.com",
      },
      "https://vittabeauty.vercel.app",
    );

    expect(event).toEqual({
      type: "event",
      url: "https://vittabeauty.vercel.app/login",
    });
  });
});
