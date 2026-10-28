"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { deleteProfessionalAccountAction } from "@/app/actions/account-deletion";
import { PasswordInput } from "@/components/forms/password-input";
import { auth, googleProvider } from "@/lib/firebase";

export function DeleteAccountForm() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const hasGoogleProvider = user?.providerData.some(
    (provider) => provider.providerId === "google.com",
  );
  const hasPasswordProvider = user?.providerData.some(
    (provider) => provider.providerId === "password",
  );
  const canSubmit = Boolean(
    user &&
      email.trim() &&
      cpf.trim() &&
      (hasGoogleProvider || (hasPasswordProvider && password)),
  );

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const currentUser = user;
        if (!currentUser) {
          setError("Sua sessão expirou. Entre novamente para continuar.");
          return;
        }

        if (hasGoogleProvider) {
          await reauthenticateWithPopup(currentUser, googleProvider);
        } else if (hasPasswordProvider && currentUser.email) {
          await reauthenticateWithCredential(
            currentUser,
            EmailAuthProvider.credential(currentUser.email, password),
          );
        } else {
          setError(
            "Não foi possível confirmar sua identidade com o método de acesso desta conta.",
          );
          return;
        }

        const result = await deleteProfessionalAccountAction(
          email,
          cpf,
          await currentUser.getIdToken(true),
        );
        if (result.error) {
          if (result.cleanupPending) {
            await signOut(auth);
            router.replace("/login?accountDeletionPending=1");
            router.refresh();
            return;
          }
          setError(result.error);
          return;
        }

        await signOut(auth).catch((signOutError: unknown) => {
          console.error(
            "Could not clear Firebase client state after account deletion.",
            signOutError,
          );
        });
        router.replace("/login?accountDeleted=1");
        router.refresh();
      } catch (deleteError) {
        const code =
          typeof deleteError === "object" &&
          deleteError !== null &&
          "code" in deleteError &&
          typeof deleteError.code === "string"
            ? deleteError.code
            : "";
        setError(
          code === "auth/wrong-password" ||
            code === "auth/invalid-credential"
            ? "A senha informada está incorreta."
            : code === "auth/popup-closed-by-user"
              ? "A confirmação pelo Google foi cancelada."
              : code === "auth/requires-recent-login"
                ? "Confirme sua identidade novamente para excluir a conta."
                : "Não foi possível confirmar sua identidade ou excluir a conta.",
        );
      }
    });
  }

  return (
    <section className="mt-8 rounded-[24px] border border-rose-200 bg-white/90 p-5 shadow-card sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-rose-700/80">
        Ação permanente
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-vitta-text">
        Excluir minha conta
      </h2>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Esta ação remove permanentemente seu perfil, agenda, clientes, serviços
        e demais dados da plataforma. Uma assinatura ativa do Mercado Pago será
        cancelada antes da exclusão. Valores já pagos não serão reembolsados.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-vitta-text">
          Digite o e-mail cadastrado
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition focus:border-vitta/50 focus:ring-2 focus:ring-vitta/10"
            maxLength={254}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block text-sm font-medium text-vitta-text">
          Digite o CPF cadastrado
          <input
            autoComplete="off"
            className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition focus:border-vitta/50 focus:ring-2 focus:ring-vitta/10"
            inputMode="numeric"
            maxLength={14}
            onChange={(event) => setCpf(event.currentTarget.value)}
            required
            value={cpf}
          />
        </label>

        {user && !hasGoogleProvider && hasPasswordProvider && (
          <PasswordInput
            autoComplete="current-password"
            id="delete-account-password"
            label="Confirme sua senha atual"
            maxLength={72}
            name="deleteAccountPassword"
            onChange={setPassword}
            value={password}
          />
        )}

        {user && hasGoogleProvider && (
          <p className="text-xs leading-5 text-vitta-muted">
            A exclusão solicitará uma nova confirmação da sua conta Google.
          </p>
        )}

        {error && (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          className="w-full rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={pending || !canSubmit}
          type="submit"
        >
          {pending ? "Excluindo conta..." : "Excluir conta permanentemente"}
        </button>
      </form>
    </section>
  );
}
