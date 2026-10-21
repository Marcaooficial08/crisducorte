import { Session } from "next-auth";

// Feature flags lidas de variáveis de ambiente, só no servidor.
// Valor: off | admin | all. Ausente ou inválido = off.
export type FlagName = "AGENDA_V2" | "NEW_HOME" | "ADMIN_PANEL_V2" | "MENSALISTAS" | "NOTIFICACOES" | "CALENDARIO";
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

export const isAgendaV2Enabled = (session: Session | null | undefined) => isEnabled("AGENDA_V2", session);

export const isNewHomeEnabled = (session: Session | null | undefined) => isEnabled("NEW_HOME", session);

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
