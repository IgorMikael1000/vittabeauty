"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  linkLegacyFirebaseAccountAction,
  loginWithFirebaseAction,
  verifyLegacyCredentialsAction,
} from "@/app/actions/auth";
import { PasswordInput } from "@/components/forms/password-input";
import { getFirebaseActionCodeSettings } from "@/lib/firebase-action-settings";
import { auth, googleProvider } from "@/lib/firebase";

type AuthFormProps = {
  accountDeletionPending?: boolean;
  registered?: boolean;
  initialEmail?: string;
};

function firebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "E-mail ou senha inválidos.";
  }
  if (code === "auth/too-many-requests") {
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "A janela de autenticação foi fechada antes de concluir.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "Já existe uma conta com este e-mail. Entre usando o método cadastrado.";
  }
  if (code === "auth/network-request-failed") {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível entrar. Verifique seus dados e tente novamente.";
}

export function AuthForm({
  accountDeletionPending = false,
  registered = false,
  initialEmail = "",
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [verificationUser, setVerificationUser] = useState<User | null>(null);
  const [pending, startTransition] = useTransition();

  async function completeSignIn(user: User) {
    const usesGoogleProvider = user.providerData.some(
      (provider) => provider.providerId === "google.com",
    );
    if (!user.emailVerified && !usesGoogleProvider) {
      setVerificationUser(user);
      setError(
        "Seu e-mail ainda precisa ser confirmado. Use o botão abaixo para reenviar a confirmação.",
      );
      return;
    }

    try {
      const result = await loginWithFirebaseAction(await user.getIdToken(true));
      if (result.registrationRequired && result.email) {
        const emailQuery = encodeURIComponent(result.email);
        router.push(
          result.googleRegistration
            ? `/cadastro/complemento?email=${emailQuery}`
            : `/cadastro?email=${emailQuery}`,
        );
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setError("Não foi possível iniciar a sessão. Tente novamente.");
    } catch (signInError) {
      setError("Não foi possível validar sua conta. Tente novamente.");
      console.error("Firebase login client flow failed.", signInError);
    }
  }

  function submitEmailPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = formData.get("password");
    if (typeof password !== "string") {
      setError("Informe seu e-mail e sua senha.");
      return;
    }

    setEmail(submittedEmail);
    setError("");
    setStatus("");
    setVerificationUser(null);
    startTransition(async () => {
      let user: User;
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          submittedEmail,
          password,
        );
        user = credential.user;
      } catch (authError) {
        const code =
          typeof authError === "object" &&
          authError !== null &&
          "code" in authError &&
          typeof authError.code === "string"
            ? authError.code
            : "";
        if (
          code === "auth/user-not-found" ||
          code === "auth/invalid-credential"
        ) {
          try {
            const isLegacyAccount = await verifyLegacyCredentialsAction(
              submittedEmail,
              password,
            );
            if (isLegacyAccount) {
              const credential = await createUserWithEmailAndPassword(
                auth,
                submittedEmail,
                password,
              );
              await sendEmailVerification(
                credential.user,
                getFirebaseActionCodeSettings(),
              );
              const result = await linkLegacyFirebaseAccountAction(
                await credential.user.getIdToken(true),
              );
              if (result.error) {
                setError(result.error);
                return;
              }
              setVerificationUser(credential.user);
              setError(
                "Sua conta foi migrada. Confirme o e-mail enviado para liberar o acesso.",
              );
              return;
            }
          } catch (migrationError) {
            setError(firebaseErrorMessage(migrationError));
            return;
          }
        }
        setError(firebaseErrorMessage(authError));
        return;
      }
      await completeSignIn(user);
    });
  }

  function submitGoogle() {
    setError("");
    setStatus("");
    startTransition(async () => {
      let user: User;
      try {
        const credential = await signInWithPopup(auth, googleProvider);
        user = credential.user;
      } catch (authError) {
        setError(firebaseErrorMessage(authError));
        console.error("Firebase Google popup failed.", authError);
        return;
      }
      await completeSignIn(user);
    });
  }

  function resendVerification() {
    if (!verificationUser) return;
    startTransition(async () => {
      try {
        await sendEmailVerification(
          verificationUser,
          getFirebaseActionCodeSettings(),
        );
        setStatus(
          `Enviamos novamente o e-mail de confirmação para ${verificationUser.email}.`,
        );
      } catch (authError) {
        setError(firebaseErrorMessage(authError));
      }
    });
  }

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
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
          role="status"
        >
          Cadastro realizado! O suporte do Vitta Beauty enviou um e-mail de
          confirmação para você. Por favor, confirme seu e-mail antes de
          realizar o login.
        </p>
      )}
      {accountDeletionPending && (
        <p
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          A autenticação foi removida, mas a exclusão dos dados não foi
          concluída. Entre em contato com o suporte para finalizar a solicitação.
        </p>
      )}
      {error && (
        <p
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {status && (
        <p
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {status}
        </p>
      )}

      {verificationUser && (
        <button
          className="mb-5 w-full rounded-xl border border-vitta px-4 py-3 text-sm font-semibold text-vitta transition hover:bg-vitta/5 disabled:opacity-60"
          disabled={pending}
          onClick={resendVerification}
          type="button"
        >
          Reenviar e-mail de confirmação
        </button>
      )}

      <button
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e9e3ed] bg-white px-5 py-3.5 font-semibold text-vitta-text transition hover:bg-vitta-background disabled:opacity-60"
        disabled={pending}
        onClick={submitGoogle}
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.05 46.98 31.9 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
        </svg>
        Entrar com Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-vitta-muted">
        <span className="h-px flex-1 bg-vitta-border" />
        ou entre com e-mail
        <span className="h-px flex-1 bg-vitta-border" />
      </div>

      <form className="space-y-5" onSubmit={submitEmailPassword}>
        <label className="block text-sm font-medium text-vitta-text">
          E-mail
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
            maxLength={254}
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <div>
          <PasswordInput
            autoComplete="current-password"
            id="auth-password"
            label="Senha"
            name="password"
            onChange={setLoginPassword}
            value={loginPassword}
          />
          <Link
            className="mt-2 inline-block text-xs font-semibold text-vitta hover:underline"
            href="/esqueci-senha"
          >
            Esqueci minha senha
          </Link>
        </div>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
          href="/cadastro"
        >
          Cadastre-se
        </Link>
      </p>
    </section>
  );
}
