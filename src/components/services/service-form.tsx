"use client";

import { useActionState, useState } from "react";
import { savePixKeyAction, saveServiceAction } from "@/app/actions/services";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

export type ServiceFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: string;
  materialCost?: string;
  depositAmount?: string;
  durationMinutes?: number;
  onlineBookingEnabled?: boolean;
  isActive?: boolean;
};

const initialState: FormState = {};

export function ServiceForm({
  service,
  hasPixKey: initialHasPixKey,
}: {
  service?: ServiceFormValues;
  hasPixKey: boolean;
}) {
  const [hasPixKey, setHasPixKey] = useState(initialHasPixKey);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveServiceAction,
    initialState,
  );
  const [pixState, setPixState] = useState(initialState);
  const [pixPending, setPixPending] = useState(false);

  async function handlePixKeySave(formData: FormData) {
    setPixPending(true);
    try {
      const result = await savePixKeyAction(initialState, formData);
      setPixState(result);
      if (result.success) {
      setHasPixKey(true);
      setIsPixDialogOpen(false);
      }
    } finally {
      setPixPending(false);
    }
  }

  return (
    <>
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
        Valor do Sinal (R$ - Opcional)
        <input
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15 disabled:cursor-not-allowed disabled:bg-vitta-background disabled:text-vitta-muted"
          disabled={!hasPixKey}
          min="0"
          max={service?.price}
          name="depositAmount"
          step="0.01"
          type="number"
          defaultValue={service?.depositAmount ?? "0"}
        />
        {!hasPixKey && (
          <button
            className="mt-2 text-left text-xs font-semibold text-vitta underline decoration-vitta/40 underline-offset-2 hover:text-vitta/80"
            onClick={() => setIsPixDialogOpen(true)}
            type="button"
          >
            Para exigir sinal, cadastre sua Chave PIX primeiro
          </button>
        )}
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
    {isPixDialogOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pixPending) {
            setIsPixDialogOpen(false);
          }
        }}
      >
        <section
          aria-labelledby="pix-dialog-title"
          aria-modal="true"
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-vitta-text"
                id="pix-dialog-title"
              >
                Cadastrar chave PIX
              </h2>
              <p className="mt-1 text-sm leading-5 text-vitta-muted">
                Esta chave será exibida às clientes que precisarem pagar um
                sinal para solicitar o agendamento.
              </p>
            </div>
            <button
              aria-label="Fechar"
              className="rounded-lg px-2 py-1 text-vitta-muted hover:bg-vitta-background disabled:opacity-50"
              disabled={pixPending}
              onClick={() => setIsPixDialogOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <form action={handlePixKeySave} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-vitta-text">
              Chave PIX
              <input
                autoComplete="off"
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                maxLength={200}
                name="pixKey"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                required
              />
            </label>
            <FormFeedback state={pixState} />
            <button
              className="w-full rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
              disabled={pixPending}
              type="submit"
            >
              {pixPending ? "Salvando..." : "Salvar chave PIX"}
            </button>
          </form>
        </section>
      </div>
    )}
    </>
  );
}
