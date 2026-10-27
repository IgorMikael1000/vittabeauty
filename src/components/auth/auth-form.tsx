"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginAction,
  registerAction,
  type FormState,
} from "@/app/actions/auth";

type AuthFormProps = {
  mode: "login" | "register";
  registered?: boolean;
};

const initialState: FormState = {};

export function AuthForm({ mode, registered = false }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isRegister = mode === "register";

  return (
    <section className="w-full max-w-md rounded-2xl border border-vitta-border bg-vitta-surface p-7 shadow-card sm:p-9">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-vitta">
          Vitta Beauty
        </p>
        <h1 className="text-2xl font-semibold text-vitta-text">
          {isRegister ? "Crie sua conta" : "Bem-vinda de volta"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-vitta-muted">
          {isRegister
            ? "Comece a organizar sua rotina profissional."
            : "Entre para acessar seu espaço de gestão."}
        </p>
      </div>

      {registered && !isRegister && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Conta criada. Agora você já pode entrar.
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
        {isRegister && (
          <label className="block text-sm font-medium text-vitta-text">
            Nome profissional
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-vitta-border bg-white px-4 py-3 text-vitta-text outline-none transition focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              maxLength={80}
              name="name"
              required
              type="text"
            />
          </label>
        )}

        <label className="block text-sm font-medium text-vitta-text">
          E-mail
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-vitta-border bg-white px-4 py-3 text-vitta-text outline-none transition focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>

        <label className="block text-sm font-medium text-vitta-text">
          Senha
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="mt-2 w-full rounded-xl border border-vitta-border bg-white px-4 py-3 text-vitta-text outline-none transition focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            maxLength={72}
            minLength={isRegister ? 8 : undefined}
            name="password"
            required
            type="password"
          />
          {isRegister && (
            <span className="mt-1 block text-xs font-normal text-vitta-muted">
              Use ao menos 8 caracteres.
            </span>
          )}
        </label>

        <button
          className="w-full rounded-xl bg-vitta px-5 py-3 font-semibold text-white transition hover:bg-vitta/90 focus:outline-none focus:ring-2 focus:ring-vitta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Aguarde..."
            : isRegister
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-vitta-muted">
        {isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
        <Link
          className="font-semibold text-vitta underline-offset-4 hover:underline"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? "Entrar" : "Cadastre-se"}
        </Link>
      </p>
    </section>
  );
}
