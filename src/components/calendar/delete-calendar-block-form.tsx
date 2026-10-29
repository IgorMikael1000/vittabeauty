"use client";

import { useActionState } from "react";
import { deleteCalendarBlockAction } from "@/app/actions/calendar";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function DeleteCalendarBlockForm({
  blockId,
  isFullDay,
}: {
  blockId: string;
  isFullDay: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCalendarBlockAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input name="blockId" type="hidden" value={blockId} />
      <FormFeedback state={state} />
      <button
        className="rounded-lg border border-vitta-border px-3 py-1.5 text-xs font-medium text-vitta-text transition hover:bg-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Removendo..."
          : isFullDay
            ? "Desbloquear dia"
            : "Remover bloqueio"}
      </button>
    </form>
  );
}
