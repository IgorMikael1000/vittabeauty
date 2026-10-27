"use client";

import { useActionState } from "react";
import { createTransactionAction } from "@/app/actions/finance";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(
    createTransactionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-vitta-text">
        Tipo de lançamento
        <select
          className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          defaultValue="INCOME"
          name="type"
        >
          <option value="INCOME">Receita</option>
          <option value="EXPENSE">Despesa</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-vitta-text">
        Descrição
        <input
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={120}
          name="description"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-vitta-text">
          Valor (R$)
          <input
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            min="0.01"
            name="amount"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="block text-sm font-medium text-vitta-text">
          Data prevista (opcional)
          <input
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            name="dueDate"
            type="date"
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-vitta-text">
        Categoria (opcional)
        <input
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={60}
          name="category"
          placeholder="Ex.: Produtos, aluguel"
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-vitta-text">
        <input className="mt-1 accent-vitta" name="paid" type="checkbox" />
        <span>Este lançamento já foi pago ou recebido</span>
      </label>
      <FormFeedback state={state} />
      <button
        className="w-full rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Registrando..." : "Registrar lançamento"}
      </button>
    </form>
  );
}
