import type { Metadata } from "next";
import Link from "next/link";
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
] as const;

const icons = {
  profile: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  security: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
} as const;

export default async function AccountPage() {
  const professionalId = await getAuthenticatedProfessionalId();
  const professional = await getPrismaClient().professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { name: true, specialty: true },
  });
  const initials = professional.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");

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
            <div
              aria-label={`Foto de perfil de ${professional.name}`}
              className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#eedbee] to-[#f7e7ef] text-2xl font-semibold tracking-tight text-[#714992] shadow-[0_8px_24px_rgba(66,47,78,0.12)]"
              role="img"
            >
              {initials || "VB"}
            </div>
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
