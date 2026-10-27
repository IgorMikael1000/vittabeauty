import type { Metadata } from "next";
import { ServiceForm } from "@/components/services/service-form";
import { ToggleServiceActiveForm } from "@/components/services/toggle-service-active-form";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Serviços",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ServicesPage() {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const prisma = getPrismaClient();
  const [services, professional] = await Promise.all([
    prisma.service.findMany({
    where: { professionalId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: { pixKey: true },
    }),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div>
        <p className="text-sm font-medium text-vitta">Catálogo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
          Serviços
        </h1>
        <p className="mt-2 text-sm text-vitta-muted">
          Gerencie procedimentos, preços, duração e disponibilidade.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="h-fit rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <ServiceForm hasPixKey={Boolean(professional.pixKey)} />
        </aside>

        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-vitta-border bg-white p-8 text-center">
              <h2 className="font-semibold text-vitta-text">
                Nenhum serviço cadastrado
              </h2>
              <p className="mt-2 text-sm text-vitta-muted">
                Cadastre seu primeiro procedimento para organizar a agenda.
              </p>
            </div>
          ) : (
            services.map((service) => (
              <article
                className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6"
                key={service.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-semibold text-vitta-text">
                        {service.name}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          service.isActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-vitta-background text-vitta-muted"
                        }`}
                      >
                        {service.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {service.description && (
                      <p className="mt-2 text-sm leading-6 text-vitta-muted">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-vitta">
                      {currency.format(Number(service.price))}
                    </p>
                    <p className="mt-1 text-xs text-vitta-muted">
                      {service.durationMinutes} minutos
                    </p>
                    <p className="mt-1 text-xs text-vitta-muted">
                      Material: {currency.format(Number(service.materialCost))}
                    </p>
                    {Number(service.depositAmount) > 0 && (
                      <p className="mt-1 text-xs text-vitta-muted">
                        Sinal: {currency.format(Number(service.depositAmount))}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-vitta-muted">
                  Agendamento online:{" "}
                  {service.onlineBookingEnabled ? "permitido" : "desativado"}
                </p>

                <details className="mt-5 border-t border-vitta-border pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-vitta">
                    Editar serviço
                  </summary>
                  <div className="mt-4 grid gap-6 lg:grid-cols-2">
                    <ServiceForm
                      service={{
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        price: service.price.toString(),
                        materialCost: service.materialCost.toString(),
                        depositAmount: service.depositAmount?.toString() ?? "0",
                        durationMinutes: service.durationMinutes,
                        onlineBookingEnabled: service.onlineBookingEnabled,
                        isActive: service.isActive,
                      }}
                      hasPixKey={Boolean(professional.pixKey)}
                    />
                    <div>
                      <p className="mb-3 text-sm leading-6 text-vitta-muted">
                        Desativar um serviço o remove das novas opções de
                        agendamento, sem apagar seu histórico.
                      </p>
                      <ToggleServiceActiveForm
                        active={service.isActive}
                        serviceId={service.id}
                      />
                    </div>
                  </div>
                </details>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
