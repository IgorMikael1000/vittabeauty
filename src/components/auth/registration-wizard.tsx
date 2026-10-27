"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { registerAction, type FormState } from "@/app/actions/auth";
import {
  formatBrazilianPhone,
  formatCpf,
  getPasswordRequirements,
  hasValidProfessionalName,
  isValidCpf,
} from "@/lib/professional-validation";

type RegistrationDetails = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  specialty: string;
};

const initialDetails: RegistrationDetails = {
  name: "",
  email: "",
  cpf: "",
  phone: "",
  specialty: "",
};

const initialState: FormState = {};

export function RegistrationWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState(initialDetails);
  const [nameError, setNameError] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const passwordRequirements = getPasswordRequirements(password);

  function updateDetail<K extends keyof RegistrationDetails>(
    key: K,
    value: RegistrationDetails[K],
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function continueToPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasValidProfessionalName(details.name)) {
      setNameError(
        "Informe pelo menos duas palavras — pode ser seu nome, o nome do negócio ou ambos.",
      );
      return;
    }

    setNameError("");
    if (!isValidCpf(details.cpf)) {
      setCpfError("Confira os números: este CPF não parece válido.");
      return;
    }

    setCpfError("");
    setStep(2);
  }

  return (
    <section className="w-full max-w-xl rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <header className="mb-8 text-center">
        <div className="relative mx-auto mb-2 h-[150px] w-[280px] max-w-full overflow-hidden">
          <Image
            alt="Vitta Beauty"
            className="absolute left-1/2 top-1/2 h-[250px] w-[375px] max-w-none -translate-x-1/2 -translate-y-[40%]"
            height={408}
            priority
            src="/brand/logo_vitta.png"
            width={612}
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vitta/75">
          Seu espaço profissional
        </p>
        <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.04em] text-vitta-text">
          {step === 1 ? "Vamos conhecer seu negócio" : "Proteja sua conta"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-vitta-muted">
          {step === 1
            ? "Conte um pouco sobre você e o seu espaço de beleza."
            : "Crie uma senha forte para manter seus dados seguros."}
        </p>

        <ol
          aria-label="Etapas do cadastro"
          className="mx-auto mt-6 flex max-w-xs items-center"
        >
          <li
            aria-current={step === 1 ? "step" : undefined}
            className="flex items-center gap-2 text-xs font-semibold text-vitta"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vitta text-white">
              {step === 1 ? "1" : "✓"}
            </span>
            Seu negócio
          </li>
          <span aria-hidden="true" className="mx-3 h-px flex-1 bg-vitta-border" />
          <li
            aria-current={step === 2 ? "step" : undefined}
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === 2 ? "text-vitta" : "text-vitta-muted"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === 2
                  ? "bg-vitta text-white"
                  : "border border-vitta-border bg-white"
              }`}
            >
              2
            </span>
            Sua senha
          </li>
        </ol>
      </header>

      {step === 1 ? (
        <form className="space-y-5 text-left" onSubmit={continueToPassword}>
          <label className="block text-sm font-medium text-vitta-text">
            Nome profissional ou do negócio
            <input
              autoComplete="organization"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
              maxLength={80}
              name="name"
              onChange={(event) => {
                updateDetail("name", event.currentTarget.value);
                setNameError("");
              }}
              placeholder="Ex.: Ana HairStudio ou Ana Santos"
              required
              value={details.name}
            />
            <span className="mt-1.5 block text-xs font-normal leading-5 text-vitta-muted">
              Pode usar seu nome, o nome do salão/estúdio ou os dois — como quer
              aparecer para suas clientes.
            </span>
            {nameError && (
              <span className="mt-1 block text-xs text-rose-700">
                {nameError}
              </span>
            )}
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-vitta-text">
              CPF
              <input
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
                inputMode="numeric"
                maxLength={14}
                name="cpf"
                onChange={(event) => {
                  updateDetail("cpf", formatCpf(event.currentTarget.value));
                  setCpfError("");
                }}
                placeholder="000.000.000-00"
                required
                value={details.cpf}
              />
              {cpfError && (
                <span className="mt-1 block text-xs text-rose-700">
                  {cpfError}
                </span>
              )}
            </label>

            <label className="block text-sm font-medium text-vitta-text">
              Telefone / WhatsApp
              <input
                autoComplete="tel"
                className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
                inputMode="tel"
                maxLength={16}
                name="phone"
                onChange={(event) =>
                  updateDetail(
                    "phone",
                    formatBrazilianPhone(event.currentTarget.value),
                  )
                }
                placeholder="(11) 99999-9999"
                required
                type="tel"
                value={details.phone}
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-vitta-text">
            Especialidade
            <input
              autoComplete="organization-title"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
              maxLength={80}
              name="specialty"
              onChange={(event) =>
                updateDetail("specialty", event.currentTarget.value)
              }
              placeholder="Ex.: Manicure, Esteticista, Cabeleireira"
              required
              value={details.specialty}
            />
          </label>

          <label className="block text-sm font-medium text-vitta-text">
            E-mail de acesso
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
              maxLength={254}
              name="email"
              onChange={(event) => updateDetail("email", event.currentTarget.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={details.email}
            />
          </label>

          <button
            className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_22px_rgba(121,80,165,0.25)]"
            type="submit"
          >
            Continuar para criar senha
          </button>
        </form>
      ) : (
        <form action={formAction} className="space-y-5 text-left">
          <input name="name" type="hidden" value={details.name} />
          <input name="cpf" type="hidden" value={details.cpf} />
          <input name="phone" type="hidden" value={details.phone} />
          <input name="specialty" type="hidden" value={details.specialty} />
          <input name="email" type="hidden" value={details.email} />

          <div className="rounded-2xl border border-vitta-border bg-vitta-background/70 px-4 py-3">
            <p className="text-xs font-medium text-vitta-muted">
              Cadastro para
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-vitta-text">
              {details.name}
            </p>
            <p className="mt-0.5 break-words text-xs text-vitta-muted">
              {details.email}
            </p>
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {state.error}
            </p>
          )}

          <div>
            <label
              className="block text-sm font-medium text-vitta-text"
              htmlFor="registration-password"
            >
              Crie sua senha
            </label>
            <div className="relative mt-2">
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 pr-14 text-vitta-text outline-none transition"
                id="registration-password"
                maxLength={72}
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-xl text-vitta-muted transition hover:bg-vitta-background hover:text-vitta"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? (
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M3 3l18 18M10.58 10.59a2 2 0 0 0 2.83 2.82M9.88 5.09A10.94 10.94 0 0 1 12 4.9c5 0 9 4.1 10 7.1a11.8 11.8 0 0 1-3.07 4.55M6.61 6.62A12.08 12.08 0 0 0 2 12c1 3 5 7.1 10 7.1 1.02 0 1.99-.19 2.88-.53" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <ul aria-live="polite" className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {passwordRequirements.map((requirement) => (
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="rounded-2xl border border-vitta-border bg-white px-5 py-3.5 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
              onClick={() => setStep(1)}
              type="button"
            >
              Voltar aos dados
            </button>
            <button
              className="rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_22px_rgba(121,80,165,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                pending || passwordRequirements.some((requirement) => !requirement.met)
              }
              type="submit"
            >
              {pending ? "Criando conta..." : "Criar minha conta"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-vitta-muted">
        Já tem uma conta?{" "}
        <Link
          className="font-semibold text-vitta underline-offset-4 hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </section>
  );
}
