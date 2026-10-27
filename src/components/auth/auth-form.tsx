"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";

type AuthFormProps = {
  registered?: boolean;
  initialEmail?: string;
};

const initialState: FormState = {};

export function AuthForm({
  registered = false,
  initialEmail = "",
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <header className="mb-8">
        <div className="relative mb-3 h-[160px] w-[300px] max-w-full overflow-hidden">
          <Image
            alt="Vitta Beauty"
            className="absolute left-1/2 top-1/2 h-[267px] w-[400px] max-w-none -translate-x-1/2 -translate-y-[40%]"
            height={408}
            priority
            src="/brand/logo_vitta.png"
            width={612}
          />
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-vitta-text">
          Bem-vinda de volta
        </h1>
        <p className="mt-2 text-sm leading-6 text-vitta-muted">
          Entre para acessar seu espaço de gestão.
        </p>
      </header>

      {registered && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Conta criada. Confira seu e-mail e entre com a senha cadastrada.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <label className="block text-sm font-medium text-vitta-text">
          E-mail
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
            defaultValue={initialEmail}
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>

        <div>
          <label
            className="block text-sm font-medium text-vitta-text"
            htmlFor="auth-password"
          >
            Senha
          </label>
          <div className="relative mt-2">
            <input
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 pr-14 text-vitta-text outline-none transition"
              id="auth-password"
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-xl text-vitta-muted transition hover:bg-vitta-background hover:text-vitta"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? (
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
          </div>
        </div>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_22px_rgba(121,80,165,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Aguarde..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-vitta-muted">
        Ainda não tem uma conta?{" "}
        <Link
          className="font-semibold text-vitta underline-offset-4 hover:underline"
          href="/register"
        >
          Cadastre-se
        </Link>
      </p>
    </section>
  );
}
