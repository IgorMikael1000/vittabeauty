import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();

  return ["/", "/sobre", "/termos"].map((path) => ({
    url: new URL(path, origin).toString(),
  }));
}
