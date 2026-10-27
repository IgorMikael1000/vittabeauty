import type { Metadata } from "next";
import Link from "next/link";
import { ProfessionalDetailsForm } from "@/components/account/professional-details-form";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dados Pessoais",
};

export default async function AccountDetailsPage() {
  const professionalId = await getAuthenticatedProfessionalId();
  const professional = await getPrismaClient().professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: {
      name: true,
      email: true,
      phone: true,
      specialty: true,
      cpf: true,
    },
  });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <Link
        className="text-sm font-medium text-vitta transition hover:underline"
        href="/dashboard/conta"
      >
        ← Minha Conta
      </Link>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
        Perfil profissional
      </p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-vitta-text">
        Dados Pessoais
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Mantenha suas informações e seus dados de contato atualizados.
      </p>

      <div className="mt-7 rounded-[24px] border border-[#ebe5ef] bg-white/90 p-5 shadow-card sm:p-8">
        <ProfessionalDetailsForm professional={professional} />
      </div>
    </section>
  );
}
