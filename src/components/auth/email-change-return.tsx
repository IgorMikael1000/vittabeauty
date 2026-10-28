"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, reload } from "firebase/auth";
import { useRouter } from "next/navigation";
import { syncProfessionalEmailFromFirebaseAction } from "@/app/actions/account";
import { auth } from "@/lib/firebase";

export function EmailChangeReturn() {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState(
    "Validando a alteração e atualizando seu perfil...",
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (started.current) return;
      started.current = true;

      if (!user) {
        if (active) {
          setStatus("error");
          setMessage(
            "Não encontramos sua sessão Firebase neste navegador. Abra o link no mesmo navegador em que iniciou a alteração e permaneça conectado.",
          );
        }
        return;
      }

      try {
        await reload(user);
        const result = await syncProfessionalEmailFromFirebaseAction(
          await user.getIdToken(true),
        );
        if (result.error) {
          if (active) {
            setStatus("error");
            setMessage(result.error);
          }
          return;
        }

        if (active) {
          setStatus("success");
          setMessage(
            "Seu e-mail foi confirmado e atualizado. Estamos levando você de volta à sua conta.",
          );
          router.replace("/dashboard/conta/dados?emailUpdated=1");
          router.refresh();
        }
      } catch (error) {
        console.error("Could not synchronize Firebase email change.", error);
        if (active) {
          setStatus("error");
          setMessage(
            "O e-mail foi confirmado, mas não conseguimos atualizar seu perfil. Entre novamente e tente sincronizar os dados.",
          );
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

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
      <h1 className="text-2xl font-semibold tracking-tight text-vitta-text">
        {status === "loading"
          ? "Atualizando seu e-mail"
          : status === "success"
            ? "E-mail confirmado"
            : "Não foi possível concluir"}
      </h1>
      <p
        className={`mt-3 text-sm leading-6 ${
          status === "error" ? "text-rose-700" : "text-vitta-muted"
        }`}
        role={status === "error" ? "alert" : "status"}
      >
        {message}
      </p>
      {status === "error" && (
        <Link
          className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#7950a5] to-[#9368b3] px-5 py-3.5 font-semibold text-white"
          href="/dashboard/conta/dados"
        >
          Voltar à minha conta
        </Link>
      )}
    </section>
  );
}
