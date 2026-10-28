"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export function LogoutButton({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function logout() {
    setError("");
    startTransition(async () => {
      try {
        await logoutAction();
      } catch (logoutError) {
        console.error("Could not clear the Firebase session cookie.", logoutError);
        setError("Não foi possível encerrar a sessão. Tente novamente.");
        return;
      }

      try {
        await signOut(auth);
      } catch (logoutError) {
        console.error("Could not sign out of Firebase in the browser.", logoutError);
        setError(
          "A sessão do app foi encerrada, mas não foi possível limpar a sessão Firebase deste navegador.",
        );
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <>
      <button
        className={className}
        disabled={pending}
        onClick={logout}
        type="button"
      >
        {pending ? "Saindo..." : children}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-rose-700" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
