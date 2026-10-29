"use client";

import { useActionState } from "react";
import { useState } from "react";
import { updateAppointmentStatusAction } from "@/app/actions/calendar";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function AppointmentControls({
  appointmentId,
  startsAt,
  status,
}: {
  appointmentId: string;
  startsAt: Date;
  status: "PENDING" | "CONFIRMED";
}) {
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateAppointmentStatusAction,
    initialState,
  );

  return (
    <div className="mt-3 space-y-2">
      <FormFeedback state={state} />
      {showCompletionPrompt ? (
        <div className="rounded-xl border border-vitta-border bg-white p-3">
          <p className="text-sm font-semibold text-vitta-text">
            Este atendimento já foi pago?
          </p>
          <p className="mt-1 text-xs leading-5 text-vitta-muted">
            Se ainda não recebeu, ele será concluído e a receita ficará pendente
            para você marcar como paga no Financeiro.
          </p>
          <form action={formAction} className="mt-3 flex flex-wrap gap-2">
            <input name="appointmentId" type="hidden" value={appointmentId} />
            <input name="intent" type="hidden" value="complete" />
            <button
              className="rounded-lg bg-vitta px-3 py-1.5 text-xs font-medium text-white transition hover:bg-vitta/90 disabled:opacity-60"
              disabled={pending}
              name="paid"
              type="submit"
              value="yes"
            >
              {pending ? "Concluindo..." : "Sim, já foi pago"}
            </button>
            <button
              className="rounded-lg border border-vitta-border px-3 py-1.5 text-xs font-medium text-vitta-text transition hover:bg-vitta-background disabled:opacity-60"
              disabled={pending}
              name="paid"
              type="submit"
              value="no"
            >
              {pending ? "Concluindo..." : "Não, marcar depois"}
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-vitta-muted transition hover:bg-vitta-background disabled:opacity-60"
              disabled={pending}
              onClick={() => setShowCompletionPrompt(false)}
              type="button"
            >
              Voltar
            </button>
          </form>
        </div>
      ) : (
        <form action={formAction} className="flex flex-wrap gap-2">
          <input name="appointmentId" type="hidden" value={appointmentId} />
          {status === "PENDING" && (
            <button
              className="rounded-lg bg-vitta px-3 py-1.5 text-xs font-medium text-white transition hover:bg-vitta/90 disabled:opacity-60"
              disabled={pending}
              name="intent"
              type="submit"
              value="confirm"
            >
              Confirmar horário
            </button>
          )}
          {status === "CONFIRMED" && startsAt <= new Date() && (
            <button
              className="rounded-lg border border-vitta-border px-3 py-1.5 text-xs font-medium text-vitta-text transition hover:bg-vitta-background disabled:opacity-60"
              disabled={pending}
              onClick={() => setShowCompletionPrompt(true)}
              type="button"
            >
              Concluir
            </button>
          )}
          <button
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            disabled={pending}
            name="intent"
            type="submit"
            value="cancel"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
