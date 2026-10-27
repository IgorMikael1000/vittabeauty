"use client";

import { useActionState } from "react";
import { toggleServiceActiveAction } from "@/app/actions/services";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function ToggleServiceActiveForm({
  serviceId,
  active,
}: {
  serviceId: string;
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleServiceActiveAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input name="serviceId" type="hidden" value={serviceId} />
      <input name="active" type="hidden" value={String(!active)} />
      <FormFeedback state={state} />
      <button
        className="rounded-xl border border-vitta-border px-3 py-2 text-sm font-medium text-vitta-text transition hover:bg-vitta-background disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : active ? "Desativar serviço" : "Reativar serviço"}
      </button>
    </form>
  );
}
