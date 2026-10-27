"use client";

import { useState } from "react";

export function CopyBookingLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Selecione e copie o link.");
    }
  }

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Olá! Agende seu horário comigo: ${url}`,
  )}`;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-vitta-text" htmlFor="booking-link">
        Seu link exclusivo
      </label>
      <input
        className="w-full rounded-xl border border-vitta-border bg-vitta-background px-4 py-3 text-sm text-vitta-text outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
        id="booking-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90"
          onClick={copyLink}
          type="button"
        >
          Copiar link
        </button>
        <a
          className="rounded-xl border border-vitta-border px-4 py-2.5 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
          href={shareUrl}
          rel="noreferrer"
          target="_blank"
        >
          Compartilhar pelo WhatsApp
        </a>
        <a
          className="rounded-xl border border-vitta-border px-4 py-2.5 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Abrir página pública
        </a>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-vitta-muted">
        {message}
      </p>
    </div>
  );
}
