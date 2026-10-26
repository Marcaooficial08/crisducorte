import { whatsappUrl } from "./phone";

// Texto pronto do botão "Enviar confirmação no WhatsApp" (MEL-022, spec §3 WhatsAppButton).
// Função pura: roda no navegador, com o dia e o horário da grade.

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface WhatsappConfirmation {
  phone: string; // WhatsApp do Cris (Barbershop.phone, só dígitos)
  address: string;
  serviceName: string;
  date: string; // "2026-10-23"
  time: string; // "10:30"
}

// "2026-10-23" → "sexta 23/10"
const dayText = (isoDate: string) => {
  const weekday = WEEKDAY_NAMES[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
};

export const whatsappConfirmationText = ({ serviceName, date, time, address }: Omit<WhatsappConfirmation, "phone">): string =>
  `Olá, Cris! Reservei ${serviceName} para ${dayText(date)} às ${time} pelo app. Endereço: ${address}.`;

export const whatsappConfirmationUrl = (input: WhatsappConfirmation): string =>
  `${whatsappUrl(input.phone)}?text=${encodeURIComponent(whatsappConfirmationText(input))}`;

// "Lembrar no WhatsApp" do painel (Prompt 22): o Cris manda o lembrete para quem reservou na mão.
export interface WhatsappReminder {
  phone: string; // WhatsApp do cliente (Booking.customerPhone, só dígitos)
  customerName: string;
  address: string;
  serviceName: string;
  date: string; // "2026-10-23"
  time: string; // "10:30"
}

export const whatsappReminderText = ({ customerName, serviceName, date, time, address }: Omit<WhatsappReminder, "phone">): string => {
  const firstName = customerName.trim().split(/\s+/)[0];
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  return `${greeting} Passando para lembrar do seu horário com o Cris: ${serviceName}, ${dayText(date)} às ${time}. Endereço: ${address}. Até lá!`;
};

export const whatsappReminderUrl = (input: WhatsappReminder): string =>
  `${whatsappUrl(input.phone)}?text=${encodeURIComponent(whatsappReminderText(input))}`;
