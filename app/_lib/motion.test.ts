import { describe, expect, it } from "vitest";
import { hasChangedSinceMount, isMotionOn } from "./motion";

describe("isMotionOn (MotionProvider, no navegador)", () => {
  it("off desliga para todos", () => {
    expect(isMotionOn("off", true)).toBe(false);
    expect(isMotionOn("off", undefined)).toBe(false);
  });

  it("admin liga só com isAdmin true (sem sessão ou carregando = desligado)", () => {
    expect(isMotionOn("admin", true)).toBe(true);
    expect(isMotionOn("admin", false)).toBe(false);
    expect(isMotionOn("admin", undefined)).toBe(false);
  });

  it("all liga para todos, inclusive sem login", () => {
    expect(isMotionOn("all", undefined)).toBe(true);
  });
});

describe("hasChangedSinceMount", () => {
  it("igual ao valor da montagem = não mudou (não anima ao abrir a página)", () => {
    expect(hasChangedSinceMount("free", "free", false)).toBe(false);
    expect(hasChangedSinceMount(3, 3, false)).toBe(false);
  });

  it("valor diferente = mudou", () => {
    expect(hasChangedSinceMount("free", "blocked", false)).toBe(true);
    expect(hasChangedSinceMount(3, 4, false)).toBe(true);
  });

  it("depois de mudar uma vez, voltar ao valor inicial continua animando", () => {
    expect(hasChangedSinceMount("free", "free", true)).toBe(true);
  });
});
