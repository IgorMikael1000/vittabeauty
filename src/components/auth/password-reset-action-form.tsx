"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type PasswordResetActionFormProps = {
  actionCode: string;
};

export function PasswordResetActionForm({
  actionCode,
}: PasswordResetActionFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingCode, setCheckingCode] = useState(true);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkCode() {
      if (!actionCode) {
        setError("O link está incompleto. Solicite uma nova redefinição de senha.");
        setCheckingCode(false);
        return;
      }

      try {
        const accountEmail = await verifyPasswordResetCode(auth, actionCode);
        if (active) setEmail(accountEmail);
      } catch {
        if (active) {
          setError(
            "Este link de redefinição é inválido ou expirou. Solicite um novo link.",
          );
        }
      } finally {
        if (active) setCheckingCode(false);
      }
    }

    void checkCode();
    return () => {
      active = false;
    };
  }, [actionCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setPending(true);
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setSuccess(true);
      window.setTimeout(() => router.replace("/login"), 2500);
    } catch (resetError) {
      const code =
        typeof resetError === "object" &&
        resetError !== null &&
        "code" in resetError &&
        typeof resetError.code === "string"
          ? resetError.code
          : "";
      setError(
        code === "auth/weak-password"
          ? "Escolha uma senha mais forte."
          : code === "auth/network-request-failed"
            ? "Falha de conexão. Verifique sua internet e tente novamente."
            : "Não foi possível redefinir a senha. Solicite um novo link.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <header className="mb-7">
        <div className="relative mx-auto mb-4 h-[100px] w-[240px] max-w-full overflow-hidden">
          <Image
            alt="Vitta Beauty"
            className="absolute left-1/2 top-1/2 h-[200px] w-[300px] max-w-none -translate-x-1/2 -translate-y-[40%]"
            height={408}
            priority
            src="/brand/logo_vitta.png"
            width={612}
          />
        </div>
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-vitta/75">
          Segurança da conta
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-vitta-text">
          Criar nova senha
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-vitta-muted">
          {email
            ? `Defina uma nova senha para ${email}.`
            : "Escolha uma senha segura para acessar sua conta."}
        </p>
      </header>

      {checkingCode && (
        <p className="rounded-xl bg-[#f7f3fa] px-4 py-3 text-center text-sm text-vitta-muted">
          Validando seu link...
        </p>
      )}
      {success && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
          role="status"
        >
          Senha atualizada com sucesso. Redirecionando para o login...
        </p>
      )}
      {error && (
        <p
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}

      {!checkingCode && !error && !success && (
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-vitta-text">
            Nova senha
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none"
              minLength={6}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <label className="block text-sm font-medium text-vitta-text">
            Confirmar nova senha
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none"
              minLength={6}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button
            className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}

      {!checkingCode && error && (
        <Link
          className="mt-5 block text-center text-sm font-semibold text-vitta hover:underline"
          href="/esqueci-senha"
        >
          Solicitar outro link
        </Link>
      )}
      {success && (
        <Link
          className="mt-5 block text-center text-sm font-semibold text-vitta hover:underline"
          href="/login"
        >
          Ir para o login agora
        </Link>
      )}
    </section>
  );
}
