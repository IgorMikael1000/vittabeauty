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
  reauthenticateWithPopup,
  sendEmailVerification,
  updateEmail,
  type User,
} from "firebase/auth";
import {
  checkProfessionalEmailAction,
  updateProfessionalDetailsAction,
} from "@/app/actions/account";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
import { getFirebaseActionCodeSettings } from "@/lib/firebase-action-settings";
import { auth, googleProvider } from "@/lib/firebase";
import {
  formatAccountPhone,
  formatCpf,
} from "@/lib/professional-validation";

type ProfessionalDetails = {
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  cpf: string | null;
};

const initialState: FormState = {};
const inputClass =
  "mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition";

export function ProfessionalDetailsForm({
  professional,
}: {
  professional: ProfessionalDetails;
}) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [email, setEmail] = useState(professional.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const emailChanged = email.trim().toLowerCase() !== professional.email;

  useEffect(
    () => onAuthStateChanged(auth, setFirebaseUser),
    [],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const normalizedEmail = email.trim().toLowerCase();
    setState(initialState);

    startTransition(async () => {
      try {
        if (emailChanged) {
          const availability = await checkProfessionalEmailAction(email);
          if (availability.error) {
            setState(availability);
            return;
          }

          const user = firebaseUser;
          if (!user || !user.email) {
            setState({
              error:
                "Sua sessão Firebase expirou. Entre novamente para alterar o e-mail.",
            });
            return;
          }

          if (user.providerData.some((provider) => provider.providerId === "password")) {
            if (!currentPassword) {
              setState({ error: "Informe sua senha atual para trocar o e-mail." });
              return;
            }
            await reauthenticateWithCredential(
              user,
              EmailAuthProvider.credential(user.email, currentPassword),
            );
          } else if (
            user.providerData.some((provider) => provider.providerId === "google.com")
          ) {
            await reauthenticateWithPopup(user, googleProvider);
          } else {
            setState({
              error: "Este método de acesso não permite reautenticação de e-mail.",
            });
            return;
          }

          await updateEmail(user, normalizedEmail);
          formData.set("firebaseIdToken", await user.getIdToken(true));
        }

        const result = await updateProfessionalDetailsAction(formData);
        if (result.error) {
          setState(result);
          return;
        }

        if (emailChanged && auth.currentUser) {
          try {
            await sendEmailVerification(
              auth.currentUser,
              getFirebaseActionCodeSettings(),
            );
            setState({
              success:
                "Dados atualizados. Confirme o novo e-mail pelo link enviado para concluir a alteração.",
            });
          } catch {
            setState({
              success:
                "Dados atualizados, mas não foi possível enviar a confirmação do novo e-mail. Reenvie a confirmação ao entrar.",
            });
          }
        } else {
          setState(result);
        }
        setCurrentPassword("");
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "";
        setState({
          error:
            code === "auth/wrong-password" ||
            code === "auth/invalid-credential"
              ? "A senha atual está incorreta."
              : code === "auth/requires-recent-login"
                ? "A sessão expirou. Entre novamente e tente alterar o e-mail."
                : code === "auth/email-already-in-use"
                  ? "Este e-mail já está sendo usado por outra conta Firebase."
                  : "Não foi possível atualizar os dados. Tente novamente.",
        });
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-vitta-text">
        Nome profissional
        <input
          autoComplete="organization"
          className={inputClass}
          defaultValue={professional.name}
          maxLength={80}
          name="name"
          placeholder="Ex.: Ana HairStudio ou Ana Santos"
          required
        />
        <span className="mt-1.5 block text-xs font-normal text-vitta-muted">
          Informe pelo menos duas palavras.
        </span>
      </label>

      <label className="block text-sm font-medium text-vitta-text">
        E-mail
        <input
          autoComplete="email"
          className={inputClass}
          maxLength={254}
          name="email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
      </label>
      {emailChanged && firebaseUser?.providerData.some(
        (provider) => provider.providerId === "password",
      ) && (
        <label className="block text-sm font-medium text-vitta-text">
          Senha atual para reautenticar
          <input
            autoComplete="current-password"
            className={inputClass}
            onChange={(event) =>
              setCurrentPassword(event.currentTarget.value)
            }
            placeholder="Usuários Google confirmarão em uma janela"
            type="password"
            value={currentPassword}
          />
        </label>
      )}
      {emailChanged &&
        firebaseUser?.providerData.some(
          (provider) => provider.providerId === "google.com",
        ) && (
          <p className="text-xs leading-5 text-vitta-muted">
            Sua identidade será confirmada em uma janela do Google antes da
            alteração.
          </p>
        )}

      <label className="block text-sm font-medium text-vitta-text">
        Telefone / WhatsApp
        <input
          autoComplete="tel"
          className={inputClass}
          defaultValue={formatAccountPhone(professional.phone ?? "")}
          inputMode="tel"
          maxLength={16}
          name="phone"
          onChange={(event) => {
            event.currentTarget.value = formatAccountPhone(
              event.currentTarget.value,
            );
          }}
          placeholder="(11) 99999-9999"
          required
          type="tel"
        />
      </label>

      <label className="block text-sm font-medium text-vitta-text">
        Especialidade
        <input
          autoComplete="organization-title"
          className={inputClass}
          defaultValue={professional.specialty ?? ""}
          maxLength={80}
          name="specialty"
          placeholder="Ex.: Cabeleireira, Manicure"
          required
        />
      </label>

      <label className="block text-sm font-medium text-vitta-text">
        CPF
        <input
          aria-describedby="cpf-readonly-help"
          className="mt-2 w-full cursor-not-allowed rounded-2xl border border-[#e9e3ed] bg-[#f3f0f5] px-4 py-3.5 text-vitta-muted outline-none"
          readOnly
          value={professional.cpf ? formatCpf(professional.cpf) : "Não informado"}
        />
        <span
          className="mt-1.5 block text-xs font-normal text-vitta-muted"
          id="cpf-readonly-help"
        >
          O CPF é fixo e não pode ser alterado por aqui.
        </span>
      </label>

      <FormFeedback state={state} />
      <button
        className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : "Salvar Alterações"}
      </button>
    </form>
  );
}
