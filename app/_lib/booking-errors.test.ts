import { describe, expect, it } from "vitest";
import { BOOKING_ERROR_MESSAGES, clientBookingErrorCode, shouldReloadSlots } from "./booking-errors";

describe("booking-errors", () => {
  it("usa os textos da spec §4.2", () => {
    expect(BOOKING_ERROR_MESSAGES.SLOT_TAKEN).toBe("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.");
    expect(BOOKING_ERROR_MESSAGES.NETWORK).toBe("Sem conexão. Verifique a internet e tente de novo.");
    expect(BOOKING_ERROR_MESSAGES.RATE_LIMIT).toBe("Muitas tentativas seguidas. Aguarde 1 minuto.");
    expect(BOOKING_ERROR_MESSAGES.GENERIC).toBe("Não conseguimos reservar agora. Tente de novo em instantes.");
    expect(BOOKING_ERROR_MESSAGES.BUSY).toBe("Muita gente reservando agora, tente de novo em instantes.");
  });

  it("recarrega a grade só quando o horário deixou de valer", () => {
    expect(shouldReloadSlots("SLOT_TAKEN")).toBe(true);
    expect(shouldReloadSlots("SLOT_UNAVAILABLE")).toBe(true);
    expect(shouldReloadSlots("RATE_LIMIT")).toBe(false);
    expect(shouldReloadSlots("GENERIC")).toBe(false);
    expect(shouldReloadSlots("BUSY")).toBe(false);
  });

  it("exceção no navegador: sem internet ou fetch que caiu = sem conexão; o resto = genérico", () => {
    expect(clientBookingErrorCode(new Error("x"), false)).toBe("NETWORK");
    expect(clientBookingErrorCode(new TypeError("Failed to fetch"), true)).toBe("NETWORK");
    expect(clientBookingErrorCode(new Error("Server Components render"), true)).toBe("GENERIC");
  });
});
