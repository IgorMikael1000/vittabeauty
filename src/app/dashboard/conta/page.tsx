import type { Metadata } from "next";
import Link from "next/link";
import { ProfileImageUpload } from "@/components/account/profile-image-upload";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Minha Conta",
};

const accountOptions = [
  {
    href: "/dashboard/conta/dados",
    title: "Dados Pessoais",
    description: "Atualize seu nome profissional e informações de contato.",
    icon: "profile",
  },
  {
    href: "/dashboard/conta/seguranca",
    title: "Segurança e Senha",
    description: "Confirme sua senha atual e escolha uma nova.",
    icon: "security",
  },
  {
    href: "/dashboard/conta/assinatura",
    title: "Plano e pagamentos",
    description: "Consulte seu acesso e faça renovações manuais.",
    icon: "subscription",
  },
  {
    href: "/termos?source=account",
    title: "Termos de Uso e Política de Privacidade",
    description: "Consulte as condições de uso e o tratamento de dados.",
    icon: "legal",
  },
] as const;

const icons = {
  profile: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  security: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  subscription: "M3 7h18M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 9h8",
  legal: "M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6",
} as const;

export default async function AccountPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const professional = await getPrismaClient().professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { name: true, specialty: true, logoUrl: true },
  });

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
        Perfil e preferências
      </p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-vitta-text">
        Minha Conta
      </h1>

      <div className="mt-7 overflow-hidden rounded-[28px] border border-[#ebe5ef] bg-white/85 shadow-card">
        <div className="h-28 bg-gradient-to-r from-[#63417c] via-[#7950a5] to-[#b47eb8]" />
        <div className="px-6 pb-7 sm:px-9">
          <div className="-mt-12 flex flex-col items-center text-center">
            <ProfileImageUpload
              logoUrl={professional.logoUrl}
              name={professional.name}
            />
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-vitta-text">
              {professional.name}
            </h2>
            <p className="mt-1 text-sm text-vitta-muted">
              {professional.specialty || "Profissional da beleza"}
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {accountOptions.map((option) => (
              <Link
                className="group rounded-[20px] border border-[#ebe5ef] bg-[#fdfcfe] p-5 transition hover:-translate-y-0.5 hover:border-[#d8c8e3] hover:bg-white hover:shadow-card"
                href={option.href}
                key={option.href}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f5eff8] text-vitta transition-colors group-hover:bg-[#efe5f5]">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    viewBox="0 0 24 24"
                  >
                    <path d={icons[option.icon]} />
                  </svg>
                </span>
                <h3 className="mt-4 text-sm font-semibold text-vitta-text">
                  {option.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-vitta-muted">
                  {option.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-vitta">
                  Acessar
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
