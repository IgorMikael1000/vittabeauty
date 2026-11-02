import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Uma agenda mais leve começa aqui",
  description:
    "Conheça o Vitta Beauty: organize sua rotina profissional e deixe suas clientes agendarem online.",
};

export default function HomePage() {
  return <LandingPage />;
}
