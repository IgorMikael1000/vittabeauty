import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vitta Beauty",
    template: "%s | Vitta Beauty",
  },
  description: "Gestão simples e acolhedora para profissionais da beleza.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-vitta-border px-6 py-4 text-center text-xs text-vitta-muted">
          Desenvolvido pela I&amp;T Solutions
        </footer>
      </body>
    </html>
  );
}
