import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "./templates";

// Link "Não quero mais lembretes" (Prompt 19): HMAC do id do usuário com o NEXTAUTH_SECRET, num contexto
// próprio (o mesmo segredo nunca assina outra coisa com este prefixo). Sem validade: desligar
// lembrete é inofensivo e o link precisa funcionar em e-mail antigo. Trocar o segredo invalida os links.

const CONTEXT = "crisducorte:notificacoes:lembretes:v1:";

const secret = (): string => {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("NEXTAUTH_SECRET ausente.");
  }
  return value;
};

export const unsubscribeToken = (userId: string): string =>
  createHmac("sha256", secret()).update(CONTEXT + userId).digest("base64url");

export const verifyUnsubscribeToken = (userId: string, token: string): boolean => {
  if (!userId || !token) {
    return false;
  }
  const expected = Buffer.from(unsubscribeToken(userId));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

const query = (userId: string) => `u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

// Página para a pessoa confirmar (um GET nunca desliga: antivírus de e-mail abre links sozinho).
export const unsubscribePageUrl = (userId: string): string => appUrl(`/notificacoes/lembretes?${query(userId)}`);

// One-click do Gmail (RFC 8058, cabeçalho List-Unsubscribe-Post): só POST desliga.
export const unsubscribeOneClickUrl = (userId: string): string => appUrl(`/api/notificacoes/lembretes?${query(userId)}`);
