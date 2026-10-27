import type { Metadata } from "next";
import Link from "next/link";
import { SecurityForm } from "@/components/account/security-form";

export const metadata: Metadata = {
  title: "Segurança e Senha",
};

export default function AccountSecurityPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <Link
        className="text-sm font-medium text-vitta transition hover:underline"
        href="/dashboard/conta"
      >
        ← Minha Conta
      </Link>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
        Acesso e proteção
      </p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-vitta-text">
        Segurança e Senha
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Confirme sua senha atual antes de definir uma nova.
      </p>

      <div className="mt-7 rounded-[24px] border border-[#ebe5ef] bg-white/90 p-5 shadow-card sm:p-8">
        <SecurityForm />
      </div>
    </section>
  );
}
