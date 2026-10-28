"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Download, MoreHorizontal, Share2, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissalStorageKey = "vitta-pwa-install-dismissed-until";
const dismissalDuration = 7 * 24 * 60 * 60 * 1000;

function subscribeToHydration() {
  return () => {};
}

function getHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function isMobileDevice() {
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod|Android|Mobile/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isIosDevice() {
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hasActiveDismissal() {
  if (typeof window === "undefined") return false;
  try {
    const value = Number(localStorage.getItem(dismissalStorageKey) ?? 0);
    return Number.isFinite(value) && Date.now() < value;
  } catch (error) {
    console.error(
      "Não foi possível consultar o estado do convite de instalação.",
      error,
    );
    return false;
  }
}

function saveDismissedUntil(until: number) {
  try {
    localStorage.setItem(dismissalStorageKey, String(until));
  } catch (error) {
    console.error(
      "Não foi possível salvar o fechamento do convite de instalação.",
      error,
    );
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installError, setInstallError] = useState("");
  const [isDismissed, setIsDismissed] = useState(hasActiveDismissal);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      const until = Date.now() + 365 * dismissalDuration;
      setIsDismissed(true);
      saveDismissedUntil(until);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const isPublicBooking =
    pathname === "/agendar" || pathname?.startsWith("/agendar/") === true;
  const isOpen =
    isHydrated &&
    isMobileDevice() &&
    !isAppInstalled() &&
    !installed &&
    !isPublicBooking &&
    !isDismissed;
  const isIos = isHydrated && isIosDevice();

  const dismiss = useCallback(() => {
    const until = Date.now() + dismissalDuration;
    setIsDismissed(true);
    saveDismissedUntil(until);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dismiss, isOpen]);

  async function install() {
    if (!installPrompt) return;

    setInstallError("");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") {
        const until = Date.now() + 365 * dismissalDuration;
        setIsDismissed(true);
        saveDismissedUntil(until);
      } else {
        dismiss();
      }
    } catch (error) {
      console.error("Não foi possível abrir o convite de instalação.", error);
      setInstallError(
        "Não foi possível iniciar a instalação. Use o menu do navegador para instalar o app.",
      );
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <section
        aria-describedby="pwa-install-description"
        aria-labelledby="pwa-install-title"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(30,20,40,0.24)] sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vitta/10 text-vitta">
            <Download aria-hidden="true" className="h-6 w-6" />
          </div>
          <button
            aria-label="Fechar aviso de instalação"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-vitta-muted transition hover:bg-vitta-background hover:text-vitta"
            onClick={dismiss}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <h2
          className="mt-4 text-xl font-semibold tracking-tight text-vitta-text"
          id="pwa-install-title"
        >
          Leve o Vitta Beauty com você
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-vitta-muted"
          id="pwa-install-description"
        >
          Instale o app para acessar seu espaço profissional direto da tela
          inicial do celular.
        </p>

        {!installPrompt && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-vitta-background px-3 py-2.5 text-xs leading-5 text-vitta-muted">
            {isIos ? (
              <>
                <Share2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                No Safari, toque em Compartilhar e depois em “Adicionar à Tela
                de Início”.
              </>
            ) : (
              <>
                <MoreHorizontal
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                Abra o menu do navegador e escolha “Instalar app” ou “Adicionar
                à tela inicial”.
              </>
            )}
          </p>
        )}

        {installError && (
          <p className="mt-3 text-sm text-rose-700" role="alert">
            {installError}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {installPrompt && (
            <button
              className="flex-1 rounded-xl bg-vitta px-4 py-3 text-sm font-semibold text-white transition hover:bg-vitta/90"
              onClick={() => void install()}
              type="button"
            >
              Instalar app
            </button>
          )}
          <button
            className="flex-1 rounded-xl border border-vitta-border px-4 py-3 text-sm font-semibold text-vitta-text transition hover:bg-vitta-background"
            onClick={dismiss}
            type="button"
          >
            Agora não
          </button>
        </div>
      </section>
    </div>
  );
}
