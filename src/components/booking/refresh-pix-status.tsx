"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshPixStatus({
  expiresAt,
}: {
  expiresAt: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const expiresAtMs = new Date(expiresAt).getTime();
    const interval = window.setInterval(() => {
      if (Date.now() >= expiresAtMs) {
        window.clearInterval(interval);
        router.refresh();
        return;
      }
      router.refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [expiresAt, router]);

  return (
    <p aria-live="polite" className="text-xs text-emerald-900">
      Aguardando a confirmação do pagamento...
    </p>
  );
}
