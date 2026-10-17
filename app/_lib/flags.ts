import { Session } from "next-auth";

// Feature flags lidas de variáveis de ambiente, só no servidor.
// Valor: off | admin | all. Ausente ou inválido = off.
export type FlagName = "AGENDA_V2" | "NEW_HOME";
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
