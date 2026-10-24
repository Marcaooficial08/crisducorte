import { Prisma } from "@prisma/client";
import { db } from "@/app/_lib/prisma";

// Idempotência (Prompt 19): uma linha de NotificationLog por notificação, com key única.
// Quem consegue reservar a linha (SENDING) é o único que envia. Na dúvida, não reenvia:
// prefere perder um e-mail a mandar dois.

export type NotificationKind =
  | "CONFIRMATION"
  | "REMINDER"
  | "CANCELLED_BY_ADMIN"
  | "ADMIN_NEW_BOOKING"
  | "ADMIN_CANCELLED"
  | "ADMIN_RENEWAL"
  // Web Push (Prompt 20): canal separado, key própria ("push-reminder:<reserva>"), independente do e-mail.
  | "PUSH_REMINDER"
  | "PUSH_CANCELLED_BY_ADMIN";

export const MAX_ATTEMPTS = 3;

// SENDING parado há mais que isso = a função morreu no meio (talvez depois de enviar): vira FAILED final.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

// Sem e-mail no banco (LGPD): endereços na mensagem de erro do SMTP viram "<e-mail>".
export const redactError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[^\s<>@"']+@[^\s<>@"']+/g, "<e-mail>").slice(0, 300);
};

// Reserva o envio: cria a linha em SENDING ou retoma uma FAILED que ainda tem tentativa.
// false = já enviada, em andamento, pulada ou sem tentativas: não envia.
export const acquire = async (key: string, kind: NotificationKind): Promise<boolean> => {
  try {
    await db.notificationLog.create({ data: { key, kind, status: "SENDING" } });
    return true;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }
  const retried = await db.notificationLog.updateMany({
    where: { key, status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "SENDING", attempts: { increment: 1 }, lastError: null },
  });
  return retried.count === 1;
};

export const markSent = (key: string) =>
  db.notificationLog.update({ where: { key }, data: { status: "SENT", sentAt: new Date(), lastError: null } });

// retryable = false: não há como montar o e-mail de novo (ex.: a reserva cancelada já foi apagada).
export const markFailed = (key: string, error: unknown, retryable: boolean) =>
  db.notificationLog.update({
    where: { key },
    data: { status: "FAILED", lastError: redactError(error), ...(retryable ? {} : { attempts: MAX_ATTEMPTS }) },
  });

// Pulada de propósito (opt-out, fora da allowlist). Se já existe, fica como está.
export const recordSkipped = async (key: string, kind: NotificationKind, reason: string): Promise<void> => {
  try {
    await db.notificationLog.create({ data: { key, kind, status: "SKIPPED", lastError: reason } });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }
};

// Sem tempo na função para enviar (Prompt 22): nada saiu, então fica FAILED com todas as tentativas
// sobrando e o Cron envia depois. Se a linha já existe, fica como está.
export const DEFERRED_REASON = "Sem tempo na função; fica para o Cron.";

export const deferToCron = async (key: string, kind: NotificationKind): Promise<void> => {
  try {
    await db.notificationLog.create({ data: { key, kind, status: "FAILED", attempts: 0, lastError: DEFERRED_REASON } });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }
};

// SENDING esquecido: pode ter enviado antes de cair. Fecha como FAILED sem nova tentativa.
export const expireStuck = async (now: Date): Promise<number> => {
  const result = await db.notificationLog.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
    data: { status: "FAILED", attempts: MAX_ATTEMPTS, lastError: "Interrompido durante o envio; não reenviado." },
  });
  return result.count;
};

// Falhas que ainda podem ser tentadas de novo, de um tipo.
export const retryableKeys = async (kind: NotificationKind): Promise<string[]> =>
  (
    await db.notificationLog.findMany({
      where: { kind, status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
      select: { key: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    })
  ).map((row) => row.key);
