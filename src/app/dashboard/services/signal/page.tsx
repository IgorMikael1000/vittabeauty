import type { Metadata } from "next";
import { PixDepositSettingsForm } from "@/components/services/pix-deposit-settings-form";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Configurar sinal",
};

export default async function PixDepositSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const [professional, pendingPayments, query] = await Promise.all([
    getPrismaClient().professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: {
        pixKey: true,
        pixDepositMode: true,
        mercadoPagoConnection: { select: { id: true } },
      },
    }),
    getPrismaClient().appointmentDepositPayment.count({
      where: {
        professionalId,
        status: { in: ["creating", "pending"] },
        expiresAt: { gt: new Date() },
      },
    }),
    searchParams,
  ]);
  const hasConnection = Boolean(professional.mercadoPagoConnection);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="text-sm font-medium text-vitta">Serviços</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
        Configurar sinal
      </h1>
      <p className="mt-2 text-sm leading-6 text-vitta-muted">
        Escolha como deseja receber o sinal dos agendamentos online. Essa
        configuração vale para todos os serviços.
      </p>

      <div className="mt-6">
        <PixDepositSettingsForm
          connected={query.connected === "1"}
          hasConnection={hasConnection}
          hasPendingPayments={pendingPayments > 0}
          isAutomatic={professional.pixDepositMode === "AUTOMATIC"}
          pixKey={professional.pixKey}
        />
      </div>
    </section>
  );
}
