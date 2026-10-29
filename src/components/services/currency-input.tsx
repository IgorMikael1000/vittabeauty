"use client";

import { useState } from "react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function toCents(value: string | number | undefined): number {
  if (value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function CurrencyInput({
  name,
  defaultValue,
  disabled = false,
  required = false,
  className,
}: {
  name: string;
  defaultValue?: string | number;
  disabled?: boolean;
  required?: boolean;
  className: string;
}) {
  const [cents, setCents] = useState(() => toCents(defaultValue));

  function updateValue(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setCents(digits ? Number(digits) : 0);
  }

  return (
    <>
      <input
        aria-label={name === "price" ? "Preço em reais" : "Valor do sinal em reais"}
        className={className}
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => updateValue(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        required={required}
        type="text"
        value={currency.format(cents / 100)}
      />
      <input name={name} type="hidden" value={centsToInputValue(cents)} />
    </>
  );
}
