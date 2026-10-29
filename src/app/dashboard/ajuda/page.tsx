import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Me ajude",
};

function SocialIcon({
  network,
}: {
  network: "instagram" | "facebook" | "whatsapp" | "tiktok";
}) {
  if (network === "instagram") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect height="18" rx="5" width="18" x="3" y="3" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
      </svg>
    );
  }

  if (network === "facebook") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M13.45 21v-8.2h2.76l.41-3.2h-3.17V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14C16.44 3.05 15.36 3 14.1 3c-2.63 0-4.43 1.56-4.43 4.43V9.6H6.7v3.2h2.97V21h3.78Z" />
      </svg>
    );
  }

  if (network === "tiktok") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
      >
        <path
          d="M12.525.02h3.91c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a11.2 11.2 0 0 1-5.82-1.9c-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.77-1.34 3.92-1.29 1.91-3.52 3.16-5.83 3.2a7.7 7.7 0 0 1-4.04-1.03c-2-1.19-3.36-3.34-3.55-5.67-.02-.5-.03-1-.01-1.49.17-1.79 1.05-3.51 2.44-4.65 1.58-1.34 3.8-1.98 5.85-1.65.02 1.48-.04 2.96-.04 4.44-.99-.32-2.1-.23-3.01.34-.66.41-1.16 1.07-1.36 1.82-.17.41-.12.87-.12 1.31.25 1.71 1.9 3.15 3.65 2.99 1.16-.01 2.27-.7 2.84-1.71.18-.31.38-.63.39-1 0-5.57-.03-11.14.03-16.7Z"
          fill="#25F4EE"
          transform="translate(-1 1)"
        />
        <path
          d="M12.525.02h3.91c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a11.2 11.2 0 0 1-5.82-1.9c-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.77-1.34 3.92-1.29 1.91-3.52 3.16-5.83 3.2a7.7 7.7 0 0 1-4.04-1.03c-2-1.19-3.36-3.34-3.55-5.67-.02-.5-.03-1-.01-1.49.17-1.79 1.05-3.51 2.44-4.65 1.58-1.34 3.8-1.98 5.85-1.65.02 1.48-.04 2.96-.04 4.44-.99-.32-2.1-.23-3.01.34-.66.41-1.16 1.07-1.36 1.82-.17.41-.12.87-.12 1.31.25 1.71 1.9 3.15 3.65 2.99 1.16-.01 2.27-.7 2.84-1.71.18-.31.38-.63.39-1 0-5.57-.03-11.14.03-16.7Z"
          fill="#FE2C55"
          transform="translate(1 -1)"
        />
        <path
          d="M12.525.02h3.91c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a11.2 11.2 0 0 1-5.82-1.9c-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.77-1.34 3.92-1.29 1.91-3.52 3.16-5.83 3.2a7.7 7.7 0 0 1-4.04-1.03c-2-1.19-3.36-3.34-3.55-5.67-.02-.5-.03-1-.01-1.49.17-1.79 1.05-3.51 2.44-4.65 1.58-1.34 3.8-1.98 5.85-1.65.02 1.48-.04 2.96-.04 4.44-.99-.32-2.1-.23-3.01.34-.66.41-1.16 1.07-1.36 1.82-.17.41-.12.87-.12 1.31.25 1.71 1.9 3.15 3.65 2.99 1.16-.01 2.27-.7 2.84-1.71.18-.31.38-.63.39-1 0-5.57-.03-11.14.03-16.7Z"
          fill="#000000"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 32 32"
    >
      <path d="M16.02 3C8.85 3 3.02 8.77 3.02 15.88c0 2.27.6 4.49 1.75 6.43L3 29l6.9-1.8a13.1 13.1 0 0 0 6.12 1.51h.01c7.16 0 13-5.78 13-12.89 0-3.44-1.35-6.67-3.8-9.1A12.94 12.94 0 0 0 16.02 3Zm0 23.53a10.8 10.8 0 0 1-5.5-1.5l-.4-.23-4.1 1.07 1.1-3.98-.26-.41a10.62 10.62 0 0 1-1.65-5.6c0-5.94 4.86-10.77 10.82-10.77 2.89 0 5.61 1.12 7.65 3.15a10.68 10.68 0 0 1 3.17 7.62c0 5.94-4.86 10.77-10.83 10.77Zm5.94-8.06c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.22-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.58-.95-.84-1.59-1.88-1.78-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.1-.22.05-.4-.03-.56-.08-.16-.73-1.73-1-2.37-.27-.63-.54-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.67 0 1.58 1.16 3.1 1.32 3.31.16.21 2.28 3.46 5.52 4.85.77.33 1.37.53 1.84.68.77.24 1.47.21 2.02.13.62-.1 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.3-.22-.62-.38Z" />
    </svg>
  );
}

export default async function HelpPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const professional = await getPrismaClient().professional.findUnique({
    where: { id: professionalId },
    select: { name: true },
  });

  if (!professional) {
    redirect("/login");
  }

  const message = `Olá, sou ${professional.name} e preciso de ajuda com a plataforma Vitta Beauty.`;
  const whatsappUrl = `https://wa.me/5588993118230?text=${encodeURIComponent(message)}`;

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-5xl flex-col justify-center">
      <div className="mx-auto w-full max-w-2xl">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-vitta/75">
            Suporte Vitta Beauty
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-vitta-text sm:text-3xl">
            Me ajude
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-vitta-muted">
            Ficou com alguma dúvida? Entre em contato diretamente com a{" "}
            <strong className="font-semibold text-vitta-text">
              I&amp;T Solutions
            </strong>
            , responsável pelo desenvolvimento do Vitta Beauty. Vamos ajudar
            você.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,211,102,0.2)] transition hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C7E] focus-visible:ring-offset-2"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon network="whatsapp" />
            Falar pelo WhatsApp
          </Link>
          <a
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-vitta-border bg-white px-5 py-4 text-sm font-semibold text-vitta-text shadow-sm transition hover:border-vitta/30 hover:bg-vitta-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vitta focus-visible:ring-offset-2"
            href="mailto:itsolutions0709@gmail.com"
          >
            <Mail aria-hidden="true" className="h-5 w-5 text-vitta" />
            Enviar E-mail de Suporte
          </a>
        </div>
      </div>

      <footer className="mt-9 border-t border-vitta-border/80 pt-5 text-center">
        <p className="text-xs font-medium text-vitta-muted">
          Siga-nos nas redes sociais
        </p>
        <div className="mt-3 flex justify-center gap-3">
          <a
            aria-label="I&T Solutions no Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-vitta-border bg-white text-[#C13584] transition hover:-translate-y-0.5 hover:shadow-sm"
            href="https://instagram.com/_itsolutionss_?xtok=M3I1aWE2ZGFhOXZh"
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon network="instagram" />
          </a>
          <a
            aria-label="I&T Solutions no Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-vitta-border bg-white text-[#1877F2] transition hover:-translate-y-0.5 hover:shadow-sm"
            href="https://www.facebook.com/share/18mjrbcDw8/"
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon network="facebook" />
          </a>
          <a
            aria-label="I&T Solutions no TikTok"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-vitta-border bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
            href="https://www.tiktok.com/@_itsolutionss_"
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon network="tiktok" />
          </a>
        </div>
        <Link
          className="mt-3 inline-block text-xs font-medium text-vitta-muted transition hover:text-vitta"
          href="/dashboard"
        >
          Voltar ao painel
        </Link>
      </footer>
    </section>
  );
}
