import { describe, expect, it } from "vitest";
import { Session } from "next-auth";
import { AuthError, assertAdmin, assertUser } from "./auth-guards";

const makeSession = (isAdmin: boolean): Session => ({
  user: { id: "user-1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("assertUser", () => {
  it("lança AuthError sem sessão", () => {
    expect(() => assertUser(null)).toThrow(AuthError);
    expect(() => assertUser(undefined)).toThrow(AuthError);
  });

  it("devolve o usuário da sessão", () => {
    expect(assertUser(makeSession(false)).id).toBe("user-1");
  });
});

describe("assertAdmin", () => {
  it("lança AuthError sem sessão", () => {
    expect(() => assertAdmin(null)).toThrow(AuthError);
  });

  it("lança AuthError para usuário comum", () => {
    expect(() => assertAdmin(makeSession(false))).toThrow("Acesso restrito ao administrador.");
  });

  it("devolve o usuário quando isAdmin é true", () => {
    expect(assertAdmin(makeSession(true)).isAdmin).toBe(true);
  });
});
