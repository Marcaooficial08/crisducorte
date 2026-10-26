import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFlagMode,
  isEnabled,
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
});
