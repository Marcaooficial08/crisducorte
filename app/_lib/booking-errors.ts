import { RATE_LIMIT_MESSAGE } from "./rate-limit";
import { SLOT_UNAVAILABLE_MESSAGE } from "./schedule";
import { BUSY_MESSAGE } from "./transaction";

// Erros da reserva e as mensagens da spec §4.2.
export type BookingErrorCode =
  | "SLOT_TAKEN" // outra pessoa reservou antes (P2002)
  | "SLOT_UNAVAILABLE" // horário fora da agenda, bloqueado ou já passou
  | "RATE_LIMIT"
  | "BUSY" // fila na conexão do banco (P2028)
  | "UNAUTHENTICATED"
  | "INVALID" // dados forjados ou desatualizados: serviço de outra barbearia, barbearia escondida
  | "NETWORK" // só no navegador: a action nem chegou ao servidor
  | "GENERIC";

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  SLOT_TAKEN: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.",
  SLOT_UNAVAILABLE: SLOT_UNAVAILABLE_MESSAGE,
  RATE_LIMIT: RATE_LIMIT_MESSAGE,
  BUSY: BUSY_MESSAGE,
  UNAUTHENTICATED: "Faça login para agendar.",
  INVALID: "Não conseguimos reservar esse serviço. Atualize a página e tente de novo.",
  NETWORK: "Sem conexão. Verifique a internet e tente de novo.",
  GENERIC: "Não conseguimos reservar agora. Tente de novo em instantes.",
};

// Depois desses erros a grade está desatualizada: recarregar os horários.
export const shouldReloadSlots = (code: BookingErrorCode) => code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE";

// Exceção ao chamar a action no navegador: sem internet ou a requisição caiu (fetch → TypeError).
export const clientBookingErrorCode = (error: unknown, online: boolean): BookingErrorCode =>
  !online || error instanceof TypeError ? "NETWORK" : "GENERIC";
