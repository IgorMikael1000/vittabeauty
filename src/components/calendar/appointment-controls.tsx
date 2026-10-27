"use client";

import { useActionState } from "react";
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
  const [state, formAction, pending] = useActionState(
    updateAppointmentStatusAction,
    initialState,
  );

  return (
    <div className="mt-3 space-y-2">
      <FormFeedback state={state} />
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
            name="intent"
            type="submit"
            value="complete"
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
    </div>
  );
}
