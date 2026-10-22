// Web Push no navegador (Prompt 20): estado do switch "Notificações no celular" e inscrição do aparelho.

export type PushStatus = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export const PUSH_STATUS_MESSAGES: Partial<Record<PushStatus, string>> = {
  unsupported: "Este navegador não recebe notificações.",
  "ios-install": "No iPhone, instale o app primeiro (Compartilhar → Adicionar à Tela de Início) e ative por ele.",
  denied: "As notificações estão bloqueadas. Libere nas configurações do navegador para este site.",
};

export const PUSH_ERROR_MESSAGE = "Não foi possível ativar agora. Tente de novo.";

export interface PushEnvironment {
  ios: boolean; // iPhone/iPad
  standalone: boolean; // aberto como app instalado
  supported: boolean; // serviceWorker + PushManager + Notification
  permission: NotificationPermission | "unsupported";
}

// Estado antes de olhar a inscrição: no iPhone o push só existe com o app instalado (iOS 16.4+).
export const pushStatusOf = (env: PushEnvironment): PushStatus | null => {
  if (env.ios && !env.standalone) {
    return "ios-install";
  }
  if (!env.supported) {
    return "unsupported";
  }
  if (env.permission === "denied") {
    return "denied";
  }
  return null; // suportado: "on" ou "off" pela inscrição do navegador
};

// Chave pública VAPID (base64url) → bytes para o pushManager.subscribe.
export const urlBase64ToUint8Array = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const sameKey = (current: ArrayBuffer | null | undefined, expected: Uint8Array): boolean => {
  if (!current) {
    return false;
  }
  const bytes = new Uint8Array(current);
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
};
