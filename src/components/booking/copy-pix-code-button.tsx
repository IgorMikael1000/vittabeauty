"use client";

import { useState } from "react";

export function CopyPixCodeButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError(false);
    } catch {
      setCopied(false);
      setError(true);
    }
  }

  return (
    <div>
      <button
        className="rounded-lg bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90"
        onClick={copyCode}
        type="button"
      >
        {copied ? "Pix copiado!" : "Copiar código Pix"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          Não foi possível copiar. Selecione e copie o código acima.
        </p>
      )}
    </div>
  );
}
