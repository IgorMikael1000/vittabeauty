"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  updatePasswordAction,
  verifyCurrentPasswordAction,
} from "@/app/actions/account";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
import { getPasswordRequirements } from "@/lib/professional-validation";

const initialState: FormState = {};

function PasswordInput({
  id,
  label,
  name,
  onChange,
  value,
}: {
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        className="block text-sm font-medium text-vitta-text"
        htmlFor={id}
      >
        {label}
      </label>
      <span className="relative mt-2 block">
        <input
          autoComplete="new-password"
          className="w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 pr-14 text-vitta-text outline-none transition"
          id={id}
          maxLength={72}
          name={name}
          onChange={(event) => onChange(event.currentTarget.value)}
          required
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-xl text-vitta-muted transition hover:bg-vitta-background hover:text-vitta"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="M3 3l18 18M10.58 10.59a2 2 0 0 0 2.83 2.82M9.88 5.09A10.94 10.94 0 0 1 12 4.9c5 0 9 4.1 10 7.1a11.8 11.8 0 0 1-3.07 4.55M6.61 6.62A12.08 12.08 0 0 0 2 12c1 3 5 7.1 10 7.1 1.02 0 1.99-.19 2.88-.53" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </div>
  );
}

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [verifyState, setVerifyState] = useState<FormState>(initialState);
  const [updateState, setUpdateState] = useState<FormState>(initialState);
  const [pending, startTransition] = useTransition();
  const verified = unlocked;
  const requirements = getPasswordRequirements(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  function verifyCurrentPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setUpdateState(initialState);

    startTransition(async () => {
      const result = await verifyCurrentPasswordAction(verifyState, formData);
      setVerifyState(result);
      if (result.success) {
        setUnlocked(true);
      }
    });
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("currentPassword", currentPassword);

    startTransition(async () => {
      const result = await updatePasswordAction(updateState, formData);
      setUpdateState(result);
      if (result.success) {
        setUnlocked(false);
        setVerifyState(initialState);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="space-y-5">
      <FormFeedback state={updateState} />

      {!verified ? (
        <form className="space-y-5" onSubmit={verifyCurrentPassword}>
          <label className="block text-sm font-medium text-vitta-text">
            Senha Atual
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
              maxLength={72}
              name="currentPassword"
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>
          <FormFeedback state={verifyState} />
          <button
            className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-44"
            disabled={pending}
            type="submit"
          >
            {pending ? "Verificando..." : "Verificar"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={updatePassword}
        >
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Senha atual confirmada. Agora você pode criar uma nova senha.
          </div>

          <PasswordInput
            id="new-password"
            label="Nova Senha"
            name="newPassword"
            onChange={setNewPassword}
            value={newPassword}
          />
          <ul aria-live="polite" className="grid gap-2 text-xs sm:grid-cols-2">
            {requirements.map((requirement) => (
              <li
                className={`flex items-center gap-2 ${
                  requirement.met ? "text-emerald-700" : "text-vitta-muted"
                }`}
                key={requirement.label}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    requirement.met
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#f0edf2] text-vitta-muted"
                  }`}
                >
                  {requirement.met ? "✓" : "·"}
                </span>
                {requirement.label}
              </li>
            ))}
          </ul>

          <div>
            <PasswordInput
              id="confirm-new-password"
              label="Confirmar Nova Senha"
              name="confirmPassword"
              onChange={setConfirmPassword}
              value={confirmPassword}
            />
            {confirmPassword && (
              <p
                className={`mt-2 text-xs ${
                  passwordsMatch ? "text-emerald-700" : "text-rose-700"
                }`}
                role="status"
              >
                {passwordsMatch
                  ? "As senhas coincidem."
                  : "As senhas ainda não coincidem."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-2xl border border-vitta-border bg-white px-5 py-3.5 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
              onClick={() => {
                setUnlocked(false);
                setVerifyState(initialState);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              type="button"
            >
              Recomeçar verificação
            </button>
            <button
              className="rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                pending ||
                requirements.some((requirement) => !requirement.met) ||
                !passwordsMatch
              }
              type="submit"
            >
              {pending ? "Atualizando..." : "Atualizar Senha"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
