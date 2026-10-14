import { track as vercelTrack } from "@vercel/analytics";

// Ponto único de eventos de produto. Todo o app chama `track` daqui, nunca
// a ferramenta de analytics diretamente: para trocar de ferramenta no futuro,
// basta alterar a implementação abaixo.
//
// Hoje chama o `track` da Vercel Web Analytics. No plano Hobby, eventos
// personalizados NÃO são registrados (só Pro/Enterprise) — a chamada não tem
// efeito. As métricas de reserva vêm do banco (ver `app/_lib/metrics.ts`).
//
// Não enviar dados pessoais (e-mail, nome, id de usuário).

export type TrackEvent =
  | "booking_started"
  | "login_from_booking"
  | "booking_confirmed"
  | "booking_failed"
  | "booking_cancelled";

export type TrackData = Record<string, string | number | boolean | null>;

export const track = (event: TrackEvent, data?: TrackData) => {
  try {
    vercelTrack(event, data);
  } catch (error) {
    // Analytics nunca deve quebrar o fluxo de reserva.
    console.error(error);
  }
};
