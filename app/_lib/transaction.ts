import { Prisma } from "@prisma/client";

// Opções das interactive transactions (saveBooking, blockSlot, blockDay, createManualBooking).
// Em produção cada instância tem 1 conexão (transaction pooler, connection_limit=1): requests
// simultâneos fazem fila, então esperar até 10s pela conexão (maxWait, padrão 2s) antes de desistir.
export const INTERACTIVE_TX_OPTIONS = { maxWait: 10_000, timeout: 10_000 } as const;

export const BUSY_MESSAGE = "Muita gente reservando agora, tente de novo em instantes.";

// P2028: a transação não começou a tempo (fila na conexão) ou passou do timeout.
export const isTransactionTimeout = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028";
