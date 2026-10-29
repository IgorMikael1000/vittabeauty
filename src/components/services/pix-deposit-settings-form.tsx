"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  configureManualPixDepositAction,
  selectAutomaticPixDepositModeAction,
} from "@/app/actions/services";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};

export function PixDepositSettingsForm({
  pixKey,
  hasConnection,
  hasPendingPayments,
  isAutomatic,
  connected,
}: {
  pixKey: string | null;
  hasConnection: boolean;
  hasPendingPayments: boolean;
  isAutomatic: boolean;
  connected: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    configureManualPixDepositAction,
    initialState,
  );
  const [automaticState, automaticAction, automaticPending] = useActionState(
    selectAutomaticPixDepositModeAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      {connected && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          role="status"
        >
          Conta Mercado Pago conectada. O modo automático está selecionado.
        </p>
      )}

      <section
        className={`rounded-2xl border p-5 ${
          isAutomatic
            ? "border-vitta bg-vitta-background"
            : "border-vitta-border bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-vitta-text">
              Sinal automático
            </h2>
            <p className="mt-2 text-sm leading-6 text-vitta-muted">
              O Vitta gera a cobrança Pix, exibe o QR Code para a cliente e
              confirma o agendamento após validar o pagamento. Por enquanto,
              recebimentos automáticos são feitos por uma conta Mercado Pago.
            </p>
            <p className="mt-2 text-sm leading-6 text-vitta-muted">
              O Mercado Pago cobra uma taxa de 0,99% do valor do sinal.
            </p>
          </div>
          {isAutomatic && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Selecionado
            </span>
          )}
        </div>
        {hasConnection ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-emerald-800">
              Sua conta Mercado Pago está conectada.
            </p>
            {!isAutomatic && (
              <form action={automaticAction}>
                <FormFeedback state={automaticState} />
                <button
                  className="rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
                  disabled={automaticPending}
                  type="submit"
                >
                  {automaticPending ? "Ativando..." : "Usar sinal automático"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <Link
            className="mt-4 inline-flex rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90"
            href="/api/integrations/mercadopago/connect"
          >
            Conectar Mercado Pago
          </Link>
        )}
      </section>

      <section
        className={`rounded-2xl border p-5 ${
          !isAutomatic
            ? "border-vitta bg-vitta-background"
            : "border-vitta-border bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-vitta-text">
              Sinal manual
            </h2>
            <p className="mt-2 text-sm leading-6 text-vitta-muted">
              Informe uma chave Pix de qualquer banco. A cliente fará o
              pagamento fora do Vitta e você deverá conferir o recebimento na
              sua conta e confirmar o agendamento manualmente.
            </p>
          </div>
          {!isAutomatic && pixKey && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Selecionado
            </span>
          )}
        </div>

        <form action={formAction} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-vitta-text">
            Chave Pix para receber o sinal
            <input
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              defaultValue={pixKey ?? ""}
              maxLength={200}
              name="pixKey"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              required
            />
          </label>

          {hasConnection && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <input
                className="mt-1 accent-vitta"
                name="confirmDisconnect"
                required
                type="checkbox"
              />
              <span>
                Entendo que escolher o modo manual desconectará do Vitta a conta
                Mercado Pago atualmente vinculada e interromperá os recebimentos
                automáticos.
              </span>
            </label>
          )}

          {hasPendingPayments && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Há cobranças automáticas pendentes. Aguarde que sejam pagas ou
              expirem antes de trocar para o modo manual.
            </p>
          )}

          <FormFeedback state={state} />
          <button
            className="rounded-xl border border-vitta-border bg-white px-4 py-2.5 text-sm font-semibold text-vitta-text transition hover:border-vitta disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || hasPendingPayments}
            type="submit"
          >
            {pending
              ? "Salvando..."
              : isAutomatic
                ? "Desconectar e usar sinal manual"
                : "Salvar sinal manual"}
          </button>
        </form>
      </section>

      <Link
        className="inline-flex text-sm font-semibold text-vitta hover:underline"
        href="/dashboard/services"
      >
        Voltar para serviços
      </Link>
    </div>
  );
}
