"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";

const actionPromises = new Map<string, Promise<void>>();

function applyEmailActionCodeOnce(actionCode: string): Promise<void> {
  const existingAction = actionPromises.get(actionCode);
  if (existingAction) return existingAction;

  const action = applyActionCode(auth, actionCode).then(() => undefined);
  actionPromises.set(actionCode, action);
  return action;
}

type EmailActionResultProps = {
  actionCode: string;
  mode: string;
  result: string;
};

export function EmailActionResult({
  actionCode,
  mode,
  result,
}: EmailActionResultProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    result ? "error" : "loading",
  );

  useEffect(() => {
    let active = true;

    async function applyEmailAction() {
      if (
        result ||
        !actionCode ||
        !["verifyEmail", "recoverEmail", "verifyAndChangeEmail"].includes(mode)
      ) {
        setStatus("error");
        return;
      }

      try {
        await applyEmailActionCodeOnce(actionCode);
        if (active) setStatus("success");
      } catch {
        if (active) setStatus("error");
      }
    }

    void applyEmailAction();
    return () => {
      active = false;
    };
  }, [actionCode, mode, result]);

  const title =
    mode === "recoverEmail"
      ? "E-mail recuperado"
      : mode === "verifyAndChangeEmail"
        ? "Novo e-mail confirmado"
        : "E-mail verificado";

  const successMessage =
    mode === "recoverEmail"
      ? "A alteração do endereço de e-mail foi revertida. Agora você pode entrar com o endereço recuperado."
      : mode === "verifyAndChangeEmail"
        ? "Seu novo endereço de e-mail foi confirmado com sucesso."
        : "Seu e-mail foi verificado com sucesso. Sua conta está pronta para uso.";

  const errorMessage =
    result === "unsupported-action"
      ? "Este tipo de link não é reconhecido. Solicite um novo e-mail pelo Vitta Beauty."
      : "Não foi possível validar este link. Ele pode estar expirado ou já ter sido utilizado. Solicite um novo e-mail.";

  return (
    <section className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/90 p-7 text-center shadow-[0_24px_70px_rgba(66,47,78,0.12)] backdrop-blur-xl sm:p-9">
      <div className="relative mx-auto mb-5 h-[100px] w-[240px] max-w-full overflow-hidden">
        <Image
          alt="Vitta Beauty"
          className="absolute left-1/2 top-1/2 h-[200px] w-[300px] max-w-none -translate-x-1/2 -translate-y-[40%]"
          height={408}
          priority
          src="/brand/logo_vitta.png"
          width={612}
        />
      </div>

      {status === "loading" && (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-vitta-text">
            Validando seu e-mail
          </h1>
          <p className="mt-3 text-sm leading-6 text-vitta-muted">
            Aguarde enquanto confirmamos o link de segurança.
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700"
          >
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-vitta-text">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-vitta-muted">
            {successMessage}
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-700"
          >
            !
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-vitta-text">
            Link indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-vitta-muted">
            {errorMessage}
          </p>
        </>
      )}

      {status !== "loading" && (
        <Link
          className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white shadow-[0_8px_18px_rgba(121,80,165,0.2)] transition hover:-translate-y-0.5"
          href="/login"
        >
          Ir para o login
        </Link>
      )}
    </section>
  );
}
