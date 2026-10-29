import type { Metadata } from "next";
import Link from "next/link";
import { ClientForm } from "@/components/clients/client-form";
import { DeleteClientForm } from "@/components/clients/delete-client-form";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import { formatDateTime } from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";
import { getWhatsAppNumber } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Clientes",
};

const clientPageSize = 25;
const maximumClientPage =
  Math.floor(Number.MAX_SAFE_INTEGER / clientPageSize) - 1;

const appointmentStatusLabels = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
} as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const professionalId = await getAuthenticatedProfessionalId({
    allowExpired: true,
  });
  const params = await searchParams;
  const rawQuery = params.q;
  const query = rawQuery?.trim().slice(0, 100) ?? "";
  const pageValue = Number(params.page);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0
      ? Math.min(pageValue, maximumClientPage)
      : 1;
  const prisma = getPrismaClient();
  const [professional, services, clients] = await Promise.all([
    prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: { timezone: true },
    }),
    prisma.service.findMany({
      where: { professionalId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.client.findMany({
      where: {
        professionalId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { whatsapp: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * clientPageSize,
      take: clientPageSize + 1,
      include: {
        preferredService: { select: { id: true, name: true, isActive: true } },
        appointments: {
          orderBy: { startsAt: "desc" },
          take: 10,
          include: {
            service: { select: { name: true } },
          },
        },
        _count: { select: { appointments: true } },
      },
    }),
  ]);
  const hasNextPage =
    page < maximumClientPage && clients.length > clientPageSize;
  const visibleClients = clients.slice(0, clientPageSize);
  const selectableServices = services.map((service) => ({
    id: service.id,
    name: service.isActive ? service.name : `${service.name} (inativo)`,
  }));

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div>
        <p className="text-sm font-medium text-vitta">Relacionamento</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-vitta-text sm:text-3xl">
          Clientes
        </h1>
        <p className="mt-2 text-sm text-vitta-muted">
          Cadastre contatos e consulte o histórico de atendimentos.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="h-fit rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6">
          <ClientForm services={services.filter((service) => service.isActive)} />
        </aside>

        <div className="min-w-0">
          <form action="/dashboard/clients" className="mb-4 flex gap-2">
            <label className="sr-only" htmlFor="client-search">
              Buscar clientes
            </label>
            <input
              className="min-w-0 flex-1 rounded-xl border border-vitta-border bg-white px-4 py-2.5 text-sm outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
              defaultValue={query}
              id="client-search"
              name="q"
              placeholder="Buscar por nome ou WhatsApp"
            />
            <button
              className="rounded-xl border border-vitta-border bg-white px-4 py-2.5 text-sm font-medium text-vitta-text transition hover:bg-vitta-background"
              type="submit"
            >
              Buscar
            </button>
          </form>

          <div className="space-y-4">
            {visibleClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-vitta-border bg-white p-8 text-center">
                <h2 className="font-semibold text-vitta-text">
                  {query ? "Nenhum cliente encontrado" : "Sua lista está vazia"}
                </h2>
                <p className="mt-2 text-sm text-vitta-muted">
                  {query
                    ? "Experimente buscar por outro nome ou telefone."
                    : "Cadastre o primeiro cliente usando o formulário."}
                </p>
              </div>
            ) : (
              visibleClients.map((client) => (
                <article
                  className="rounded-2xl border border-vitta-border bg-white p-5 shadow-card sm:p-6"
                  key={client.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-semibold text-vitta-text">
                        {client.name}
                      </h2>
                      <a
                        className="mt-1 inline-block text-sm text-vitta hover:underline"
                        href={`https://wa.me/${getWhatsAppNumber(client.whatsapp)}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {client.whatsapp}
                      </a>
                    </div>
                    <span className="rounded-full bg-vitta-pink/15 px-3 py-1 text-xs font-medium text-vitta-text">
                      {client._count.appointments}{" "}
                      {client._count.appointments === 1
                        ? "atendimento"
                        : "atendimentos"}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-vitta-muted">
                        Serviço preferido
                      </dt>
                      <dd className="mt-1 text-vitta-text">
                        {client.preferredService?.name ?? "Não informado"}
                      </dd>
                    </div>
                  </dl>

                  {client.notes && (
                    <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-vitta-background p-3 text-sm text-vitta-text">
                      {client.notes}
                    </p>
                  )}

                  <details className="mt-5 border-t border-vitta-border pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-vitta">
                      Editar cadastro e ver histórico
                    </summary>
                    <div className="mt-4 grid gap-6 lg:grid-cols-2">
                      <ClientForm
                        client={client}
                        compact
                        services={selectableServices.filter(
                          (service) =>
                            service.id === client.preferredServiceId ||
                            services.find(
                              (item) => item.id === service.id,
                            )?.isActive,
                        )}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-vitta-text">
                          Histórico recente
                        </h3>
                        {client.appointments.length === 0 ? (
                          <p className="mt-3 text-sm text-vitta-muted">
                            Nenhum atendimento registrado.
                          </p>
                        ) : (
                          <ul className="mt-3 divide-y divide-vitta-border">
                            {client.appointments.map((appointment) => (
                              <li
                                className="py-3 text-sm"
                                key={appointment.id}
                              >
                                <p className="font-medium text-vitta-text">
                                  {appointment.service.name}
                                </p>
                                <p className="mt-1 text-vitta-muted">
                                  {formatDateTime(
                                    appointment.startsAt,
                                    professional.timezone,
                                  )}{" "}
                                  ·{" "}
                                  {appointmentStatusLabels[appointment.status]}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-4">
                          <DeleteClientForm clientId={client.id} />
                        </div>
                      </div>
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>
          {(page > 1 || hasNextPage) && (
            <nav
              aria-label="Paginação de clientes"
              className="mt-6 flex items-center justify-between gap-4"
            >
              {page > 1 ? (
                <Link
                  className="rounded-xl border border-vitta-border bg-white px-4 py-2 text-sm font-medium text-vitta-text hover:bg-vitta-background"
                  href={getClientPageHref(query, page - 1)}
                >
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-vitta-muted">Página {page}</span>
              {hasNextPage ? (
                <Link
                  className="rounded-xl border border-vitta-border bg-white px-4 py-2 text-sm font-medium text-vitta-text hover:bg-vitta-background"
                  href={getClientPageHref(query, page + 1)}
                >
                  Próxima
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function getClientPageHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/dashboard/clients?${params.toString()}`;
}
