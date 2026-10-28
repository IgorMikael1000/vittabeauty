"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
};

export function PasswordInput({
  id,
  label,
  name,
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
  maxLength,
  disabled = false,
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-vitta-text" htmlFor={id}>
        {label}
      </label>
      <span className="relative mt-2 block">
        <input
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 pr-14 text-vitta-text outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          required={required}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-xl text-vitta-muted transition hover:bg-vitta-background hover:text-vitta disabled:cursor-not-allowed"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Eye aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </span>
    </div>
  );
}
