import type { Metadata } from "next";
import { CopyBookingLink } from "@/components/booking/copy-booking-link";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";
import { getPublicBookingUrl } from "@/lib/public-url";

export const metadata: Metadata = {
  title: "Meu link de agendamento",
};

export default async function BookingLinkPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const professional = await getPrismaClient().professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: {
      name: true,
      slug: true,
      services: {
        where: { isActive: true, onlineBookingEnabled: true },
        select: { id: true },
      },
    },
  });
  const url = await getPublicBookingUrl(professional.slug);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="text-sm font-medium text-vitta">Agendamento online</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
        Meu link de agendamento
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Compartilhe seu link para que suas clientes consultem os serviços e
        solicitem um horário sem criar uma conta.
      </p>

      <div className="mt-7 rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-vitta-text">{professional.name}</h2>
        <p className="mt-2 text-sm leading-6 text-vitta-muted">
          O link permanece o mesmo e apresenta somente serviços ativos com
          agendamento online habilitado.
        </p>

        <div className="mt-6">
          <CopyBookingLink url={url} />
        </div>

        {professional.services.length === 0 && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Você ainda não tem serviços disponíveis para agendamento online.
            Ative essa opção em um serviço para receber solicitações.
          </p>
        )}
      </div>
    </section>
  );
}
