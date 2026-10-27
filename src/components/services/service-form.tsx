"use client";

import { useActionState } from "react";
import { saveServiceAction } from "@/app/actions/services";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

export type ServiceFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: string;
  materialCost?: string;
  durationMinutes?: number;
  onlineBookingEnabled?: boolean;
  isActive?: boolean;
};

const initialState: FormState = {};

export function ServiceForm({
  service,
}: {
  service?: ServiceFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    saveServiceAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {service?.id && (
        <input name="serviceId" type="hidden" value={service.id} />
      )}
      <p className="text-sm font-semibold text-vitta-text">
        {service ? "Editar serviço" : "Novo serviço"}
      </p>
      <label className="block text-sm font-medium text-vitta-text">
        Nome do procedimento
        <input
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={100}
          name="name"
          required
          defaultValue={service?.name ?? ""}
        />
      </label>
      <label className="block text-sm font-medium text-vitta-text">
        Descrição
        <textarea
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={500}
          name="description"
          rows={2}
          defaultValue={service?.description ?? ""}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-vitta-text">
          Preço (R$)
          <input
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            min="0.01"
            name="price"
            required
            step="0.01"
            type="number"
            defaultValue={service?.price ?? ""}
          />
        </label>
        <label className="block text-sm font-medium text-vitta-text">
          Duração (minutos)
          <input
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            max={1440}
            min={5}
            name="durationMinutes"
            required
            step={5}
            type="number"
            defaultValue={service?.durationMinutes ?? 60}
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-vitta-text">
        <span className="flex items-center gap-2">
          Custo de Material (R$)
          <span
            aria-label="Estimativa de gastos com produtos, descartáveis e insumos para cada sessão. Deixe 0 se não houver custo direto."
            className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-vitta-border text-xs font-semibold text-vitta-muted"
            title="Estimativa de gastos com produtos, descartáveis e insumos para cada sessão. Deixe 0 se não houver custo direto."
          >
            ?
          </span>
        </span>
        <input
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          min="0"
          name="materialCost"
          required
          step="0.01"
          type="number"
          defaultValue={service?.materialCost ?? "0"}
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-vitta-text">
        <input
          className="mt-1 accent-vitta"
          defaultChecked={service?.onlineBookingEnabled ?? true}
          name="onlineBookingEnabled"
          type="checkbox"
        />
        <span>Permitir agendamento online</span>
      </label>
      {service && (
        <label className="flex items-start gap-3 text-sm text-vitta-text">
          <input
            className="mt-1 accent-vitta"
            defaultChecked={service.isActive ?? true}
            name="isActive"
            type="checkbox"
          />
          <span>Serviço ativo</span>
        </label>
      )}
      <FormFeedback state={state} />
      <button
        className="w-full rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : service ? "Salvar alterações" : "Cadastrar serviço"}
      </button>
    </form>
  );
}
