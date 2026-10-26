import { describe, expect, it } from "vitest";
import { hasChangedSinceMount } from "./motion";

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
