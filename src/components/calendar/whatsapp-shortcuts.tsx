import { formatTime } from "@/lib/schedule";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { getWhatsAppNumber } from "@/lib/whatsapp";

type WhatsAppShortcutsProps = {
  whatsapp: string;
  clientName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  professionalName: string;
  status: AppointmentStatus;
};

export function WhatsAppShortcuts({
  whatsapp,
  clientName,
  serviceName,
  startsAt,
  endsAt,
  timeZone,
  professionalName,
  status,
}: WhatsAppShortcutsProps) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "long",
  }).format(startsAt);
  const time = `${formatTime(startsAt, timeZone)} às ${formatTime(endsAt, timeZone)}`;
  const messages =
    status === "PENDING"
      ? [
          {
            label: "Solicitação recebida",
            message: `Olá, ${clientName}! Recebi sua solicitação para ${serviceName}, em ${date}, das ${time}. Vou confirmar seu horário em breve.`,
          },
        ]
      : status === "CONFIRMED"
        ? [
            {
              label: "Confirmação",
              message: `Olá, ${clientName}! Seu horário para ${serviceName}, em ${date}, das ${time}, está confirmado. Até lá!`,
            },
            {
              label: "Lembrete",
              message: `Oi, ${clientName}! Passando para lembrar do seu horário de ${serviceName}, em ${date}, das ${time}. Até breve!`,
            },
          ]
        : status === "COMPLETED"
          ? [
              {
                label: "Agradecimento",
                message: `Oi, ${clientName}! Obrigada pela preferência e por escolher ${professionalName}. Foi um prazer te atender!`,
              },
            ]
          : [];
  const phone = getWhatsAppNumber(whatsapp);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {messages.map((item) => (
        <a
          className="rounded-lg border border-vitta-border px-3 py-1.5 text-xs font-medium text-vitta-text transition hover:bg-vitta-background"
          href={`https://wa.me/${phone}?text=${encodeURIComponent(item.message)}`}
          key={item.label}
          rel="noreferrer"
          target="_blank"
        >
          WhatsApp · {item.label}
        </a>
      ))}
    </div>
  );
}
