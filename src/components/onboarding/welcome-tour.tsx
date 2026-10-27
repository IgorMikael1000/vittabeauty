"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeWelcomeTourAction } from "@/app/actions/onboarding";
import type { FormState } from "@/app/actions/auth";

const slides = [
  {
    title: "Tela Inicial",
    description:
      "Tenha uma visão geral do seu espaço de beleza e acesse rapidamente as principais áreas da plataforma.",
    image: "/brand/slide_1.png",
    alt: "Tela inicial do dashboard Vitta Beauty",
  },
  {
    title: "Agenda",
    description:
      "Controle horários, compromissos e marcações das clientes de forma intuitiva.",
    image: "/brand/slide_2.png",
    alt: "Tela de agenda do Vitta Beauty",
  },
  {
    title: "Clientes (CRM)",
    description:
      "Consulte o histórico de atendimento, preferências e cadastre informações detalhadas do seu público.",
    image: "/brand/slide_3.png",
    alt: "Tela de gestão de clientes do Vitta Beauty",
  },
  {
    title: "Serviços",
    description:
      "Gerencie os procedimentos realizados, preços e custos de materiais por atendimento.",
    image: "/brand/slide_4.png",
    alt: "Tela de gestão de serviços do Vitta Beauty",
  },
  {
    title: "Financeiro",
    description:
      "Acompanhe lucros, faturamento e fluxo de caixa para cuidar da saúde financeira do seu negócio.",
    image: "/brand/slide_5.png",
    alt: "Tela financeira do Vitta Beauty",
  },
  {
    title: "Relatórios",
    description:
      "Veja métricas de desempenho e produtividade do seu negócio em um só lugar.",
    image: "/brand/slide_6.png",
    alt: "Tela de relatórios do Vitta Beauty",
  },
  {
    title: "Meu Link",
    description:
      "Compartilhe sua página personalizada de agendamento online nas redes sociais e facilite as marcações.",
    image: "/brand/slide_7.png",
    alt: "Tela do link público de agendamento do Vitta Beauty",
  },
] as const;

const initialState: FormState = {};
const finalSlideIndex = slides.length;
const totalSlides = slides.length + 1;

export function WelcomeTour({ trialEndsAt }: { trialEndsAt: string }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    completeWelcomeTourAction,
    initialState,
  );
  const router = useRouter();
  const isFinalSlide = slideIndex === finalSlideIndex;
  const currentSlide = isFinalSlide ? null : slides[slideIndex];

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  useEffect(() => {
    if (!zoomOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomOpen]);

  if (state.success) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/50 px-3 py-5 backdrop-blur-md sm:px-6 sm:py-8">
      <section
        aria-labelledby="welcome-tour-title"
        aria-modal="true"
        className="my-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-[#fffefe] shadow-[0_28px_90px_rgba(27,14,39,0.35)]"
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
            {slideIndex + 1} de {totalSlides}
          </span>
        </div>

        <div className="px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
          {isFinalSlide ? (
            <div className="rounded-2xl bg-gradient-to-br from-[#f7effa] via-[#fff8fb] to-[#f8f5fa] px-5 py-7 text-center sm:px-10 sm:py-9">
              <Image
                alt="Vitta Beauty"
                className="mx-auto h-auto max-h-24 w-auto max-w-[220px] object-contain sm:max-h-28"
                height={408}
                priority
                src="/brand/logo_vitta.png"
                width={612}
              />
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
          ) : currentSlide ? (
            <>
              <h1
                className="text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl"
                id="welcome-tour-title"
              >
                {currentSlide.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-vitta-muted">
                {currentSlide.description}
              </p>
              <button
                aria-label={`Ampliar imagem: ${currentSlide.title}`}
                className="mt-5 block w-full cursor-zoom-in overflow-hidden rounded-[20px] border border-[#eee6f2] bg-[#faf7fb] p-2 transition hover:border-vitta/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vitta sm:p-3"
                onClick={() => setZoomOpen(true)}
                type="button"
              >
                <span className="relative block h-[clamp(170px,38vh,420px)] w-full">
                  <Image
                    alt={currentSlide.alt}
                    className="object-contain"
                    fill
                    priority={slideIndex === 0}
                    sizes="(max-width: 640px) 94vw, (max-width: 1024px) 88vw, 900px"
                    src={currentSlide.image}
                  />
                </span>
                <span className="mt-2 block text-center text-[11px] font-medium text-vitta-muted">
                  Clique na imagem para ampliar
                </span>
              </button>
            </>
          ) : null}

          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: totalSlides }, (_, index) => (
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

      {zoomOpen && currentSlide && (
        <div
          aria-label={`Imagem ampliada: ${currentSlide.title}`}
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-3 sm:p-8"
          role="dialog"
        >
          <button
            aria-label="Fechar imagem ampliada"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            onClick={() => setZoomOpen(false)}
            type="button"
          />
          <div className="relative z-10 h-[85vh] w-full max-w-7xl">
            <Image
              alt={currentSlide.alt}
              className="object-contain"
              fill
              priority
              sizes="100vw"
              src={currentSlide.image}
            />
          </div>
          <button
            aria-label="Fechar imagem ampliada"
            className="absolute right-4 top-4 z-20 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            onClick={() => setZoomOpen(false)}
            type="button"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
