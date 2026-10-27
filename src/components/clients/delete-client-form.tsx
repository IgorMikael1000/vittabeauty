"use client";

import { useActionState } from "react";
import { deleteClientAction } from "@/app/actions/clients";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function DeleteClientForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteClientAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (!window.confirm("Deseja excluir este cliente?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="clientId" type="hidden" value={clientId} />
      <FormFeedback state={state} />
      <button
        className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        Excluir cliente
      </button>
    </form>
  );
}
