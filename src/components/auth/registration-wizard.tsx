"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  registerAction,
  type FormState,
} from "@/app/actions/auth";
import { PasswordInput } from "@/components/forms/password-input";
import {
  formatBrazilianPhone,
  formatCpf,
  getPasswordRequirements,
  hasValidProfessionalName,
  isValidCpf,
} from "@/lib/professional-validation";
import { getFirebaseActionCodeSettings } from "@/lib/firebase-action-settings";
import { auth } from "@/lib/firebase";

type RegistrationDetails = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  specialty: string;
};

const initialState: FormState = {};
const inputClass =
  "mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition";

function firebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (code === "auth/email-already-in-use") {
    return "Este e-mail já possui uma conta Firebase. Entre ou redefina sua senha.";
  }
  if (code === "auth/invalid-email") return "Informe um e-mail válido.";
  if (code === "auth/weak-password") {
    return "A senha não atende aos requisitos de segurança.";
  }
  if (code === "auth/network-request-failed") {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível concluir o cadastro. Tente novamente.";
}

function TermsAcceptance({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] p-4 text-sm leading-6 text-vitta-text">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 shrink-0 accent-[#7950a5]"
        name="acceptedTerms"
        onChange={(event) => onChange(event.currentTarget.checked)}
        required
        type="checkbox"
        value="true"
      />
      <span>
        Li e concordo com os{" "}
        <a
          className="font-semibold text-vitta underline decoration-vitta/30 underline-offset-4 hover:decoration-vitta"
          href="/termos-e-politica.txt"
          rel="noreferrer"
          target="_blank"
        >
          Termos de Uso
        </a>{" "}
        e a{" "}
        <a
          className="font-semibold text-vitta underline decoration-vitta/30 underline-offset-4 hover:decoration-vitta"
          href="/termos-e-politica.txt"
          rel="noreferrer"
          target="_blank"
        >
          Política de Privacidade
        </a>
        .
      </span>
    </label>
  );
}

