import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { getSiteOrigin } from "@/lib/site-origin";

export const metadata: Metadata = {
  title: "Agenda online para profissionais da beleza",
  description:
    "Organize serviços e horários, compartilhe seu link de agendamento e acompanhe clientes e atendimentos com o Vitta Beauty.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Agenda online para profissionais da beleza | Vitta Beauty",
    description:
      "Organize serviços e horários, compartilhe seu link de agendamento e acompanhe clientes e atendimentos.",
    url: "/",
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
    title: "Agenda online para profissionais da beleza | Vitta Beauty",
    description:
      "Organize serviços e horários, compartilhe seu link de agendamento e acompanhe clientes e atendimentos.",
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  const origin = getSiteOrigin().toString();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://siteitsolutions.onrender.com/#organization",
      name: "I&T Solutions",
      url: "https://siteitsolutions.onrender.com/",
      email: "itsolutions0709@gmail.com",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Vitta Beauty",
      url: origin,
      inLanguage: "pt-BR",
      publisher: {
        "@id": "https://siteitsolutions.onrender.com/#organization",
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
