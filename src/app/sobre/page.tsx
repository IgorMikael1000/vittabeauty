import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre a plataforma",
  description:
    "Conheça o Vitta Beauty, uma plataforma de agenda e gestão criada para ajudar profissionais da beleza a organizarem sua rotina.",
  alternates: {
    canonical: "/sobre",
  },
  openGraph: {
    title: "Sobre o Vitta Beauty",
    description:
      "Uma plataforma de agenda e gestão para profissionais da beleza.",
    url: "/sobre",
    type: "website",
    locale: "pt_BR",
    siteName: "Vitta Beauty",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vitta Beauty: agenda online para profissionais da beleza",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre o Vitta Beauty",
    description:
      "Uma plataforma de agenda e gestão para profissionais da beleza.",
    images: ["/opengraph-image"],
  },
};

const features = [
  "Agendamento online por um link público, sem exigir conta da cliente.",
  "Agenda profissional para acompanhar solicitações e atendimentos.",
  "Cadastro de serviços, preços, duração e informações do procedimento.",
  "Organização de clientes, contatos e histórico de atendimentos.",
  "Ferramentas de controle financeiro e relatórios do negócio.",
];

export default function AboutPage() {
  return (
    <main className="flex-1 bg-[#fcf9fd] px-5 py-14 text-vitta-text sm:py-20">
      <article className="mx-auto max-w-3xl">
        <Link
          className="text-sm font-semibold text-vitta hover:underline"
          href="/"
        >
          ← Voltar para a página inicial
        </Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-vitta">
          Sobre a plataforma
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Uma rotina mais organizada para quem trabalha com beleza
        </h1>
        <p className="mt-6 text-lg leading-8 text-vitta-muted">
          O Vitta Beauty é uma plataforma digital de agenda e gestão para
          profissionais da beleza. Ela reúne ferramentas para organizar
          serviços, horários, agendamentos, clientes e informações do negócio em
          um só lugar.
        </p>

        <section aria-labelledby="features-title" className="mt-12">
          <h2 className="text-2xl font-semibold" id="features-title">
            O que você pode organizar no Vitta Beauty
          </h2>
          <ul className="mt-5 space-y-3">
            {features.map((feature) => (
              <li
                className="flex gap-3 text-base leading-7 text-vitta-muted"
                key={feature}
              >
                <span aria-hidden="true" className="font-bold text-vitta">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="payments-title" className="mt-12">
          <h2 className="text-2xl font-semibold" id="payments-title">
            Opções de sinal para agendamentos
          </h2>
          <p className="mt-4 leading-7 text-vitta-muted">
            Quando a profissional configura um sinal, pode usar o modo manual
            com uma chave Pix e conferir o pagamento na própria conta, ou
            conectar uma conta Mercado Pago para confirmação integrada. A
            disponibilidade depende da configuração da profissional e do
            provedor utilizado.
          </p>
        </section>

        <section aria-labelledby="company-title" className="mt-12">
          <h2 className="text-2xl font-semibold" id="company-title">
            Quem mantém o Vitta Beauty
          </h2>
          <p className="mt-4 leading-7 text-vitta-muted">
            Conforme os{" "}
            <Link
              className="font-semibold text-vitta hover:underline"
              href="/termos"
            >
              Termos de Uso e a Política de Privacidade
            </Link>
            , a plataforma é mantida pela I&amp;T Solutions. Para contato, use o
            e-mail{" "}
            <a
              className="font-semibold text-vitta hover:underline"
              href="mailto:itsolutions0709@gmail.com"
            >
              itsolutions0709@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            className="rounded-full bg-vitta px-6 py-3 font-semibold text-white transition hover:bg-vitta/90"
            href="/cadastro"
          >
            Conheça a plataforma
          </Link>
          <Link
            className="rounded-full border border-vitta-border px-6 py-3 font-semibold text-vitta transition hover:bg-white"
            href="/"
          >
            Ver funcionalidades
          </Link>
        </div>
      </article>
    </main>
  );
}
