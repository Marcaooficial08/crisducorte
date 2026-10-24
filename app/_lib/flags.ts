import { Session } from "next-auth";

// Feature flags lidas de variáveis de ambiente, só no servidor.
// Valor: off | admin | all. Ausente ou inválido = off.
export type FlagName = "ADMIN_PANEL_V2" | "MENSALISTAS" | "NOTIFICACOES" | "CALENDARIO" | "PWA_INSTALL" | "WEB_PUSH" | "MOTION";
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

// Painel do admin com grade, bloqueios e reserva manual (MEL-019). O /adm já é só do admin:
// "admin" e "all" ligam igual.
export const isAdminPanelV2Enabled = (session: Session | null | undefined) => isEnabled("ADMIN_PANEL_V2", session);

// Mensalistas (MEL-025): aba do /adm e, para o cliente, a reserva de mensalista em
// "Meu próximo agendamento". "admin" liga a aba e só o admin se vê como mensalista; "all" liga para todos.
export const isMensalistasEnabled = (session: Session | null | undefined) => isEnabled("MENSALISTAS", session);

// Notificações (Prompt 19, MEL-022): e-mails e botão do WhatsApp na reserva. Na tela, pela sessão.
export const isNotificacoesEnabled = (session: Session | null | undefined) => isEnabled("NOTIFICACOES", session);

// Sem sessão (Cron, aviso a outra pessoa): decide pelo cliente da reserva, lido do banco.
// "admin" = só reservas e cancelamentos de quem é admin geram e-mail (teste em produção sem atingir clientes).
export const isNotificacoesEnabledForUser = (user: { isAdmin: boolean } | null | undefined): boolean => {
  const mode = getFlagMode("NOTIFICACOES");
  return mode === "all" || (mode === "admin" && user?.isAdmin === true);
};

// "Adicionar ao calendário" (Prompt 20, MEL-023): cartão de sucesso da reserva e "Meu próximo agendamento".
export const isCalendarioEnabled = (session: Session | null | undefined) => isEnabled("CALENDARIO", session);

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

// Microinterações (Prompt 21): o layout lê o modo e o MotionProvider decide no navegador (pela sessão
// do SessionProvider, sem deixar as páginas dinâmicas). Pela sessão do servidor, quando houver.
export const isMotionEnabled = (session: Session | null | undefined) => isEnabled("MOTION", session);
