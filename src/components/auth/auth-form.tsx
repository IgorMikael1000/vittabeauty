"use client";

import Image from "next/image";
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
    <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <div className="mb-8">
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
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
          className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_22px_rgba(121,80,165,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
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
