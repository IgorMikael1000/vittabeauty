"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword as updateFirebasePassword,
  type User,
} from "firebase/auth";
import { recordFirebasePasswordChangeAction } from "@/app/actions/account";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
import { PasswordInput } from "@/components/forms/password-input";
import { getPasswordRequirements } from "@/lib/professional-validation";
import { auth } from "@/lib/firebase";

const initialState: FormState = {};

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [verifyState, setVerifyState] = useState<FormState>(initialState);
  const [updateState, setUpdateState] = useState<FormState>(initialState);
  const [pending, startTransition] = useTransition();
  const verified = unlocked;
  const requirements = getPasswordRequirements(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordProvider = firebaseUser?.providerData.some(
    (provider) => provider.providerId === "password",
  );
  const googleAccount = firebaseUser?.providerData.some(
    (provider) => provider.providerId === "google.com",
  );
  useEffect(
    () => onAuthStateChanged(auth, setFirebaseUser),
    [],
  );

  function verifyCurrentPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdateState(initialState);

    startTransition(async () => {
      try {
        const user = firebaseUser;
        if (!user?.email || !passwordProvider) {
          setVerifyState({
            error: "Esta conta não possui uma senha de acesso para revalidar.",
          });
          return;
        }
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, currentPassword),
        );
        setVerifyState({ success: "Senha atual confirmada." });
        setUnlocked(true);
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "";
        setVerifyState({
          error:
            code === "auth/wrong-password" ||
            code === "auth/invalid-credential"
              ? "A senha atual está incorreta."
              : code === "auth/requires-recent-login"
                ? "Entre novamente e tente alterar sua senha."
                : "Não foi possível confirmar a senha atual.",
        });
      }
    });
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const user = firebaseUser;
        if (!user || !unlocked) {
          setUpdateState({
            error: "Confirme sua senha atual antes de continuar.",
          });
          return;
        }
        if (newPassword !== confirmPassword) {
          setUpdateState({
            error: "A confirmação não corresponde à nova senha.",
          });
          return;
        }
        if (newPassword === currentPassword) {
          setUpdateState({
            error: "Escolha uma senha diferente da senha atual.",
          });
          return;
        }
        if (
          getPasswordRequirements(newPassword).some(
            (requirement) => !requirement.met,
          )
        ) {
          setUpdateState({
            error: "A nova senha não cumpre todos os requisitos de segurança.",
          });
          return;
        }

        await updateFirebasePassword(user, newPassword);
        const logResult = await recordFirebasePasswordChangeAction(
          await user.getIdToken(true),
        );
        if (logResult.error) {
          setUpdateState({
            error:
              "A senha foi alterada no Firebase, mas não conseguimos registrar a confirmação. Entre novamente se tiver problemas de acesso.",
          });
          return;
        }
        setUpdateState({ success: "Senha atualizada com segurança." });
        setUnlocked(false);
        setVerifyState(initialState);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "";
        setUpdateState({
          error:
            code === "auth/requires-recent-login"
              ? "Entre novamente e repita a confirmação da senha atual."
              : code === "auth/weak-password"
                ? "A nova senha não atende aos requisitos do Firebase."
                : "Não foi possível atualizar a senha. Tente novamente.",
        });
      }
    });
  }

  if (passwordProvider === undefined) {
    return (
      <p className="text-sm text-vitta-muted">Carregando os dados de acesso…</p>
    );
  }

  if (googleAccount) {
    return (
      <p className="rounded-2xl border border-vitta-border bg-vitta-background/70 p-4 text-sm leading-6 text-vitta-muted">
        Contas acessadas pelo Google não podem alterar a senha por aqui.
      </p>
    );
  }

  if (!passwordProvider) {
    return (
      <p className="rounded-2xl border border-vitta-border bg-vitta-background/70 p-4 text-sm leading-6 text-vitta-muted">
        Esta conta não possui uma senha do Vitta Beauty para alterar. Entre
        usando o Google ou use “Esqueci minha senha” caso tenha adicionado
        acesso por e-mail.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <FormFeedback state={updateState} />

      {!verified ? (
        <form className="space-y-5" onSubmit={verifyCurrentPassword}>
          <PasswordInput
            autoComplete="current-password"
            id="current-password"
            label="Senha Atual"
            maxLength={72}
            name="currentPassword"
            onChange={setCurrentPassword}
            value={currentPassword}
          />
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
            autoComplete="new-password"
            id="new-password"
            label="Nova Senha"
            maxLength={72}
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
              autoComplete="new-password"
              id="confirm-new-password"
              label="Confirmar Nova Senha"
              maxLength={72}
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
