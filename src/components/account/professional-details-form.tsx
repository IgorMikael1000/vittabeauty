"use client";

import { useActionState } from "react";
import { updateProfessionalDetailsAction } from "@/app/actions/account";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
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

export function ProfessionalDetailsForm({
  professional,
}: {
  professional: ProfessionalDetails;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfessionalDetailsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="block text-sm font-medium text-vitta-text">
        Nome profissional
        <input
          autoComplete="organization"
          className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
          className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
          defaultValue={professional.email}
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>

      <label className="block text-sm font-medium text-vitta-text">
        Telefone / WhatsApp
        <input
          autoComplete="tel"
          className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
          className="mt-2 w-full rounded-2xl border border-[#e9e3ed] bg-[#fcfbfd] px-4 py-3.5 text-vitta-text outline-none transition"
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
