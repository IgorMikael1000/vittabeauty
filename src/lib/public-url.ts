import "server-only";
import { headers } from "next/headers";

async function getPublicOrigin(): Promise<string> {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    let url: URL;

    try {
      url = new URL(configuredOrigin);
    } catch {
      throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must use HTTP or HTTPS and must not contain credentials.",
      );
    }

    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
    }

    return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Configure NEXT_PUBLIC_APP_URL with the public HTTPS origin before using the booking link in production.",
    );
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost ?? requestHeaders.get("host"))
    ?.split(",")[0]
    ?.trim();

  if (!host || /[/\\@\s]/.test(host)) {
    throw new Error(
      "Could not determine the public application URL. Configure NEXT_PUBLIC_APP_URL.",
    );
  }

  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "https" ? "https" : "http";

  return new URL(`${protocol}://${host}`).origin;
}

export async function getPublicBookingUrl(slug: string): Promise<string> {
  const origin = await getPublicOrigin();

  return new URL(`/agendar/${encodeURIComponent(slug)}`, origin).toString();
}
