import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFlagMode,
  isAdminPanelV2Enabled,
  isCalendarioEnabled,
  isEnabled,
  isMensalistasEnabled,
  isMotionEnabled,
  isNotificacoesEnabled,
  isNotificacoesEnabledForUser,
  isPwaInstallEnabled,
  isWebPushEnabled,
  isWebPushEnabledForUser,
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
    vi.stubEnv("NOTIFICACOES", undefined);
    expect(getFlagMode("NOTIFICACOES")).toBe("off");
    expect(isEnabled("NOTIFICACOES", sessionOf(true))).toBe(false);
  });

  it("valor inválido fica off", () => {
    vi.stubEnv("NOTIFICACOES", "sim");
    expect(getFlagMode("NOTIFICACOES")).toBe("off");
    expect(isEnabled("NOTIFICACOES", sessionOf(true))).toBe(false);
  });

  it("off desliga para todos", () => {
    vi.stubEnv("NOTIFICACOES", "off");
    expect(isEnabled("NOTIFICACOES", sessionOf(true))).toBe(false);
    expect(isEnabled("NOTIFICACOES", sessionOf(false))).toBe(false);
  });

  it("admin liga só para quem tem isAdmin", () => {
    vi.stubEnv("NOTIFICACOES", "admin");
    expect(isEnabled("NOTIFICACOES", sessionOf(true))).toBe(true);
    expect(isEnabled("NOTIFICACOES", sessionOf(false))).toBe(false);
    expect(isEnabled("NOTIFICACOES", null)).toBe(false);
  });

  it("all liga para todos, inclusive sem login", () => {
    vi.stubEnv("NOTIFICACOES", " ALL ");
    expect(isEnabled("NOTIFICACOES", sessionOf(false))).toBe(true);
    expect(isEnabled("NOTIFICACOES", null)).toBe(true);
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

  it("WEB_PUSH pela sessão (Perfil) e pelo usuário do banco (Cron e avisos)", () => {
    vi.stubEnv("WEB_PUSH", undefined);
    expect(isWebPushEnabled(sessionOf(true))).toBe(false);
    expect(isWebPushEnabledForUser({ isAdmin: true })).toBe(false);

    vi.stubEnv("WEB_PUSH", "admin");
    expect(isWebPushEnabled(sessionOf(true))).toBe(true);
    expect(isWebPushEnabled(sessionOf(false))).toBe(false);
    expect(isWebPushEnabledForUser({ isAdmin: true })).toBe(true);
    expect(isWebPushEnabledForUser({ isAdmin: false })).toBe(false);
    expect(isWebPushEnabledForUser(null)).toBe(false);

    vi.stubEnv("WEB_PUSH", "all");
    expect(isWebPushEnabledForUser({ isAdmin: false })).toBe(true);
  });

  it("MOTION pela sessão: padrão off; admin só para o admin; all para todos", () => {
    vi.stubEnv("MOTION", undefined);
    expect(getFlagMode("MOTION")).toBe("off");
    expect(isMotionEnabled(sessionOf(true))).toBe(false);
    vi.stubEnv("MOTION", "admin");
    expect(isMotionEnabled(sessionOf(true))).toBe(true);
    expect(isMotionEnabled(sessionOf(false))).toBe(false);
    expect(isMotionEnabled(null)).toBe(false);
    vi.stubEnv("MOTION", "all");
    expect(isMotionEnabled(null)).toBe(true);
  });
});
