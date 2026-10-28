"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveWorkingHoursRulesAction } from "@/app/actions/calendar";
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
const intervals = [15, 30, 45, 60] as const;

type WorkingHour = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  interval: number;
  blockedSlots: string[];
  isActive: boolean;
};

function minuteToTime(value: number): string {
  const hour = Math.floor(value / 60).toString().padStart(2, "0");
  const minute = (value % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function timeToMinute(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function WorkingHoursSettings({
  workingHours,
}: {
  workingHours: WorkingHour[];
}) {
  const router = useRouter();
  const initialSource =
    workingHours.find((hours) => hours.isActive) ?? workingHours[1];
  const [sourceWeekday, setSourceWeekday] = useState(initialSource.weekday);
  const [startTime, setStartTime] = useState(
    minuteToTime(initialSource.startMinute),
  );
  const [endTime, setEndTime] = useState(minuteToTime(initialSource.endMinute));
  const [interval, setInterval] = useState(initialSource.interval);
  const [blockedSlots, setBlockedSlots] = useState(
    initialSource.blockedSlots,
  );
  const [activeWeekdays, setActiveWeekdays] = useState(
    () =>
      new Set(
        workingHours
          .filter((hours) => hours.isActive)
          .map((hours) => hours.weekday),
      ),
  );
  const [applyTo, setApplyTo] = useState<"all" | "day">("all");
  const [targetWeekday, setTargetWeekday] = useState(
    initialSource.weekday,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, saveAction, pending] = useActionState(
    async (previousState: FormState, formData: FormData) => {
      const result = await saveWorkingHoursRulesAction(previousState, formData);
      if (result.success) {
        setDialogOpen(false);
        if (applyTo === "day") {
          setActiveWeekdays((current) => new Set(current).add(targetWeekday));
          setSourceWeekday(targetWeekday);
        } else {
          const firstActiveWeekday = Array.from(activeWeekdays)[0];
          if (firstActiveWeekday !== undefined) {
            setSourceWeekday(firstActiveWeekday);
          }
        }
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  const previewSlots = useMemo(() => {
    const startMinute = timeToMinute(startTime);
    const endMinute = timeToMinute(endTime);
    if (
      startMinute === null ||
      endMinute === null ||
      endMinute <= startMinute ||
      !intervals.includes(interval as (typeof intervals)[number])
    ) {
      return [];
    }

    const slots: string[] = [];
    for (
      let minute = startMinute;
      minute + interval <= endMinute;
      minute += interval
    ) {
      slots.push(minuteToTime(minute));
    }
    return slots;
  }, [startTime, endTime, interval]);

  const visibleBlockedSlots = blockedSlots.filter((slot) =>
    previewSlots.includes(slot),
  );

  function loadDay(weekday: number) {
    const hours = workingHours.find((item) => item.weekday === weekday);
    setSourceWeekday(weekday);
    setTargetWeekday(weekday);
    setStartTime(minuteToTime(hours?.startMinute ?? 9 * 60));
    setEndTime(minuteToTime(hours?.endMinute ?? 17 * 60));
    setInterval(hours?.interval ?? 15);
    setBlockedSlots(hours?.blockedSlots ?? []);
  }

  function toggleWeekday(weekday: number) {
    setActiveWeekdays((current) => {
      const next = new Set(current);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });
  }

  function toggleBlockedSlot(slot: string) {
    setBlockedSlots((current) =>
      current.includes(slot)
        ? current.filter((value) => value !== slot)
        : [...current, slot].sort(),
    );
  }

  return (
    <>
      <form
        action={saveAction}
        className="space-y-6"
        id="working-hours-form"
      >
        <input name="applyTo" type="hidden" value={applyTo} />
        <input name="weekday" type="hidden" value={targetWeekday} />
        <input
          name="blockedSlots"
          type="hidden"
          value={JSON.stringify(visibleBlockedSlots)}
        />
        {Array.from(activeWeekdays).map((weekday) => (
          <input
            key={weekday}
            name="activeWeekday"
            type="hidden"
            value={weekday}
          />
        ))}
        <input name="interval" type="hidden" value={interval} />
        <input name="startTime" type="hidden" value={startTime} />
        <input name="endTime" type="hidden" value={endTime} />

        <section className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <p className="text-sm font-semibold text-vitta-text">
            Expediente e intervalo
          </p>
          <p className="mt-1 text-sm text-vitta-muted">
            Defina a grade que será usada para oferecer horários de atendimento.
          </p>
          <label className="mt-4 block max-w-sm text-sm font-medium text-vitta-text">
            Carregar regras de um dia
            <select
              className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5"
              onChange={(event) => loadDay(Number(event.target.value))}
              value={sourceWeekday}
            >
              {weekdays.map((name, weekday) => (
                <option key={weekday} value={weekday}>
                  {name}
                  {activeWeekdays.has(weekday) ? "" : " · fechado"}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-vitta-text">
              Início
              <input
                className="mt-1.5 block w-full rounded-xl border border-vitta-border px-3 py-2.5"
                onChange={(event) => setStartTime(event.target.value)}
                required
                type="time"
                value={startTime}
              />
            </label>
            <label className="text-sm font-medium text-vitta-text">
              Fim
              <input
                className="mt-1.5 block w-full rounded-xl border border-vitta-border px-3 py-2.5"
                onChange={(event) => setEndTime(event.target.value)}
                required
                type="time"
                value={endTime}
              />
            </label>
            <label className="text-sm font-medium text-vitta-text">
              Intervalo
              <select
                className="mt-1.5 block w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5"
                onChange={(event) => setInterval(Number(event.target.value))}
                value={interval}
              >
                {intervals.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-vitta-text">
                Pausas recorrentes
              </h2>
              <p className="mt-1 text-sm text-vitta-muted">
                Selecione os horários que devem ficar indisponíveis.
              </p>
            </div>
            <p className="text-xs text-vitta-muted">
              {visibleBlockedSlots.length} pausa(s) selecionada(s)
            </p>
          </div>
          {previewSlots.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
              {previewSlots.map((slot) => {
                const blocked = visibleBlockedSlots.includes(slot);
                return (
                  <button
                    aria-pressed={blocked}
                    aria-label={`${slot}: ${
                      blocked ? "pausa recorrente" : "disponível"
                    }`}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      blocked
                        ? "border-slate-300 bg-slate-100 text-slate-400 opacity-60"
                        : "border-vitta-border bg-white text-vitta-text hover:border-vitta hover:text-vitta"
                    }`}
                    key={slot}
                    onClick={() => toggleBlockedSlot(slot)}
                    type="button"
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Informe um horário final posterior ao início para visualizar a
              grade.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-semibold text-vitta-text">
            Dias de funcionamento
          </h2>
          <p className="mt-1 text-sm text-vitta-muted">
            Marque os dias que devem permanecer abertos. Ao aplicar regras a
            todos, elas serão atualizadas somente nos dias marcados.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {weekdays.map((name, weekday) => (
              <label
                className="flex items-center gap-2 rounded-xl border border-vitta-border px-3 py-2.5 text-sm text-vitta-text"
                key={weekday}
              >
                <input
                  checked={activeWeekdays.has(weekday)}
                  className="h-4 w-4 accent-vitta"
                  onChange={() => toggleWeekday(weekday)}
                  type="checkbox"
                />
                {name}
              </label>
            ))}
          </div>
        </section>

        <FormFeedback state={state} />
        <button
          className="rounded-xl bg-vitta px-5 py-3 text-sm font-semibold text-white transition hover:bg-vitta/90"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          Salvar regras
        </button>
      </form>

      {dialogOpen && (
        <div
          aria-labelledby="apply-working-hours-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2
              className="text-lg font-semibold text-vitta-text"
              id="apply-working-hours-title"
            >
              Como deseja aplicar essas regras?
            </h2>
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Aplicação das regras</legend>
              <label className="flex items-start gap-3 rounded-xl border border-vitta-border p-3">
                <input
                  checked={applyTo === "all"}
                  className="mt-1 accent-vitta"
                  name="applyMode"
                  onChange={() => setApplyTo("all")}
                  type="radio"
                />
                <span>
                  <span className="block text-sm font-semibold text-vitta-text">
                    Todos os dias de funcionamento
                  </span>
                  <span className="mt-1 block text-xs text-vitta-muted">
                    Aplica o mesmo expediente, intervalo e pausas aos dias
                    marcados.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-vitta-border p-3">
                <input
                  checked={applyTo === "day"}
                  className="mt-1 accent-vitta"
                  name="applyMode"
                  onChange={() => setApplyTo("day")}
                  type="radio"
                />
                <span className="block flex-1">
                  <span className="block text-sm font-semibold text-vitta-text">
                    Dia específico
                  </span>
                  <span className="mt-1 block text-xs text-vitta-muted">
                    Atualiza somente o dia selecionado.
                  </span>
                  {applyTo === "day" && (
                    <select
                      className="mt-3 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 text-sm"
                      onChange={(event) =>
                        setTargetWeekday(Number(event.target.value))
                      }
                      value={targetWeekday}
                    >
                      {weekdays.map((name, weekday) => (
                        <option key={weekday} value={weekday}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              </label>
            </fieldset>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-vitta-border px-4 py-2.5 text-sm font-semibold text-vitta-text"
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-vitta px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                disabled={pending}
                form="working-hours-form"
                type="submit"
              >
                {pending ? "Salvando..." : "Aplicar regras"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
