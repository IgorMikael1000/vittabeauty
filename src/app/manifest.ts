import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitta Beauty",
    short_name: "Vitta Beauty",
    description: "Gestão simples e acolhedora para profissionais da beleza.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F8F5FA",
    theme_color: "#7950A5",
    icons: [
      {
        src: "/icons/vitta-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vitta-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vitta-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
