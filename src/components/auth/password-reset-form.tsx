"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function PasswordResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSent(false);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch (resetError) {
      const code =
        typeof resetError === "object" &&
        resetError !== null &&
        "code" in resetError &&
        typeof resetError.code === "string"
          ? resetError.code
          : "";
      setError(
        code === "auth/invalid-email"
          ? "Informe um e-mail válido."
          : code === "auth/network-request-failed"
            ? "Falha de conexão. Verifique sua internet e tente novamente."
            : "Não foi possível enviar as instruções. Confira o e-mail e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vitta/75">
        Acesso à conta
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-vitta-text">
        Esqueci minha senha
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Informe o e-mail cadastrado para receber as instruções de redefinição.
      </p>
      {sent && (
        <p
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Se houver uma conta com esse e-mail, as instruções para redefinir a
          senha foram enviadas.
        </p>
      )}
      {error && (
        <p
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-vitta-text">
          E-mail
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button
          className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enviando..." : "Enviar instruções"}
        </button>
      </form>
      <Link
        className="mt-6 block text-center text-sm font-semibold text-vitta hover:underline"
        href="/login"
      >
        Voltar ao login
      </Link>
    </section>
  );
}
