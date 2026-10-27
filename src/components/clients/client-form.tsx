"use client";

import { useActionState } from "react";
import { saveClientAction } from "@/app/actions/clients";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

type ClientFormValues = {
  id?: string;
  name?: string;
  whatsapp?: string;
  preferredServiceId?: string | null;
  notes?: string | null;
};

type ClientFormProps = {
  client?: ClientFormValues;
  services: Array<{ id: string; name: string }>;
  compact?: boolean;
};

const initialState: FormState = {};

export function ClientForm({
  client,
  services,
  compact = false,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(
    saveClientAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      {client?.id && (
        <input name="clientId" type="hidden" value={client.id} />
      )}
      {!compact && (
        <p className="text-sm font-semibold text-vitta-text">
          {client ? "Editar cliente" : "Novo cliente"}
        </p>
      )}
      <label className="block text-sm font-medium text-vitta-text">
        Nome
        <input
          autoComplete="name"
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={100}
          name="name"
          required
          defaultValue={client?.name ?? ""}
        />
      </label>
      <label className="block text-sm font-medium text-vitta-text">
        WhatsApp
        <input
          autoComplete="tel"
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={24}
          name="whatsapp"
          placeholder="(11) 99999-9999"
          required
          type="tel"
          defaultValue={client?.whatsapp ?? ""}
        />
      </label>
      <label className="block text-sm font-medium text-vitta-text">
        Serviço preferido
        <select
          className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          name="preferredServiceId"
          defaultValue={client?.preferredServiceId ?? ""}
        >
          <option value="">Não informado</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-vitta-text">
        Observações
        <textarea
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={1000}
          name="notes"
          rows={compact ? 2 : 3}
          defaultValue={client?.notes ?? ""}
        />
      </label>
      <FormFeedback state={state} />
      <button
        className="w-full rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}
      </button>
    </form>
  );
}
