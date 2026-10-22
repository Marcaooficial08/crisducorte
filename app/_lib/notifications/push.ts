import webpush from "web-push";
import { PushPayload } from "./push-templates";

// Web Push (Prompt 20): ponto único de envio, pela lib web-push (VAPID + criptografia da mensagem).
// Sem as três variáveis VAPID_* nada sai (testes, ambiente sem configuração).

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// SENT = entregue ao serviço de push; GONE = inscrição vencida (404/410), apagar; FAILED = erro passageiro.
export type PushResult = { status: "SENT" } | { status: "GONE" } | { status: "FAILED"; error: unknown };

export const isPushConfigured = (): boolean =>
  !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT;

// O servidor faz POST no endpoint que veio do navegador: só serviços de push conhecidos, por https
// (sem isso, qualquer URL viraria um pedido feito pelo nosso servidor).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge no Android, Samsung Internet
  /^web\.push\.apple\.com$/, // Safari (iPhone com o app instalado, Mac)
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge no Windows
];

export const isAllowedEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      PUSH_HOSTS.some((host) => host.test(url.hostname))
    );
  } catch {
    return false;
  }
};

const statusCodeOf = (error: unknown): number | undefined => {
  const code = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof code === "number" ? code : undefined;
};

export const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export const sendPush = async (target: PushTarget, payload: PushPayload, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<PushResult> => {
  if (!isPushConfigured()) {
    return { status: "FAILED", error: new Error("Web Push não configurado (VAPID_*).") };
  }
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT ?? "",
          publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
          privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
        },
        TTL: Math.max(60, Math.min(DEFAULT_TTL_SECONDS, Math.round(ttlSeconds))),
        urgency: "high",
        timeout: 10_000,
      },
    );
    return { status: "SENT" };
  } catch (error) {
    const code = statusCodeOf(error);
    if (code === 404 || code === 410) {
      return { status: "GONE" };
    }
    return { status: "FAILED", error };
  }
};
