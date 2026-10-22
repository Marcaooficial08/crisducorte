import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFlagMode,
  isAdminPanelV2Enabled,
  isCalendarioEnabled,
  isEnabled,
  isMensalistasEnabled,
  isNewHomeEnabled,
  isNotificacoesEnabled,
  isNotificacoesEnabledForUser,
  isPwaInstallEnabled,
} from "./flags";

const sessionOf = (isAdmin: boolean) => ({
  user: { id: "user-1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("feature flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem variável fica off", () => {
    vi.stubEnv("AGENDA_V2", undefined);
    expect(getFlagMode("AGENDA_V2")).toBe("off");
    expect(isEnabled("AGENDA_V2", sessionOf(true))).toBe(false);
  });

  it("valor inválido fica off", () => {
    vi.stubEnv("AGENDA_V2", "sim");
    expect(getFlagMode("AGENDA_V2")).toBe("off");
    expect(isEnabled("AGENDA_V2", sessionOf(true))).toBe(false);
  });

  it("off desliga para todos", () => {
    vi.stubEnv("AGENDA_V2", "off");
    expect(isEnabled("AGENDA_V2", sessionOf(true))).toBe(false);
    expect(isEnabled("AGENDA_V2", sessionOf(false))).toBe(false);
  });

  it("admin liga só para quem tem isAdmin", () => {
    vi.stubEnv("AGENDA_V2", "admin");
    expect(isEnabled("AGENDA_V2", sessionOf(true))).toBe(true);
    expect(isEnabled("AGENDA_V2", sessionOf(false))).toBe(false);
    expect(isEnabled("AGENDA_V2", null)).toBe(false);
  });

  it("all liga para todos, inclusive sem login", () => {
    vi.stubEnv("AGENDA_V2", " ALL ");
    expect(isEnabled("AGENDA_V2", sessionOf(false))).toBe(true);
    expect(isEnabled("AGENDA_V2", null)).toBe(true);
  });

  it("NEW_HOME=admin: home nova só para o admin", () => {
    vi.stubEnv("NEW_HOME", "admin");
    expect(isNewHomeEnabled(sessionOf(true))).toBe(true);
    expect(isNewHomeEnabled(sessionOf(false))).toBe(false);
    expect(isNewHomeEnabled(null)).toBe(false);
  });

  it("NEW_HOME independe de AGENDA_V2", () => {
    vi.stubEnv("NEW_HOME", "all");
    vi.stubEnv("AGENDA_V2", "off");
    expect(isNewHomeEnabled(null)).toBe(true);
    expect(isEnabled("AGENDA_V2", null)).toBe(false);
  });

  it("ADMIN_PANEL_V2: padrão off; admin ou all ligam para o admin", () => {
    expect(isAdminPanelV2Enabled(sessionOf(true))).toBe(false);
    vi.stubEnv("ADMIN_PANEL_V2", "admin");
    expect(isAdminPanelV2Enabled(sessionOf(true))).toBe(true);
    expect(isAdminPanelV2Enabled(sessionOf(false))).toBe(false);
    vi.stubEnv("ADMIN_PANEL_V2", "all");
    expect(isAdminPanelV2Enabled(sessionOf(true))).toBe(true);
  });

  it("MENSALISTAS: padrão off; admin liga só para o admin; all para todos", () => {
    expect(isMensalistasEnabled(sessionOf(true))).toBe(false);
    vi.stubEnv("MENSALISTAS", "admin");
    expect(isMensalistasEnabled(sessionOf(true))).toBe(true);
    expect(isMensalistasEnabled(sessionOf(false))).toBe(false);
    vi.stubEnv("MENSALISTAS", "all");
    expect(isMensalistasEnabled(sessionOf(false))).toBe(true);
  });

  it("NOTIFICACOES pela sessão (tela) e pelo usuário do banco (Cron e avisos)", () => {
    vi.stubEnv("NOTIFICACOES", undefined);
    expect(isNotificacoesEnabled(sessionOf(true))).toBe(false);
    expect(isNotificacoesEnabledForUser({ isAdmin: true })).toBe(false);

    vi.stubEnv("NOTIFICACOES", "admin");
    expect(isNotificacoesEnabled(sessionOf(true))).toBe(true);
    expect(isNotificacoesEnabled(sessionOf(false))).toBe(false);
    expect(isNotificacoesEnabledForUser({ isAdmin: true })).toBe(true);
    expect(isNotificacoesEnabledForUser({ isAdmin: false })).toBe(false);
    expect(isNotificacoesEnabledForUser(null)).toBe(false);

    vi.stubEnv("NOTIFICACOES", "all");
    expect(isNotificacoesEnabledForUser({ isAdmin: false })).toBe(true);
  });

  it("CALENDARIO pela sessão: admin só para quem é admin, all para todos", () => {
    vi.stubEnv("CALENDARIO", undefined);
    expect(isCalendarioEnabled(sessionOf(true))).toBe(false);

    vi.stubEnv("CALENDARIO", "admin");
    expect(isCalendarioEnabled(sessionOf(true))).toBe(true);
    expect(isCalendarioEnabled(sessionOf(false))).toBe(false);
    expect(isCalendarioEnabled(null)).toBe(false);

    vi.stubEnv("CALENDARIO", "all");
    expect(isCalendarioEnabled(sessionOf(false))).toBe(true);
    expect(isCalendarioEnabled(null)).toBe(true);
  });

  it("PWA_INSTALL pela sessão", () => {
    vi.stubEnv("PWA_INSTALL", undefined);
    expect(isPwaInstallEnabled(sessionOf(true))).toBe(false);
    vi.stubEnv("PWA_INSTALL", "admin");
    expect(isPwaInstallEnabled(sessionOf(true))).toBe(true);
    expect(isPwaInstallEnabled(sessionOf(false))).toBe(false);
    vi.stubEnv("PWA_INSTALL", "all");
    expect(isPwaInstallEnabled(null)).toBe(true);
  });
});
