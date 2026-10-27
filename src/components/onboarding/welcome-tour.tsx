"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeWelcomeTourAction } from "@/app/actions/onboarding";
import type { FormState } from "@/app/actions/auth";

const slides = [
  {
    eyebrow: "Sua rotina em ordem",
    title: "Agenda inteligente",
    description:
      "Visualize os próximos atendimentos, confirme solicitações e organize seus horários em um só lugar.",
    visual: "calendar",
  },
  {
    eyebrow: "Relacionamentos que crescem",
    title: "Gestão de clientes",
    description:
      "Tenha os contatos e o histórico de cada cliente por perto para oferecer um atendimento mais pessoal.",
    visual: "clients",
  },
  {
    eyebrow: "Seu negócio com clareza",
    title: "Controle financeiro",
    description:
      "Acompanhe receitas, despesas e resultados para tomar decisões com mais confiança.",
    visual: "finance",
  },
] as const;

const initialState: FormState = {};

function SlideVisual({ type }: { type: (typeof slides)[number]["visual"] }) {
  if (type === "calendar") {
    return (
      <div aria-hidden="true" className="rounded-2xl border border-[#eee6f2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0eaf3] pb-3">
          <div>
            <div className="h-2 w-24 rounded bg-[#76509a]" />
            <div className="mt-2 h-1.5 w-16 rounded bg-[#e8dfea]" />
          </div>
          <div className="h-7 w-16 rounded-lg bg-[#f7effa]" />
        </div>
        <div className="mt-3 grid grid-cols-[32px_1fr] gap-x-3 gap-y-2.5">
          {[0, 1, 2].map((row) => (
            <div className="contents" key={row}>
              <div className="mt-1 h-1.5 w-7 rounded bg-[#d8cbdc]" />
              <div
                className={`h-8 rounded-lg border-l-[3px] ${
                  row === 1
                    ? "border-[#d98cb3] bg-[#fbf0f5]"
                    : "border-[#7950a5] bg-[#f5eff8]"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "clients") {
    return (
      <div aria-hidden="true" className="rounded-2xl border border-[#eee6f2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0eaf3] pb-3">
          <div className="h-2 w-28 rounded bg-[#76509a]" />
          <div className="h-7 w-7 rounded-full bg-[#f7effa]" />
        </div>
        <div className="mt-3 space-y-3">
          {["#eadcf0", "#f7e5ed", "#e7e6f4"].map((color, index) => (
            <div className="flex items-center gap-3" key={color}>
              <div
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <div
                  className={`h-2 rounded bg-[#d8cbdc] ${
                    index === 1 ? "w-2/5" : "w-1/2"
                  }`}
                />
                <div className="mt-1.5 h-1.5 w-1/3 rounded bg-[#eee8f0]" />
              </div>
              <div className="h-5 w-14 rounded-full bg-[#f5eff8]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="rounded-2xl border border-[#eee6f2] bg-white p-4 shadow-sm">
      <div className="h-2 w-24 rounded bg-[#76509a]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#f7f1f9] p-3">
          <div className="h-1.5 w-12 rounded bg-[#c6b4d2]" />
          <div className="mt-2 h-3 w-16 rounded bg-[#7950a5]" />
        </div>
        <div className="rounded-xl bg-[#fcf2f6] p-3">
          <div className="h-1.5 w-12 rounded bg-[#ddbbcb]" />
          <div className="mt-2 h-3 w-14 rounded bg-[#d98cb3]" />
        </div>
      </div>
      <div className="mt-4 flex h-16 items-end gap-2 rounded-xl bg-[#fcfafc] px-4 pb-2">
        {[35, 55, 42, 75, 58, 90, 68].map((height, index) => (
          <div
            className={`flex-1 rounded-t ${
              index === 5 ? "bg-[#d98cb3]" : "bg-[#cbb5d8]"
            }`}
            key={height + index}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function WelcomeTour({ trialEndsAt }: { trialEndsAt: string }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [state, formAction, pending] = useActionState(
    completeWelcomeTourAction,
    initialState,
  );
  const router = useRouter();
  const isFinalSlide = slideIndex === slides.length;

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  if (state.success) return null;

  const slide = slides[slideIndex];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/50 px-3 py-5 backdrop-blur-md sm:px-6 sm:py-8">
      <section
        aria-labelledby="welcome-tour-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/70 bg-[#fffefe] shadow-[0_28px_90px_rgba(27,14,39,0.35)]"
        role="dialog"
      >
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-vitta" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-vitta">
              Vitta Beauty · Boas-vindas
            </p>
          </div>
          <span className="text-xs font-medium text-vitta-muted">
            {slideIndex + 1} de {slides.length + 1}
          </span>
        </div>

        <div className="px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
          {isFinalSlide ? (
            <div className="rounded-2xl bg-gradient-to-br from-[#f7effa] via-[#fff8fb] to-[#f8f5fa] px-5 py-8 text-center sm:px-10 sm:py-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-vitta shadow-sm">
                <svg aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d="M20 12v9H4v-9m-2-5h20v5H2zm10 5v9m0-14c-2.2 0-4-1.1-4-2.5S9.8 2 12 4.5m0 2.5c2.2 0 4-1.1 4-2.5S14.2 2 12 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1
                className="mt-5 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl"
                id="welcome-tour-title"
              >
                Seu espaço está pronto para brilhar
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-vitta-muted">
                Você ganhou{" "}
                <strong className="text-vitta-text">
                  3 dias de acesso ilimitado
                </strong>{" "}
                a todas as funções do Vitta Beauty. Seu período grátis termina
                em:
              </p>
              <p className="mt-3 text-base font-semibold text-vitta">
                {trialEndsAt}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
                {slide.eyebrow}
              </p>
              <h1
                className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl"
                id="welcome-tour-title"
              >
                {slide.title}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-vitta-muted">
                {slide.description}
              </p>
              <div className="mt-6 rounded-[20px] bg-[#faf7fb] p-4 sm:p-5">
                <SlideVisual type={slide.visual} />
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: slides.length + 1 }, (_, index) => (
              <span
                aria-current={index === slideIndex ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  index === slideIndex ? "w-7 bg-vitta" : "w-1.5 bg-[#ded3e4]"
                }`}
                key={index}
              />
            ))}
          </div>

          {state.error && (
            <p className="mt-4 text-center text-sm text-red-700" role="alert">
              {state.error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              className="rounded-xl px-4 py-3 text-sm font-semibold text-vitta-muted transition hover:bg-[#f7f2f9] disabled:invisible"
              disabled={slideIndex === 0 || pending}
              onClick={() => setSlideIndex((index) => index - 1)}
              type="button"
            >
              Voltar
            </button>

            {isFinalSlide ? (
              <form action={formAction}>
                <button
                  className="rounded-xl bg-vitta px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(121,80,165,0.24)] transition hover:bg-vitta/90 disabled:cursor-wait disabled:opacity-60 sm:px-6"
                  disabled={pending}
                  type="submit"
                >
                  {pending
                    ? "Preparando seu espaço..."
                    : "Continuar para a plataforma"}
                </button>
              </form>
            ) : (
              <button
                className="rounded-xl bg-vitta px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(121,80,165,0.24)] transition hover:bg-vitta/90"
                onClick={() => setSlideIndex((index) => index + 1)}
                type="button"
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
