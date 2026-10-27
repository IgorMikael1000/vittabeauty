"use client";

import { useActionState } from "react";
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
  const [appointmentState, appointmentAction, appointmentPending] =
    useActionState(createAppointmentAction, initialState);
  const [blockState, blockAction, blockPending] = useActionState(
    createCalendarBlockAction,
    initialState,
  );
  const [hoursState, hoursAction, hoursPending] = useActionState(
    saveWorkingHoursAction,
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
        <form action={hoursAction} className="border-t border-vitta-border p-5 sm:p-6">
          <div className="space-y-3">
            {weekdays.map((weekdayName, weekday) => {
              const hours = hoursByWeekday.get(weekday);

              return (
                <fieldset
                  className="grid gap-3 rounded-xl bg-vitta-background p-3 sm:grid-cols-[minmax(130px,1fr)_auto_auto_auto] sm:items-end"
                  key={weekday}
                >
                  <legend className="sr-only">{weekdayName}</legend>
                  <label className="flex items-center gap-2 text-sm font-medium text-vitta-text">
                    <input
                      className="accent-vitta"
                      defaultChecked={hours?.isActive ?? false}
                      name={`day-${weekday}-active`}
                      type="checkbox"
                    />
                    {weekdayName}
                  </label>
                  <label className="text-xs font-medium text-vitta-muted">
                    Abre
                    <input
                      className="mt-1 block w-full rounded-lg border border-vitta-border bg-white px-2.5 py-2 text-sm text-vitta-text"
                      defaultValue={minuteToTime(hours?.startMinute ?? 540)}
                      name={`day-${weekday}-start`}
                      required
                      type="time"
                    />
                  </label>
                  <label className="text-xs font-medium text-vitta-muted">
                    Fecha
                    <input
                      className="mt-1 block w-full rounded-lg border border-vitta-border bg-white px-2.5 py-2 text-sm text-vitta-text"
                      defaultValue={minuteToTime(hours?.endMinute ?? 1020)}
                      name={`day-${weekday}-end`}
                      required
                      type="time"
                    />
                  </label>
                  <span className="text-xs text-vitta-muted">
                    {hours?.isActive ? "Configurado" : "Fechado"}
                  </span>
                </fieldset>
              );
            })}
          </div>
          <FormFeedback state={hoursState} />
          <button
            className="mt-4 rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:opacity-60"
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
