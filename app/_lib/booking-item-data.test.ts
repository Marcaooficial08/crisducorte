import { describe, expect, it } from "vitest";
import { adminBookingItemSelect, bookingItemSelect, formatBookingDate } from "./booking-item-data";

describe("dados dos cartões de reserva", () => {
  it("cliente: só o nome da conta vai para o navegador", () => {
    expect(bookingItemSelect.user).toEqual({ select: { name: true } });
  });

  it("admin: nome, e-mail e foto; nunca isAdmin ou preferências", () => {
    expect(adminBookingItemSelect.user).toEqual({ select: { name: true, email: true, image: true } });
    expect(JSON.stringify(adminBookingItemSelect)).not.toContain("isAdmin");
    expect(JSON.stringify(adminBookingItemSelect)).not.toContain("emailReminders");
  });

  it("formata no fuso de São Paulo, independente do fuso do processo", () => {
    // 12:00 UTC = 09:00 em SP (sem horário de verão).
    const date = new Date("2026-10-23T12:00:00.000Z");
    expect(formatBookingDate(date, "HH:mm")).toBe("09:00");
    expect(formatBookingDate(date, "dd 'de' MMMM")).toBe("23 de outubro");
    // 02:30 UTC de sábado ainda é sexta à noite em SP.
    expect(formatBookingDate(new Date("2026-10-24T02:30:00.000Z"), "dd HH:mm")).toBe("23 23:30");
  });
});
