import { formatInTimeZone } from "date-fns-tz";
import { TIME_ZONE } from "@/app/_lib/schedule";
import { Slot, slotLabel } from "./templates";

// Textos do Web Push (Prompt 20), aprovados pelo dono em 2026-10-21. Curtos (2 linhas no Android) e sem
// nome do cliente nem endereço: aparecem na tela bloqueada. `url` é relativa: o SW abre no próprio site.

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string; // mesma tag = substitui em vez de empilhar no aparelho
}

const time = (date: Date) => formatInTimeZone(date, TIME_ZONE, "HH:mm");

// "Sex 23/10"
const shortDay = (date: Date) => {
  const label = slotLabel(date).split(" às ")[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const reminderPush = (input: { bookingId: string; slot: Slot }): PushPayload => ({
  title: `Amanhã às ${time(input.slot.date)} com o Cris`,
  body: `${shortDay(input.slot.date)} · ${input.slot.serviceName}. Não vai poder ir? Toque para ver ou cancelar.`,
  url: "/bookings",
  tag: `booking-${input.bookingId}`,
});

export const cancelledByCrisPush = (input: { bookingId: string; slot: Slot }): PushPayload => ({
  title: "Sua reserva foi cancelada",
  body: `O Cris cancelou ${slotLabel(input.slot.date)} (${input.slot.serviceName}). Toque para escolher outro horário.`,
  url: "/",
  tag: `booking-${input.bookingId}`,
});

export const testPush = (): PushPayload => ({
  title: "Notificações ligadas",
  body: "Você vai receber aqui o lembrete da véspera e os avisos do Cris.",
  url: "/perfil",
  tag: "push-ligado",
});
