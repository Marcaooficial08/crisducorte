import { Session } from "next-auth";
import { z } from "zod";
import { db } from "@/app/_lib/prisma";
import { assertAdmin } from "@/app/_lib/auth-guards";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { TIME_GRID } from "@/app/_lib/schedule";
import { BUSY_MESSAGE } from "@/app/_lib/transaction";

// Peças comuns das Server Actions do painel do admin (app/_actions/admin/).

export type AdminErrorCode =
  | "UNAUTHORIZED"
  | "INVALID"
  | "INVALID_NAME"
  | "INVALID_PHONE"
  | "OUTSIDE_SCHEDULE"
  | "HAS_BOOKING"
  | "SLOT_TAKEN"
  | "SLOT_BLOCKED"
  | "NOT_FOUND"
  | "NO_BARBERSHOP"
  | "BUSY"
  | "GENERIC";

export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  UNAUTHORIZED: "Acesso restrito ao administrador.",
  INVALID: "Dados inválidos. Confira e tente de novo.",
  INVALID_NAME: "Informe o nome do cliente.",
  INVALID_PHONE: "Informe o WhatsApp com DDD (10 ou 11 números).",
  OUTSIDE_SCHEDULE: "Esse horário não está na agenda aberta.",
  HAS_BOOKING: "Esse horário tem reserva. Cancele a reserva antes de bloquear.",
  SLOT_TAKEN: "Esse horário já tem reserva.",
  SLOT_BLOCKED: "Esse horário está bloqueado. Desbloqueie antes de reservar.",
  NOT_FOUND: "Reserva não encontrada.",
  NO_BARBERSHOP: "Nenhuma barbearia disponível.",
  BUSY: BUSY_MESSAGE,
  GENERIC: "Não deu certo agora. Tente de novo em instantes.",
};

export type AdminActionResult =
  | { success: true; message: string }
  | { success: false; code: AdminErrorCode; error: string };

export const adminOk = (message: string): AdminActionResult => ({ success: true, message });

export const adminFail = (code: AdminErrorCode): AdminActionResult => ({
  success: false,
  code,
  error: ADMIN_ERROR_MESSAGES[code],
});

// Erro esperado dentro da transação; a action devolve a mensagem em vez de lançar
// (em produção o Next esconde a mensagem dos erros).
export class AdminActionError extends Error {
  constructor(public readonly code: AdminErrorCode) {
    super(code);
    this.name = "AdminActionError";
  }
}

// isAdmin conferido no servidor, pela sessão (nunca por dado do navegador).
export const isAdminSession = (session: Session | null) => {
  try {
    assertAdmin(session);
    return true;
  } catch {
    return false;
  }
};

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeSchema = z.string().refine((time) => (TIME_GRID as readonly string[]).includes(time));
export const reasonSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((reason) => reason || null);

// Barbearia do painel: a mesma da home nova.
export const getPanelBarbershop = () =>
  db.barbershop.findFirst({ where: visibleBarbershopWhere, orderBy: { id: "asc" }, select: { id: true } });

export const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

// Toast do "Bloquear dia inteiro".
export const blockDayMessage = (blocked: number, kept: number) => {
  const message = `${plural(blocked, "horário bloqueado", "horários bloqueados")}, ${plural(kept, "reserva mantida", "reservas mantidas")}`;
  return kept > 0 ? `${message} (cancele à parte se precisar).` : `${message}.`;
};
