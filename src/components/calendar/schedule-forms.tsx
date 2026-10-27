"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  createAppointmentAction,
  createCalendarBlockAction,
  saveWorkingHoursAction,
} from "@/app/actions/calendar";
import type { FormState } from "@/app/actions/auth";
import { FormFeedback } from "@/components/forms/form-feedback";

const initialState: FormState = {};
const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type ScheduleFormsProps = {
  clients: Array<{ id: string; name: string; whatsapp: string }>;
  services: Array<{ id: string; name: string; durationMinutes: number }>;
  workingHours: Array<{
    weekday: number;
    startMinute: number;
    endMinute: number;
    isActive: boolean;
  }>;
};

function minuteToTime(value: number): string {
  const hour = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minute = (value % 60).toString().padStart(2, "0");

  return `${hour}:${minute}`;
}

export function ScheduleForms({
  clients,
  services,
  workingHours,
}: ScheduleFormsProps) {
  const router = useRouter();
  const [appointmentState, appointmentAction, appointmentPending] =
    useActionState(createAppointmentAction, initialState);
  const [blockState, blockAction, blockPending] = useActionState(
    createCalendarBlockAction,
    initialState,
  );
  const [hoursState, hoursAction, hoursPending] = useActionState(
    async (previousState: FormState, formData: FormData) => {
      const result = await saveWorkingHoursAction(previousState, formData);
      if (result.success) {
        router.refresh();
      }
      return result;
    },
    initialState,
  );
  const hoursByWeekday = new Map(
    workingHours.map((hours) => [hours.weekday, hours]),
  );

  return (
    <div className="space-y-5">
      <details className="rounded-2xl border border-vitta-border bg-white shadow-card">
        <summary className="cursor-pointer list-none p-5 sm:p-6">
          <span className="block font-semibold text-vitta-text">
            Novo atendimento
          </span>
          <span className="mt-1 block text-sm text-vitta-muted">
            Agende um horário para um cliente cadastrado.
          </span>
        </summary>
        <form action={appointmentAction} className="space-y-4 border-t border-vitta-border p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-vitta-text">
              Cliente
              <select
                className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                name="clientId"
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} · {client.whatsapp}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-vitta-text">
              Serviço
              <select
                className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                name="serviceId"
                required
              >
                <option value="">Selecione um serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-vitta-text">
            Início
            <input
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="block text-sm font-medium text-vitta-text">
            Observações
            <textarea
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              maxLength={1000}
              name="notes"
              rows={2}
            />
          </label>
          {clients.length === 0 && (
            <p className="text-sm text-amber-800">
              Cadastre um cliente antes de criar um atendimento.
            </p>
          )}
          {services.length === 0 && (
            <p className="text-sm text-amber-800">
              Cadastre um serviço ativo antes de criar um atendimento.
            </p>
          )}
          <FormFeedback state={appointmentState} />
          <button
            className="rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
            disabled={
              appointmentPending || clients.length === 0 || services.length === 0
            }
            type="submit"
          >
            {appointmentPending ? "Agendando..." : "Agendar atendimento"}
          </button>
        </form>
      </details>

      <details className="rounded-2xl border border-vitta-border bg-white shadow-card">
        <summary className="cursor-pointer list-none p-5 sm:p-6">
          <span className="block font-semibold text-vitta-text">
            Bloquear horário
          </span>
          <span className="mt-1 block text-sm text-vitta-muted">
            Reserve um período para folga, pausa ou compromisso.
          </span>
        </summary>
        <form action={blockAction} className="space-y-4 border-t border-vitta-border p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-vitta-text">
              Início
              <input
                className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                name="startsAt"
                required
                type="datetime-local"
              />
            </label>
            <label className="block text-sm font-medium text-vitta-text">
              Fim
              <input
                className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                name="endsAt"
                required
                type="datetime-local"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-vitta-text">
            Motivo (opcional)
            <input
              className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              maxLength={120}
              name="reason"
            />
          </label>
          <FormFeedback state={blockState} />
          <button
            className="rounded-xl border border-vitta px-4 py-2.5 text-sm font-semibold text-vitta transition hover:bg-vitta/5 disabled:opacity-60"
            disabled={blockPending}
            type="submit"
          >
            {blockPending ? "Bloqueando..." : "Bloquear horário"}
          </button>
        </form>
      </details>

      <details className="rounded-2xl border border-vitta-border bg-white shadow-card">
        <summary className="cursor-pointer list-none p-5 sm:p-6">
          <span className="block font-semibold text-vitta-text">
            Regras de funcionamento
          </span>
          <span className="mt-1 block text-sm text-vitta-muted">
            Defina o expediente usado para validar novos atendimentos.
          </span>
        </summary>
        <form action={hoursAction} className="min-w-0 border-t border-vitta-border p-4 sm:p-6">
          <div className="grid min-w-0 gap-3">
            {weekdays.map((weekdayName, weekday) => {
              const hours = hoursByWeekday.get(weekday);

              return (
                <fieldset
                  className="min-w-0 rounded-2xl border border-vitta-border/80 bg-gradient-to-br from-white to-vitta-background/70 p-3.5 sm:p-4"
                  key={weekday}
                >
                  <legend className="sr-only">{weekdayName}</legend>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <label className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-vitta-text">
                      <input
                        className="h-4 w-4 shrink-0 accent-vitta"
                        defaultChecked={hours?.isActive ?? false}
                        name={`day-${weekday}-active`}
                        type="checkbox"
                      />
                      <span className="truncate">{weekdayName}</span>
                    </label>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        hours?.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#f0edf2] text-vitta-muted"
                      }`}
                    >
                      {hours?.isActive ? "Aberto" : "Fechado"}
                    </span>
                  </div>
                  <div className="mt-3 grid min-w-0 grid-cols-2 gap-2.5">
                    <label className="min-w-0 text-[11px] font-semibold text-vitta-muted">
                      Abre às
                      <input
                        className="mt-1 block min-w-0 w-full rounded-xl border border-vitta-border bg-white px-2 py-2.5 text-sm font-medium text-vitta-text"
                        defaultValue={minuteToTime(hours?.startMinute ?? 540)}
                        name={`day-${weekday}-start`}
                        required
                        type="time"
                      />
                    </label>
                    <label className="min-w-0 text-[11px] font-semibold text-vitta-muted">
                      Fecha às
                      <input
                        className="mt-1 block min-w-0 w-full rounded-xl border border-vitta-border bg-white px-2 py-2.5 text-sm font-medium text-vitta-text"
                        defaultValue={minuteToTime(hours?.endMinute ?? 1020)}
                        name={`day-${weekday}-end`}
                        required
                        type="time"
                      />
                    </label>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <FormFeedback state={hoursState} />
          <button
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-48"
            disabled={hoursPending}
            type="submit"
          >
            {hoursPending ? "Salvando..." : "Salvar expediente"}
          </button>
        </form>
      </details>
    </div>
  );
}
