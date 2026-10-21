import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminCancelledEmail,
  adminNewBookingEmail,
  appUrl,
  cancelledByCrisEmail,
  confirmationEmail,
  longSlotLabel,
  reminderEmail,
  renewalEmail,
  slotLabel,
} from "./templates";

// Sexta 23/10/2026 10:30 em São Paulo (UTC−3).
const FRIDAY_1030 = new Date("2026-10-23T13:30:00.000Z");
const slot = { date: FRIDAY_1030, serviceName: "Corte de Cabelo" };
const shop = { address: "Rua das Flores, 10 - BH", phone: "31973576347" };
const shopWithoutPhone = { address: "Rua das Flores, 10 - BH", phone: null };

const FOOTER =
  "Cris du Corte · Rua das Flores, 10 - BH · Não responda este e-mail — fale com o Cris pelo WhatsApp: https://wa.me/5531973576347";

describe("textos dos e-mails", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("datas no fuso de São Paulo", () => {
    expect(slotLabel(FRIDAY_1030)).toBe("Sex 23/10 às 10:30");
    expect(longSlotLabel(FRIDAY_1030)).toBe("sexta 23/10 às 10:30");
    // 21:30 de sábado em SP já é domingo em UTC.
    expect(longSlotLabel(new Date("2026-10-25T00:30:00.000Z"))).toBe("sábado 24/10 às 21:30");
  });

  it("confirmação: assunto aprovado, primeiro nome, link para /bookings e rodapé", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://crisducorte.vercel.app");
    const email = confirmationEmail({ name: "João da Silva", slot, shop });

    expect(email.subject).toBe("Reservado! Sex 23/10 às 10:30 — Corte de Cabelo");
    expect(email.text).toContain("Olá, João!");
    expect(email.text).toContain("Corte de Cabelo, sexta 23/10 às 10:30, em Rua das Flores, 10 - BH.");
    expect(email.text).toContain("https://crisducorte.vercel.app/bookings");
    expect(email.text.endsWith(FOOTER)).toBe(true);
    expect(email.html).toContain('href="https://wa.me/5531973576347"');
    expect(email.html).not.toContain("<img");
  });

  it("rodapé sem telefone cadastrado: sem link do WhatsApp", () => {
    const email = confirmationEmail({ name: null, slot, shop: shopWithoutPhone });

    expect(email.text).toContain("Olá!");
    expect(email.text.endsWith("Não responda este e-mail — fale com o Cris pelo WhatsApp.")).toBe(true);
    expect(email.html).not.toContain("wa.me");
  });

  it("lembrete: assunto da véspera, link de cancelar e link de opt-out", () => {
    const email = reminderEmail({ name: "Ana", slot, shop, unsubscribeUrl: "https://x.test/notificacoes/lembretes?u=1&t=abc" });

    expect(email.subject).toBe("Amanhã às 10:30 com o Cris");
    expect(email.text).toContain("Lembrete: amanhã, sexta 23/10 às 10:30, Corte de Cabelo");
    expect(email.text).toContain("Não quero mais lembretes: https://x.test/notificacoes/lembretes?u=1&t=abc");
    expect(email.html).toContain('href="https://x.test/notificacoes/lembretes?u=1&amp;t=abc"');
    expect(email.text.endsWith(FOOTER)).toBe(true);
  });

  it("cancelada pelo Cris", () => {
    const email = cancelledByCrisEmail({ name: "Ana", slot, shop });
    expect(email.subject).toBe("Sua reserva de Sex 23/10 às 10:30 foi cancelada pelo Cris");
    expect(email.text).toContain("O Cris cancelou a sua reserva: Corte de Cabelo, sexta 23/10 às 10:30.");
  });

  it("avisos ao Cris: nova reserva e cancelamento", () => {
    expect(adminNewBookingEmail({ customerName: "João", slot, shop }).subject).toBe("Nova reserva: João · Sex 23/10 às 10:30");
    const cancelled = adminCancelledEmail({ customerName: "João", slot, shop });
    expect(cancelled.subject).toBe("Cancelou: João · Sex 23/10 às 10:30");
    expect(cancelled.text).toContain("O horário voltou a ficar livre.");
  });

  it("renovação: todos os nomes no assunto e um item por mensalista", () => {
    const email = renewalEmail({
      items: [
        { name: "Pedro", situation: "4 de 4 — termina 25/10" },
        { name: "Ana", situation: "Ciclo terminou em 18/10" },
      ],
      shop,
    });
    expect(email.subject).toBe("Renovar: Pedro, Ana — último fim de semana do ciclo");
    expect(email.text).toContain("• Pedro: 4 de 4 — termina 25/10");
    expect(email.text).toContain("• Ana: Ciclo terminou em 18/10");
  });

  it("HTML escapa o nome do cliente", () => {
    const email = adminNewBookingEmail({ customerName: '<script>alert("x")</script>', slot, shop });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("links seguem o NEXTAUTH_URL (staging) e caem no site sem ele", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://crisducorte-staging.vercel.app/");
    expect(appUrl("/adm")).toBe("https://crisducorte-staging.vercel.app/adm");
    vi.stubEnv("NEXTAUTH_URL", undefined);
    expect(appUrl("/adm")).toBe("https://crisducorte.vercel.app/adm");
  });
});
