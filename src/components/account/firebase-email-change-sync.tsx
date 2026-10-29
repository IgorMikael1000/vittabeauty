"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
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
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const result = await syncProfessionalEmailFromFirebaseAction();
        if (result.error) {
          if (active) {
            setFailed(true);
            setMessage(result.error);
          }
          return;
        }
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Could not sign out after Firebase email change.", error);
          if (active) {
            router.replace("/login?emailChanged=1&signOutFailed=1");
          }
          return;
        }
        if (active) {
          router.replace("/login?emailChanged=1");
        }
      } catch {
        if (active) {
          setFailed(true);
          setMessage(
            "Não foi possível sincronizar o e-mail. Atualize a página ou entre novamente.",
          );
        }
      }
    })();

    return () => {
      active = false;
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