export function RegistrationWizard({
  initialEmail = "",
  googleRegistration = false,
}: {
  initialEmail?: string;
  googleRegistration?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<RegistrationDetails>({
    name: "",
    email: initialEmail,
    cpf: "",
    phone: "",
    specialty: "",
  });
  const [nameError, setNameError] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previousState: FormState, formData: FormData) => {
      const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const submittedPassword = formData.get("password");
      const submittedConfirmation = formData.get("confirmPassword");
      if (formData.get("acceptedTerms") !== "true") {
        return {
          error:
            "Leia e aceite os Termos de Uso e a Política de Privacidade.",
        };
      }
      if (
        !googleRegistration &&
        (typeof submittedPassword !== "string" ||
          submittedPassword !== submittedConfirmation)
      ) {
        return { error: "As senhas informadas não coincidem." };
      }
      let user = auth.currentUser;

      try {
        if (googleRegistration) {
          if (!user || user.email?.toLowerCase() !== email) {
            return {
              error:
                "Sua sessão Google expirou. Volte ao login e entre com Google novamente.",
            };
          }
        } else {
          if (!user || user.email?.toLowerCase() !== email) {
            if (typeof submittedPassword !== "string") {
              return { error: "Informe uma senha válida." };
            }
            const credential = await createUserWithEmailAndPassword(
              auth,
              email,
              submittedPassword,
            );
            user = credential.user;
          }

          await sendEmailVerification(user, getFirebaseActionCodeSettings());
        }
      } catch (error) {
        console.error("Firebase registration client flow failed.", error);
        return { error: firebaseErrorMessage(error) };
      }

      if (!user) {
        return {
          error:
            "Sua sessão Firebase expirou. Volte ao login e tente novamente.",
        };
      }

      let result: FormState;
      try {
        const idToken = await user.getIdToken(true);
        formData.set("authMethod", googleRegistration ? "google" : "password");
        formData.set("firebaseIdToken", idToken);
        result = await registerAction(previousState, formData);
      } catch (error) {
        console.error("Registration server action failed.", error);
        return {
          error: "Não foi possível concluir o cadastro. Tente novamente.",
        };
      }
      if (result.error) return result;
      if (googleRegistration) {
        router.replace("/dashboard");
        router.refresh();
        return result;
      }

      try {
        await signOut(auth);
      } catch {
        console.error("Firebase sign-out after registration failed.");
        return {
          error:
            "Cadastro concluído, mas não foi possível encerrar a sessão. Saia da conta e entre após confirmar o e-mail.",
        };
      }
      router.replace(
        `/login?registered=1&email=${encodeURIComponent(email)}`,
      );
      return result;
    },
    initialState,
  );
  const passwordRequirements = getPasswordRequirements(password);
  const passwordsMatch = password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  function updateDetail<K extends keyof RegistrationDetails>(
    key: K,
    value: RegistrationDetails[K],
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function validateProfile(event: FormEvent<HTMLFormElement>) {
    if (step === 2 && !googleRegistration) {
      if (
        passwordRequirements.some((requirement) => !requirement.met) ||
        !passwordsMatch ||
        !termsAccepted
      ) {
        event.preventDefault();
      }
      return;
    }

    if (!hasValidProfessionalName(details.name)) {
      event.preventDefault();
      setNameError("Informe seu nome e sobrenome ou o nome do negócio.");
      return;
    }
    setNameError("");
    if (!isValidCpf(details.cpf)) {
      event.preventDefault();
      setCpfError("Confira os números: este CPF não parece válido.");
      return;
    }
    setCpfError("");
    if (googleRegistration && !termsAccepted) {
      event.preventDefault();
      return;
    }
    if (!googleRegistration) {
      event.preventDefault();
      setStep(2);
    }
  }

  return (
    <section className="w-full max-w-xl rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <header className="mb-8 text-center">
        <div className="relative mx-auto mb-2 h-[150px] w-[280px] max-w-full overflow-hidden">
          <Image
            alt="Vitta Beauty"
            className="absolute left-1/2 top-1/2 h-[250px] w-[375px] max-w-none -translate-x-1/2 -translate-y-[40%]"
            height={408}
            priority
            src="/brand/logo_vitta.png"
            width={612}
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vitta/75">
          Seu espaço profissional
        </p>
        <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.04em] text-vitta-text">
          {step === 1 ? "Vamos conhecer seu negócio" : "Proteja sua conta"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-vitta-muted">
          {googleRegistration
            ? "Complete seu perfil para acessar seu espaço profissional."
            : step === 1
              ? "Conte um pouco sobre você e o seu espaço de beleza."
              : "Crie uma senha forte. Enviaremos uma confirmação para seu e-mail."}
        </p>
      </header>

      <form
        action={formAction}
        className="space-y-5 text-left"
        onSubmit={validateProfile}
      >
        {step === 2 && !googleRegistration ? (
          <>
            <input name="name" type="hidden" value={details.name} />
            <input name="cpf" type="hidden" value={details.cpf} />
            <input name="phone" type="hidden" value={details.phone} />
            <input name="specialty" type="hidden" value={details.specialty} />
            <input name="email" type="hidden" value={details.email} />
            <div className="rounded-2xl border border-vitta-border bg-vitta-background/70 px-4 py-3">
              <p className="text-xs font-medium text-vitta-muted">
                Cadastro para
              </p>
              <p className="mt-1 text-sm font-semibold text-vitta-text">
                {details.name}
              </p>
              <p className="mt-0.5 break-words text-xs text-vitta-muted">
                {details.email}
              </p>
            </div>
            <PasswordInput
              autoComplete="new-password"
              id="registration-password"
              label="Crie sua senha"
              maxLength={72}
              minLength={8}
              name="password"
              onChange={setPassword}
              value={password}
            />
            <div>
              <PasswordInput
                autoComplete="new-password"
                id="registration-confirm-password"
                label="Confirmar Senha"
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                onChange={setConfirmPassword}
                value={confirmPassword}
              />
              {passwordMismatch && (
                <p className="mt-2 text-xs text-rose-700" role="alert">
                  As senhas não coincidem. Confira os dois campos.
                </p>
              )}
            </div>
            <ul aria-live="polite" className="grid gap-2 text-xs sm:grid-cols-2">
              {passwordRequirements.map((requirement) => (
                <li
                  className={
                    requirement.met ? "text-emerald-700" : "text-vitta-muted"
                  }
                  key={requirement.label}
                >
                  {requirement.met ? "✓ " : "· "}
                  {requirement.label}
                </li>
              ))}
            </ul>
            <TermsAcceptance
              checked={termsAccepted}
              onChange={setTermsAccepted}
            />
            {state.error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                {state.error}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-2xl border border-vitta-border bg-white px-5 py-3.5 text-sm font-semibold text-vitta-text"
                onClick={() => setStep(1)}
                type="button"
              >
                Voltar aos dados
              </button>
              <button
                className="rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white disabled:opacity-60"
                disabled={
                  pending ||
                  passwordRequirements.some((requirement) => !requirement.met) ||
                  !passwordsMatch ||
                  !termsAccepted
                }
                formNoValidate
                onClick={(event) => {
                  if (
                    passwordRequirements.some(
                      (requirement) => !requirement.met,
                    ) ||
                    !passwordsMatch ||
                    !termsAccepted
                  ) {
                    event.preventDefault();
                  }
                }}
                type="submit"
              >
                {pending ? "Criando conta..." : "Criar minha conta"}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-vitta-text">
              Nome profissional ou do negócio
              <input
                autoComplete="organization"
                className={inputClass}
                maxLength={80}
                name="name"
                onChange={(event) => {
                  updateDetail("name", event.currentTarget.value);
                  setNameError("");
                }}
                placeholder="Ex.: Ana HairStudio ou Ana Santos"
                required
                value={details.name}
              />
              {nameError && (
                <span className="mt-1 block text-xs text-rose-700">
                  {nameError}
                </span>
              )}
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-vitta-text">
                CPF
                <input
                  autoComplete="off"
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={14}
                  name="cpf"
                  onChange={(event) => {
                    updateDetail("cpf", formatCpf(event.currentTarget.value));
                    setCpfError("");
                  }}
                  placeholder="000.000.000-00"
                  required
                  value={details.cpf}
                />
                {cpfError && (
                  <span className="mt-1 block text-xs text-rose-700">
                    {cpfError}
                  </span>
                )}
              </label>
              <label className="block text-sm font-medium text-vitta-text">
                Telefone / WhatsApp
                <input
                  autoComplete="tel"
                  className={inputClass}
                  inputMode="tel"
                  maxLength={16}
                  name="phone"
                  onChange={(event) =>
                    updateDetail(
                      "phone",
                      formatBrazilianPhone(event.currentTarget.value),
                    )
                  }
                  placeholder="(11) 99999-9999"
                  required
                  type="tel"
                  value={details.phone}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-vitta-text">
              Especialidade
              <input
                autoComplete="organization-title"
                className={inputClass}
                maxLength={80}
                name="specialty"
                onChange={(event) =>
                  updateDetail("specialty", event.currentTarget.value)
                }
                placeholder="Ex.: Manicure, Esteticista, Cabeleireira"
                required
                value={details.specialty}
              />
            </label>
            <label className="block text-sm font-medium text-vitta-text">
              E-mail de acesso
              <input
                autoComplete="email"
                className={`${inputClass} ${googleRegistration ? "cursor-not-allowed bg-[#f3f0f5] text-vitta-muted" : ""}`}
                maxLength={254}
                name="email"
                onChange={(event) => updateDetail("email", event.target.value)}
                readOnly={googleRegistration}
                required
                type="email"
                value={details.email}
              />
            </label>
            {googleRegistration && (
              <TermsAcceptance
                checked={termsAccepted}
                onChange={setTermsAccepted}
              />
            )}
            {state.error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                {state.error}
              </p>
            )}
            <button
              className="w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white disabled:opacity-60"
              disabled={pending || (googleRegistration && !termsAccepted)}
              type="submit"
            >
              {pending
                ? "Criando conta..."
                : googleRegistration
                  ? "Concluir cadastro"
                  : "Continuar para criar senha"}
            </button>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-vitta-muted">
        Já tem uma conta?{" "}
        <Link
          className="font-semibold text-vitta underline-offset-4 hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </section>
  );
}
