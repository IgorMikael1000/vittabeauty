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

type DeleteAccountFormProps = {
  expiresAt: Date;
  hasActiveAccess: boolean;
  planType: string;
  subscriptionStatus: string;
};

function getAccessExpiryMessage(status: string, expiresAt: Date): string {
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(expiresAt);

  if (status === "TRIAL") {
    return `Seu período de teste grátis termina em ${date}.`;
  }
  if (status === "EXPIRED") {
    return `Seu período de acesso expirou em ${date}.`;
  }
  if (status === "CANCELED" || status === "CANCELLED") {
    return `Seu acesso atual permanece disponível até ${date}.`;
  }
  return `Seu plano dá acesso à plataforma até ${date}.`;
}

function getPlanLabel(planType: string): string {
  const planLabels: Record<string, string> = {
    FREE: "Gratuito",
    MONTHLY: "Mensal",
    SEMIANNUAL: "Semestral",
    ANNUAL: "Anual",
  };
  return planLabels[planType] ?? planType;
}

export function DeleteAccountForm({
  expiresAt,
  hasActiveAccess,
  planType,
  subscriptionStatus,
}: DeleteAccountFormProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"explanation" | "confirmation">(
    "explanation",
  );
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
  const accessExpiryMessage = getAccessExpiryMessage(
    subscriptionStatus,
    expiresAt,
  );

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  function closeDialog() {
    if (pending) return;
    setDialogOpen(false);
    setStep("explanation");
    setError("");
    setPassword("");
  }

  function continueToConfirmation() {
    setError("");
    setStep("confirmation");
  }

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
          setError(result.error);
          return;
        }

        await signOut(auth).catch((signOutError: unknown) => {
          console.error(
            "Could not clear Firebase client state after account deletion.",
            signOutError,
          );
        });
        router.replace(
          result.pending
            ? "/login?accountDeletionPending=1"
            : "/login?accountDeleted=1",
        );
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
              ? "A confirmação pela conta Google foi cancelada."
              : code === "auth/requires-recent-login"
                ? "Confirme sua identidade novamente para excluir a conta."
                : "Não foi possível confirmar sua identidade ou excluir a conta.",
        );
      }
    });
  }

  return (
    <>
      <div className="mt-8 rounded-[24px] border border-rose-200 bg-white/90 p-5 shadow-card sm:p-6">
        <button
          className="w-full rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 sm:w-auto"
          onClick={() => {
            setStep("explanation");
            setDialogOpen(true);
          }}
          type="button"
        >
          Excluir minha conta
        </button>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#24182d]/55 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            aria-labelledby="delete-account-dialog-title"
            aria-modal="true"
            className="my-auto w-full max-w-xl rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_28px_90px_rgba(27,17,34,0.28)] sm:p-8"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeDialog();
            }}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-rose-700/80">
                  Ação permanente
                </p>
                <h2
                  className="mt-1 text-xl font-semibold tracking-[-0.03em] text-vitta-text sm:text-2xl"
                  id="delete-account-dialog-title"
                >
                  {step === "explanation"
                    ? "Antes de excluir sua conta"
                    : "Confirme sua identidade"}
                </h2>
              </div>
              <button
                aria-label="Fechar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-vitta-muted transition hover:bg-vitta-background hover:text-vitta-text"
                disabled={pending}
                onClick={closeDialog}
                type="button"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            {step === "explanation" ? (
              <>
                <div className="mt-5 space-y-4 text-sm leading-6 text-vitta-muted">
                  <p>
                    A exclusão removerá permanentemente seu perfil e todos os
                    dados vinculados, incluindo clientes, serviços, agenda,
                    atendimentos, configurações e informações da plataforma.
                    O acesso à plataforma será encerrado com a exclusão da conta.
                  </p>
                  <div className="rounded-2xl border border-vitta-border bg-vitta-background/70 p-4">
                    <p className="font-semibold text-vitta-text">
                      {accessExpiryMessage}
                    </p>
                    {hasActiveAccess && (
                      <p className="mt-1.5">
                        Recomendamos continuar usando a plataforma até essa
                        data, se quiser aproveitar o período já disponível.
                      </p>
                    )}
                  </div>
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    Após a exclusão, o acesso será encerrado imediatamente.
                    Valores já pagos não serão reembolsados nem convertidos em
                    crédito.
                  </p>
                  {planType && (
                    <p className="text-xs">
                      Plano atual:{" "}
                      <span className="font-semibold text-vitta-text">
                        {getPlanLabel(planType)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="rounded-2xl border border-vitta-border bg-white px-5 py-3 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
                    onClick={closeDialog}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-2xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800"
                    onClick={continueToConfirmation}
                    type="button"
                  >
                    Concordo e continuar
                  </button>
                </div>
              </>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={submit}>
                <p className="text-sm leading-6 text-vitta-muted">
                  Para prosseguir, informe o e-mail e o CPF cadastrados e
                  confirme sua identidade.
                </p>

                <label className="block text-sm font-medium text-vitta-text">
                  E-mail cadastrado
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
                  CPF cadastrado
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

                {user && hasGoogleProvider ? (
                  <p className="rounded-2xl border border-vitta-border bg-vitta-background/70 p-4 text-sm leading-6 text-vitta-muted">
                    Esta conta usa o Google para entrar. Ao continuar, será
                    solicitada uma nova confirmação da sua conta Google.
                  </p>
                ) : (
                  <PasswordInput
                    autoComplete="current-password"
                    id="delete-account-password"
                    label="Senha atual"
                    maxLength={72}
                    name="deleteAccountPassword"
                    onChange={setPassword}
                    value={password}
                  />
                )}

                {error && (
                  <p
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <button
                    className="rounded-2xl border border-vitta-border bg-white px-5 py-3 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
                    disabled={pending}
                    onClick={() => {
                      setError("");
                      setStep("explanation");
                    }}
                    type="button"
                  >
                    Voltar
                  </button>
                  <button
                    className="rounded-2xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pending || !canSubmit}
                    type="submit"
                  >
                    {pending ? "Enviando solicitação..." : "Confirmar exclusão"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
