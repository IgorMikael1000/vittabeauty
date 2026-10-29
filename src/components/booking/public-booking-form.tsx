"use client";

import { useActionState } from "react";
import { createPublicBookingAction } from "@/app/actions/public-booking";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";
import { formatTime } from "@/lib/schedule";
import type { AvailableSlot } from "@/lib/public-booking";

type PublicBookingFormProps = {
  slug: string;
  serviceId: string;
  requiresPayerEmail: boolean;
  automaticPix: boolean;
  liveModePix: boolean;
  date: string;
  timeZone: string;
  slots: AvailableSlot[];
};

const initialState: FormState = {};

export function PublicBookingForm({
  slug,
  serviceId,
  requiresPayerEmail,
  automaticPix,
  liveModePix,
  date,
  timeZone,
  slots,
}: PublicBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    createPublicBookingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input name="slug" type="hidden" value={slug} />
      <input name="serviceId" type="hidden" value={serviceId} />
      <input name="date" type="hidden" value={date} />

      <fieldset>
        <legend className="text-sm font-semibold text-vitta-text">
          Escolha um horário
        </legend>
        {slots.length === 0 ? (
          <p className="mt-3 rounded-xl bg-vitta-background p-4 text-sm text-vitta-muted">
            Não há horários disponíveis para este serviço nesta data. Escolha
            outro dia para consultar a agenda.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <label className="cursor-pointer" key={slot.value}>
                <input
                  className="peer sr-only"
                  name="startsAt"
                  required
                  type="radio"
                  value={slot.value}
                />
                <span className="block rounded-xl border border-vitta-border px-3 py-2.5 text-center text-sm font-medium text-vitta-text transition hover:border-vitta peer-checked:border-vitta peer-checked:bg-vitta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-vitta peer-focus-visible:ring-offset-2">
                  {formatTime(slot.startsAt, timeZone)}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-vitta-text">
          Seu nome
          <input
            autoComplete="name"
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            maxLength={100}
            name="name"
            required
          />
        </label>
        <label className="block text-sm font-medium text-vitta-text">
          WhatsApp com DDD
          <input
            autoComplete="tel"
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            inputMode="tel"
            maxLength={24}
            name="whatsapp"
            placeholder="(11) 99999-9999"
            required
            type="tel"
          />
        </label>
      </div>

      {requiresPayerEmail && (
        <label className="block text-sm font-medium text-vitta-text">
          E-mail para gerar o Pix
          <input
            autoComplete="email"
            className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
      )}

      {liveModePix && (
        <p
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          Atenção: a conta Mercado Pago conectada está em produção. Esta
          cobrança Pix pode movimentar dinheiro real.
        </p>
      )}

      <label className="block text-sm font-medium text-vitta-text">
        Observações (opcional)
        <textarea
          className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
          maxLength={500}
          name="notes"
          rows={3}
        />
      </label>

      <FormFeedback state={state} />
      <button
        className="w-full rounded-xl bg-vitta px-5 py-3 font-semibold text-white transition hover:bg-vitta/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending || slots.length === 0}
        type="submit"
      >
        {pending ? "Enviando solicitação..." : "Solicitar agendamento"}
      </button>
      <p className="text-center text-xs leading-5 text-vitta-muted">
        {automaticPix
          ? "O agendamento será confirmado automaticamente após a aprovação do Pix."
          : "O horário será solicitado à profissional e precisa ser confirmado."}
      </p>
    </form>
  );
}
