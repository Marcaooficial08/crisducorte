import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsubscribeOneClickUrl, unsubscribePageUrl, unsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe-token";

describe("token do link de opt-out", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "segredo-de-teste");
    vi.stubEnv("NEXTAUTH_URL", "https://crisducorte-staging.vercel.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aceita o token do próprio usuário", () => {
    expect(verifyUnsubscribeToken("user-1", unsubscribeToken("user-1"))).toBe(true);
  });

  it("recusa token de outro usuário, alterado ou vazio", () => {
    const token = unsubscribeToken("user-1");
    expect(verifyUnsubscribeToken("user-2", token)).toBe(false);
    expect(verifyUnsubscribeToken("user-1", `${token.slice(0, -1)}x`)).toBe(false);
    expect(verifyUnsubscribeToken("user-1", "")).toBe(false);
    expect(verifyUnsubscribeToken("", token)).toBe(false);
  });

  it("trocar o NEXTAUTH_SECRET invalida os links antigos", () => {
    const token = unsubscribeToken("user-1");
    vi.stubEnv("NEXTAUTH_SECRET", "outro-segredo");
    expect(verifyUnsubscribeToken("user-1", token)).toBe(false);
  });

  it("monta a página (GET) e o one-click (POST) no endereço do ambiente", () => {
    const token = unsubscribeToken("user-1");
    expect(unsubscribePageUrl("user-1")).toBe(`https://crisducorte-staging.vercel.app/notificacoes/lembretes?u=user-1&t=${token}`);
    expect(unsubscribeOneClickUrl("user-1")).toBe(`https://crisducorte-staging.vercel.app/api/notificacoes/lembretes?u=user-1&t=${token}`);
  });
});
