"use client";

import { useActionState } from "react";
import { updateTransactionStatusAction } from "@/app/actions/finance";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function TransactionStatusForm({
  transactionId,
  canCancel,
}: {
  transactionId: string;
  canCancel: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateTransactionStatusAction,
    initialState,
  );

  return (
    <div className="mt-3 space-y-2">
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input name="transactionId" type="hidden" value={transactionId} />
          <input name="status" type="hidden" value="PAID" />
          <button
            className="rounded-lg bg-vitta px-3 py-2 text-xs font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            Marcar como pago
          </button>
        </form>
        {canCancel && (
          <form action={formAction}>
            <input name="transactionId" type="hidden" value={transactionId} />
            <input name="status" type="hidden" value="CANCELLED" />
            <button
              className="rounded-lg border border-vitta-border px-3 py-2 text-xs font-semibold text-vitta-text transition hover:bg-vitta-background disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              Cancelar lançamento
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
