import type { MetadataRoute } from "next";

function getPublicOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredOrigin) {
    throw new Error("NEXT_PUBLIC_APP_URL is required to generate the sitemap.");
  }

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

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicOrigin();

  return ["/", "/login", "/cadastro"].map((path) => ({
    url: new URL(path, origin).toString(),
  }));
}
