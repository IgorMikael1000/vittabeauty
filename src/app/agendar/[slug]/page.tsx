import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/components/booking/public-booking-form";
import {
  buildAvailableSlots,
  getDayBounds,
  isValidBookingDate,
} from "@/lib/public-booking";
import {
  getDateInTimezone,
  getWeekdayInTimezone,
  parseDateTimeInTimezone,
} from "@/lib/schedule";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@/generated/prisma/client";
import { getWhatsAppNumber } from "@/lib/whatsapp";
import { getPublicBookingUrl } from "@/lib/public-url";

type BookingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    serviceId?: string;
    success?: string;
    appointmentId?: string;
  }>;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export async function generateMetadata({
  params,
}: Pick<BookingPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const professional = await getPrismaClient().professional.findUnique({
    where: { slug, deletionPendingAt: null },
    select: { name: true, specialty: true, logoUrl: true, updatedAt: true },
  });

  if (!professional) {
    return {
      title: "Página não encontrada",
      description: "Este link de agendamento não está disponível.",
    };
  }

  const specialtyDescription = professional.specialty
    ? `, especialista em ${professional.specialty}`
    : "";
  const description = `Agende online com ${professional.name}${specialtyDescription}. Consulte serviços e horários disponíveis no Vitta Beauty.`;
  const bookingUrl = await getPublicBookingUrl(slug);
  const profileImageUrl = professional.logoUrl?.startsWith("https://")
    ? professional.logoUrl
    : professional.logoUrl?.startsWith("data:image/webp;base64,")
      ? new URL(
          `/api/professionals/${encodeURIComponent(slug)}/profile-image/${professional.updatedAt.getTime()}`,
          bookingUrl,
        ).toString()
      : new URL("/brand/logo_vitta.png", bookingUrl).toString();

  return {
    title: `Agendar com ${professional.name}`,
    description,
    openGraph: {
      title: `Agendar com ${professional.name}`,
      description,
      type: "website",
      images: [
        {
          url: profileImageUrl,
          alt: `Foto de ${professional.name}`,
        },
      ],
    },
  };
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const prisma = getPrismaClient();
  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      timezone: true,
      expiresAt: true,
      pixKey: true,
      phone: true,
      services: {
        where: { isActive: true, onlineBookingEnabled: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          depositAmount: true,
          durationMinutes: true,
        },
      },
    },
  });

  if (!professional) {
    notFound();
  }

  if (professional.expiresAt <= new Date()) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-vitta-border bg-white p-8 text-center shadow-card sm:p-12">
          <Image
            alt="Vitta Beauty"
            className="mx-auto h-[76px] w-[170px] object-contain"
            height={360}
            priority
            src="/brand/logo_vitta.png"
            width={640}
          />
          <h1 className="mt-6 text-2xl font-semibold text-vitta-text">
            Agendamentos temporariamente indisponíveis
          </h1>
          <p className="mt-3 text-sm leading-6 text-vitta-muted">
            Este profissional está temporariamente indisponível para
            agendamentos online.
          </p>
        </div>
      </section>
    );
  }

  const successfulBooking =
    query.success === "1" && query.appointmentId
      ? await prisma.appointment.findFirst({
          where: {
            id: query.appointmentId,
            professionalId: professional.id,
          },
          select: {
            startsAt: true,
            depositAmount: true,
            service: { select: { name: true } },
          },
        })
      : null;
  const bookingDateTime = successfulBooking
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: professional.timezone,
        dateStyle: "full",
        timeStyle: "short",
      }).format(successfulBooking.startsAt)
    : null;
  const professionalWhatsApp = getWhatsAppNumber(professional.phone ?? "");
  const depositValue = Number(successfulBooking?.depositAmount ?? 0);
  const whatsappMessage = successfulBooking && bookingDateTime
    ? `Olá! Acabei de solicitar o serviço ${successfulBooking.service.name} para ${bookingDateTime} no Vitta Beauty. Segue o comprovante do sinal de ${currency.format(depositValue)}.`
    : "";
  const whatsappHref =
    successfulBooking &&
    depositValue > 0 &&
    professionalWhatsApp.length >= 12
      ? `https://wa.me/${professionalWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`
      : null;

  const today = getDateInTimezone(new Date(), professional.timezone);
  const date = query.date ?? today;
  const selectedService =
    professional.services.find((service) => service.id === query.serviceId) ??
    null;
  const validDate = isValidBookingDate(date, professional.timezone);
  let slots: ReturnType<typeof buildAvailableSlots> = [];

  if (selectedService && validDate) {
    const bounds = getDayBounds(date, professional.timezone);

    if (bounds) {
      const localNoon = parseDateTimeInTimezone(
        `${date}T12:00`,
        professional.timezone,
      );

      if (!localNoon) {
        throw new Error(
          `Could not resolve local noon for timezone "${professional.timezone}".`,
        );
      }

      const weekdayIndex = getWeekdayInTimezone(
        localNoon,
        professional.timezone,
      );

      const [workingHours, appointments, blocks] = await Promise.all([
        prisma.workingHours.findUnique({
          where: {
            professionalId_weekday: {
              professionalId: professional.id,
              weekday: weekdayIndex,
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            professionalId: professional.id,
            status: {
              in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
            },
            startsAt: { lt: bounds.end },
            endsAt: { gt: bounds.start },
          },
          select: { startsAt: true, endsAt: true },
        }),
        prisma.calendarBlock.findMany({
          where: {
            professionalId: professional.id,
            startsAt: { lt: bounds.end },
            endsAt: { gt: bounds.start },
          },
          select: { startsAt: true, endsAt: true },
        }),
      ]);

      slots = buildAvailableSlots({
        date,
        timeZone: professional.timezone,
        durationMinutes: selectedService.durationMinutes,
        workingHours,
        appointments,
        blocks,
      });
    }
  }

  const maxDate = new Date(`${today}T00:00:00.000Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + 90);
  const dateMax = maxDate.toISOString().slice(0, 10);
  const formattedDate = validDate
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        dateStyle: "full",
      }).format(new Date(`${date}T12:00:00.000Z`))
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="overflow-hidden rounded-2xl border border-vitta-border bg-white shadow-card">
        <header className="bg-vitta-background px-6 py-8 text-center sm:px-10">
          <Image
            alt="Vitta Beauty"
            className="mx-auto h-[76px] w-[170px] object-contain"
            height={360}
            priority
            src="/brand/logo_vitta.png"
            width={640}
          />
          <h1 className="mt-3 text-2xl font-semibold text-vitta-text sm:text-3xl">
            Agende seu horário
          </h1>
          <p className="mt-2 text-vitta-muted">
            com{" "}
            <span className="break-words font-semibold text-vitta-text">
              {professional.name}
            </span>
          </p>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          {query.success === "1" && (
            <section
              className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"
              role="status"
            >
              <p>
                Sua solicitação foi enviada.
              </p>
              {successfulBooking && depositValue > 0 && (
                <div className="space-y-3 border-t border-emerald-200 pt-4">
                  <div>
                    <h2 className="font-semibold">
                      Sinal necessário para confirmar seu agendamento
                    </h2>
                    <p className="mt-1">
                      Envie o sinal de{" "}
                      <strong>{currency.format(depositValue)}</strong> via PIX
                      para a chave:
                    </p>
                    <p className="mt-2 break-all rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 font-semibold">
                      {professional.pixKey}
                    </p>
                  </div>
                  {whatsappHref ? (
                    <a
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#1fb95a]"
                      href={whatsappHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Enviar comprovante pelo WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-emerald-900">
                      Após o pagamento, envie o comprovante diretamente para a
                      profissional pelo WhatsApp.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {professional.services.length === 0 ? (
            <div className="rounded-xl bg-vitta-background p-5 text-center">
              <h2 className="font-semibold text-vitta-text">
                Agendamentos online indisponíveis
              </h2>
              <p className="mt-2 text-sm text-vitta-muted">
                No momento, não há serviços disponíveis para agendamento online.
                Entre em contato diretamente com a profissional.
              </p>
            </div>
          ) : (
            <>
              <form
                action={`/agendar/${encodeURIComponent(slug)}`}
                className="grid gap-4 sm:grid-cols-[1fr_auto]"
              >
                <label className="block text-sm font-medium text-vitta-text">
                  Serviço
                  <select
                    className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                    defaultValue={selectedService?.id ?? ""}
                    name="serviceId"
                    required
                  >
                    <option disabled value="">
                      Selecione um serviço
                    </option>
                    {professional.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {currency.format(Number(service.price))} ·{" "}
                        {service.durationMinutes} min
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-vitta-text">
                  Data
                  <input
                    className="mt-1.5 w-full rounded-xl border border-vitta-border px-3 py-3 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
                    defaultValue={date}
                    max={dateMax}
                    min={today}
                    name="date"
                    required
                    type="date"
                  />
                </label>
                <button
                  className="rounded-xl border border-vitta px-4 py-3 text-sm font-semibold text-vitta transition hover:bg-vitta/5 sm:col-span-2"
                  type="submit"
                >
                  Consultar horários
                </button>
              </form>

              {selectedService && (
                <section className="rounded-2xl border border-vitta-border p-4 sm:p-5">
                  <div className="mb-5">
                    <h2 className="font-semibold text-vitta-text">
                      {selectedService.name}
                    </h2>
                    {selectedService.description && (
                      <p className="mt-1 text-sm leading-6 text-vitta-muted">
                        {selectedService.description}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-vitta">
                      {currency.format(Number(selectedService.price))} ·{" "}
                      {selectedService.durationMinutes} minutos
                    </p>
                    {Number(selectedService.depositAmount ?? 0) > 0 && (
                      <p className="mt-2 rounded-lg bg-vitta-background px-3 py-2 text-sm font-medium text-vitta-text">
                        Sinal para solicitar:{" "}
                        {currency.format(Number(selectedService.depositAmount))}
                      </p>
                    )}
                    {formattedDate && (
                      <p className="mt-2 text-sm font-medium capitalize text-vitta-text">
                        {formattedDate}
                      </p>
                    )}
                  </div>

                  {!validDate ? (
                    <p className="rounded-xl bg-vitta-background p-4 text-sm text-vitta-muted">
                      Escolha uma data entre hoje e os próximos 90 dias para
                      consultar a disponibilidade.
                    </p>
                  ) : (
                    <PublicBookingForm
                      date={date}
                      serviceId={selectedService.id}
                      slug={slug}
                      slots={slots}
                      timeZone={professional.timezone}
                    />
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
