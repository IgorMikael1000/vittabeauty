"use client";

import { useActionState, useState } from "react";
import { createAppointmentAction } from "@/app/actions/calendar";
import type { FormState } from "@/app/actions/auth";
import { ClientAutocomplete } from "@/components/calendar/client-autocomplete";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

type ScheduleFormsProps = {
  services: Array<{ id: string; name: string; durationMinutes: number }>;
};

export function ScheduleForms({ services }: ScheduleFormsProps) {
  const [hasSelectedClient, setHasSelectedClient] = useState(false);
  const [appointmentState, appointmentAction, appointmentPending] =
    useActionState(createAppointmentAction, initialState);

  return (
    <div className="space-y-5">
      <details className="rounded-2xl border border-vitta-border bg-white shadow-card">
        <summary className="cursor-pointer list-none p-5 sm:p-6">
          <span className="block font-semibold text-vitta-text">
            Novo atendimento
          </span>
          <span className="mt-1 block text-sm text-vitta-muted">
            Agende um horário para um cliente cadastrado.
          </span>
        </summary>
        <form action={appointmentAction} className="space-y-4 border-t border-vitta-border p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <ClientAutocomplete onSelectionChange={setHasSelectedClient} />
            <label className="block text-sm font-medium text-vitta-text">
              Serviço
              <select
                className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                name="serviceId"
                required
              >
                <option value="">Selecione um serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-vitta-text">
            Início
            <input
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="block text-sm font-medium text-vitta-text">
            Observações
            <textarea
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              maxLength={1000}
              name="notes"
              rows={2}
            />
          </label>
          {services.length === 0 && (
            <p className="text-sm text-amber-800">
              Cadastre um serviço ativo antes de criar um atendimento.
            </p>
          )}
          <FormFeedback state={appointmentState} />
          <button
            className="rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
            disabled={
              appointmentPending || !hasSelectedClient || services.length === 0
            }
            type="submit"
          >
            {appointmentPending ? "Agendando..." : "Agendar atendimento"}
          </button>
        </form>
      </details>

    </div>
  );
}
