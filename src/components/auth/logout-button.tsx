"use client";

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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function logout() {
    setError("");
    startTransition(async () => {
      try {
        await signOut(auth);
      } catch {
        setError(
          "Não foi possível encerrar a sessão Firebase. Tente novamente.",
        );
        return;
      }
      await logoutAction();
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
