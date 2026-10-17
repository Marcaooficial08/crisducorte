import { afterEach, describe, expect, it, vi } from "vitest";
import { getFlagMode, isEnabled, isNewHomeEnabled } from "./flags";

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
});
