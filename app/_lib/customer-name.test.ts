import { describe, expect, it } from "vitest";
import { getCustomerName } from "./customer-name";

describe("getCustomerName", () => {
  it("usa o customerName quando existe", () => {
    expect(getCustomerName({ customerName: "João", user: { name: "Conta Google" } })).toBe("João");
    expect(getCustomerName({ customerName: "João", user: null })).toBe("João");
  });

  it("sem customerName usa o nome da conta", () => {
    expect(getCustomerName({ customerName: null, user: { name: "Maria" } })).toBe("Maria");
  });

  it("conta sem nome continua como Cliente", () => {
    expect(getCustomerName({ customerName: null, user: { name: null } })).toBe("Cliente");
  });

  it("sem conta e sem customerName é Conta excluída", () => {
    expect(getCustomerName({ customerName: null, user: null })).toBe("Conta excluída");
    expect(getCustomerName({ customerName: "", user: null })).toBe("Conta excluída");
  });
});
