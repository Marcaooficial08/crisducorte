import { describe, expect, it } from "vitest";
import { cancelledByCrisPush, reminderPush, testPush } from "./push-templates";

// Sexta 23/10/2026 às 09:00 em São Paulo.
const SLOT = { date: new Date("2026-10-23T12:00:00.000Z"), serviceName: "Corte de Cabelo" };

describe("textos do Web Push (aprovados em 2026-10-21)", () => {
  it("lembrete da véspera", () => {
    expect(reminderPush({ bookingId: "b1", slot: SLOT })).toEqual({
      title: "Amanhã às 09:00 com o Cris",
      body: "Sex 23/10 · Corte de Cabelo. Não vai poder ir? Toque para ver ou cancelar.",
      url: "/bookings",
      tag: "booking-b1",
    });
  });

  it("o Cris cancelou", () => {
    expect(cancelledByCrisPush({ bookingId: "b1", slot: SLOT })).toEqual({
      title: "Sua reserva foi cancelada",
      body: "O Cris cancelou sex 23/10 às 09:00 (Corte de Cabelo). Toque para escolher outro horário.",
      url: "/",
      tag: "booking-b1",
    });
  });

  it("teste ao ligar", () => {
    expect(testPush()).toMatchObject({
      title: "Notificações ligadas",
      body: "Você vai receber aqui o lembrete da véspera e os avisos do Cris.",
    });
  });

  it("sábado e horário da tarde no fuso de São Paulo", () => {
    const saturday = { date: new Date("2026-10-24T22:30:00.000Z"), serviceName: "Barba" };
    expect(reminderPush({ bookingId: "b2", slot: saturday })).toMatchObject({
      title: "Amanhã às 19:30 com o Cris",
      body: "Sáb 24/10 · Barba. Não vai poder ir? Toque para ver ou cancelar.",
    });
  });
});
