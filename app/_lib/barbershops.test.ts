import { describe, expect, it } from "vitest";
import { HIDDEN_BARBERSHOP_NAMES, visibleBarbershopWhere } from "./barbershops";

describe("visibleBarbershopWhere", () => {
  it("esconde a barbearia Indisponivel sem diferenciar maiúsculas", () => {
    expect(HIDDEN_BARBERSHOP_NAMES).toContain("Indisponivel");
    expect(visibleBarbershopWhere).toEqual({
      NOT: [{ name: { equals: "Indisponivel", mode: "insensitive" } }],
    });
  });
});
