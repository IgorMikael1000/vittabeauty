"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, reload } from "firebase/auth";
import { useRouter } from "next/navigation";
import { syncProfessionalEmailFromFirebaseAction } from "@/app/actions/account";
import { auth } from "@/lib/firebase";

export function FirebaseEmailChangeSync() {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState(
    "Confirmando a atualização do e-mail da sua conta...",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (started.current) return;
      started.current = true;

      if (!user) {
        if (active) {
          setFailed(true);
          setMessage(
            "O Firebase confirmou a alteração, mas não encontramos sua sessão. Entre novamente para sincronizar o e-mail.",
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
            setFailed(true);
            setMessage(result.error);
          }
          return;
        }
        if (active) {
          router.replace("/dashboard/conta/dados");
          router.refresh();
        }
      } catch {
        if (active) {
          setFailed(true);
          setMessage(
            "Não foi possível sincronizar o e-mail. Atualize a página ou entre novamente.",
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
    <p
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
        failed
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-vitta-border bg-vitta-background text-vitta-muted"
      }`}
      role={failed ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
