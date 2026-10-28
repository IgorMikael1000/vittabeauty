import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vitta Beauty",
    template: "%s | Vitta Beauty",
  },
  applicationName: "Vitta Beauty",
  description: "Gestão simples e acolhedora para profissionais da beleza.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/vitta-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/vitta-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/vitta-apple-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Vitta Beauty",
    statusBarStyle: "default",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#7950A5",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegistration />
        <main className="flex flex-1 flex-col">{children}</main>
        <Suspense fallback={null}>
          <InstallPrompt />
        </Suspense>
        <footer className="border-t border-vitta-border px-6 py-4 text-center text-xs text-vitta-muted">
          Desenvolvido pela{" "}
          <a
            className="font-medium text-vitta transition hover:text-vitta/75 hover:underline"
            href="https://siteitsolutions.onrender.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            I&amp;T Solutions
          </a>
        </footer>
      </body>
    </html>
  );
}
