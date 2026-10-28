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
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { Pencil, X } from "lucide-react";
import {
  checkProfessionalEmailAction,
  updateProfessionalDetailsAction,
} from "@/app/actions/account";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
import { getFirebaseActionCodeSettings } from "@/lib/firebase-action-settings";
import { PasswordInput } from "@/components/forms/password-input";
import { auth } from "@/lib/firebase";
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
  const [emailPending, startEmailTransition] = useTransition();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [email, setEmail] = useState(professional.email);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const emailChanged = email.trim().toLowerCase() !== professional.email;
  const googleAccount = firebaseUser?.providerData.some(
    (provider) => provider.providerId === "google.com",
  );

  useEffect(
    () => onAuthStateChanged(auth, setFirebaseUser),
    [],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(initialState);

    startTransition(async () => {
      try {
        const result = await updateProfessionalDetailsAction(formData);
        if (result.error) {
          setState(result);
          return;
        }

        setState(result);
      } catch (error) {
        console.error("Could not save professional profile details.", error);
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

  function requestEmailChange() {
    setState(initialState);
    startEmailTransition(async () => {
      try {
        if (googleAccount) {
          setState({
            error: "Contas acessadas pelo Google não podem alterar o e-mail.",
          });
          return;
        }

        const user = firebaseUser;
        const normalizedEmail = email.trim().toLowerCase();
        if (!user?.email || !user.providerData.some(
          (provider) => provider.providerId === "password",
        )) {
          setState({
            error: "Esta conta não possui acesso por e-mail e senha.",
          });
          return;
        }
        if (!emailChanged) {
          setState({ error: "Informe um e-mail diferente do atual." });
          return;
        }

        const availability = await checkProfessionalEmailAction(normalizedEmail);
        if (availability.error) {
          setState(availability);
          return;
        }
        if (!currentPassword) {
          setState({ error: "Informe sua senha atual para confirmar a alteração." });
          return;
        }

        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, currentPassword),
        );
        await verifyBeforeUpdateEmail(
          user,
          normalizedEmail,
          getFirebaseActionCodeSettings(
            "/dashboard/conta/dados?firebaseEmailUpdated=1",
          ),
        );
        setEmailChangeRequested(true);
        setEditingEmail(false);
        setCurrentPassword("");
        setState({
          success:
            "Enviamos um link de confirmação para o novo endereço. Abra-o neste navegador para atualizar seu perfil e continuar conectado.",
        });
      } catch (error) {
        console.error("Could not request Firebase email change.", error);
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
                  : "Não foi possível enviar a confirmação do novo e-mail.",
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

      <div>
        <div className="flex items-center justify-between gap-3">
          <label
            className="block text-sm font-medium text-vitta-text"
            htmlFor="professional-email"
          >
            E-mail
          </label>
          {firebaseUser && !googleAccount && !emailChangeRequested && (
            <button
              aria-label={editingEmail ? "Cancelar alteração de e-mail" : "Editar e-mail"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-vitta transition hover:bg-vitta-background"
              onClick={() => {
                setState(initialState);
                setEmail(editingEmail ? professional.email : email);
                setEditingEmail((current) => !current);
                setCurrentPassword("");
              }}
              type="button"
            >
              {editingEmail ? (
                <X aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Pencil aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        <input
          autoComplete="email"
          className={`${inputClass} ${!editingEmail || googleAccount || emailChangeRequested ? "cursor-not-allowed bg-[#f3f0f5] text-vitta-muted" : ""}`}
          id="professional-email"
          maxLength={254}
          onChange={(event) => setEmail(event.currentTarget.value)}
          readOnly={!editingEmail || !!googleAccount || emailChangeRequested}
          type="email"
          value={email}
        />
        {googleAccount && (
          <span className="mt-1.5 block text-xs text-vitta-muted">
            O e-mail é gerenciado pelo Google e não pode ser alterado aqui.
          </span>
        )}
        {editingEmail && !googleAccount && (
          <div className="mt-4 space-y-4 rounded-2xl border border-vitta-border bg-vitta-background/50 p-4">
            <PasswordInput
              autoComplete="current-password"
              id="email-change-current-password"
              label="Senha atual para confirmar"
              maxLength={72}
              name="emailChangeCurrentPassword"
              onChange={setCurrentPassword}
              value={currentPassword}
            />
            <button
              className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={emailPending || !emailChanged || !currentPassword}
              onClick={requestEmailChange}
              type="button"
            >
              {emailPending ? "Enviando confirmação..." : "Enviar confirmação"}
            </button>
          </div>
        )}
        {emailChangeRequested && (
          <p className="mt-2 text-xs leading-5 text-vitta-muted">
            Aguardando confirmação no novo endereço. Abra o link no mesmo
            navegador para voltar ao Vitta Beauty já conectado.
          </p>
        )}
      </div>

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
