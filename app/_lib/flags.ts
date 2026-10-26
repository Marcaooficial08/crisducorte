import { Session } from "next-auth";

// Feature flags lidas de variáveis de ambiente, só no servidor.
// Valor: off | admin | all. Ausente ou inválido = off.
// Desde o Prompt 22 só ficam os "botões de desligar": dependem de serviço externo ou do service worker.
export type FlagName = "NOTIFICACOES" | "PWA_INSTALL" | "WEB_PUSH";
export type FlagMode = "off" | "admin" | "all";

const MODES: readonly FlagMode[] = ["off", "admin", "all"];

export const getFlagMode = (flag: FlagName): FlagMode => {
  const value = process.env[flag]?.trim().toLowerCase();
  return MODES.find((mode) => mode === value) ?? "off";
};

export const isEnabled = (flag: FlagName, session: Session | null | undefined): boolean => {
  const mode = getFlagMode(flag);
  if (mode === "all") {
    return true;
  }
  if (mode === "admin") {
    return session?.user?.isAdmin === true;
  }
  return false;
};

// Notificações (Prompt 19, MEL-022): e-mails e botão do WhatsApp na reserva. Na tela, pela sessão.
export const isNotificacoesEnabled = (session: Session | null | undefined) => isEnabled("NOTIFICACOES", session);

// Sem sessão (Cron, aviso a outra pessoa): decide pelo cliente da reserva, lido do banco.
// "admin" = só reservas e cancelamentos de quem é admin geram e-mail (teste em produção sem atingir clientes).
export const isNotificacoesEnabledForUser = (user: { isAdmin: boolean } | null | undefined): boolean => {
  const mode = getFlagMode("NOTIFICACOES");
  return mode === "all" || (mode === "admin" && user?.isAdmin === true);
};

// PWA (Prompt 20, MEL-023): registro do service worker e dica "Adicionar à tela inicial".
// O manifest fica fora de flag. Com "off", o /sw.js se remove sozinho dos aparelhos que já o têm.
export const isPwaInstallEnabled = (session: Session | null | undefined) => isEnabled("PWA_INSTALL", session);

// Web Push (Prompt 20): switch "Notificações no celular" no Perfil, pela sessão.
export const isWebPushEnabled = (session: Session | null | undefined) => isEnabled("WEB_PUSH", session);

// Envio sem sessão (Cron, "o Cris cancelou"): decide pelo cliente da reserva, como em NOTIFICACOES.
export const isWebPushEnabledForUser = (user: { isAdmin: boolean } | null | undefined): boolean => {
  const mode = getFlagMode("WEB_PUSH");
  return mode === "all" || (mode === "admin" && user?.isAdmin === true);
};
