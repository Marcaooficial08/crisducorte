import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EmailContent,
  MAX_LINKS,
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
const UNSUBSCRIBE = "https://x.test/notificacoes/lembretes?u=1&t=abc";

const CLIENT_FOOTER = "Cris du Corte · Rua das Flores, 10 - BH · Dúvidas? Responda este e-mail ou chame o Cris no WhatsApp: (31) 97357-6347.";

const allEmails = (): EmailContent[] => [
  confirmationEmail({ name: "Ana", slot, shop }),
  reminderEmail({ name: "Ana", slot, shop, unsubscribeUrl: UNSUBSCRIBE }),
  cancelledByCrisEmail({ name: "Ana", slot, shop }),
  adminNewBookingEmail({ customerName: "João", slot, shop }),
  adminCancelledEmail({ customerName: "João", slot, shop }),
  renewalEmail({ items: [{ name: "Pedro", situation: "4 de 4 — termina 25/10" }], shop }),
];

const hrefs = (html: string) => Array.from(html.matchAll(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g));

describe("textos dos e-mails", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("datas no fuso de São Paulo", () => {
    expect(slotLabel(FRIDAY_1030)).toBe("sex 23/10 às 10:30");
    expect(longSlotLabel(FRIDAY_1030)).toBe("sexta 23/10 às 10:30");
    // 21:30 de sábado em SP já é domingo em UTC.
    expect(longSlotLabel(new Date("2026-10-25T00:30:00.000Z"))).toBe("sábado 24/10 às 21:30");
  });

  it("entregabilidade: assunto sem '!', no máximo 2 links, todo link com texto (sem URL nua no HTML)", () => {
    for (const email of allEmails()) {
      expect(email.subject).not.toContain("!");
      const links = hrefs(email.html);
      expect(links.length).toBeLessThanOrEqual(MAX_LINKS);
      for (const [, , label] of links) {
        expect(label).not.toMatch(/^https?:/);
      }
      // Todo texto visível do HTML sem URL solta.
      expect(email.html.replace(/<a [^>]*>[^<]*<\/a>/g, "").replace(/<[^>]+>/g, "")).not.toMatch(/https?:\/\//);
      expect(email.html).not.toContain("<img");
      expect(email.text.length).toBeGreaterThan(0);
    }
  });

  it("confirmação: assunto pessoal, primeiro nome, link para /bookings e WhatsApp no rodapé", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://crisducorte.vercel.app");
    const email = confirmationEmail({ name: "João da Silva", slot, shop });

    expect(email.subject).toBe("Sua reserva com o Cris — sex 23/10 às 10:30");
    expect(email.text).toContain("Olá, João!");
    expect(email.text).toContain("Corte de Cabelo, sexta 23/10 às 10:30, em Rua das Flores, 10 - BH.");
    expect(email.text).toContain("Ver ou cancelar a reserva: https://crisducorte.vercel.app/bookings");
    expect(email.text.endsWith(CLIENT_FOOTER)).toBe(true);
    expect(email.html).toContain('<a href="https://wa.me/5531973576347" style="color:#5B3FD6">(31) 97357-6347</a>');
  });

  it("rodapé sem telefone cadastrado: só 'Responda este e-mail'", () => {
    const email = confirmationEmail({ name: null, slot, shop: shopWithoutPhone });

    expect(email.text).toContain("Olá!");
    expect(email.text.endsWith("Dúvidas? Responda este e-mail.")).toBe(true);
    expect(email.html).not.toContain("wa.me");
  });

  it("lembrete: 2 links (cancelar e opt-out); o WhatsApp do rodapé vira texto", () => {
    const email = reminderEmail({ name: "Ana", slot, shop, unsubscribeUrl: UNSUBSCRIBE });

    expect(email.subject).toBe("Amanhã às 10:30 com o Cris — sex 23/10");
    expect(email.text).toContain("Lembrete: amanhã, sexta 23/10 às 10:30, Corte de Cabelo");
    expect(email.text).toContain(`Não quero mais lembretes: ${UNSUBSCRIBE}`);
    expect(hrefs(email.html).map(([, , label]) => label)).toEqual(["Ver ou cancelar a reserva", "Não quero mais lembretes"]);
    expect(email.html).toContain("chame o Cris no WhatsApp: (31) 97357-6347.");
    expect(email.text.endsWith(CLIENT_FOOTER)).toBe(true);
  });

  it("cancelada pelo Cris", () => {
    const email = cancelledByCrisEmail({ name: "Ana", slot, shop });
    expect(email.subject).toBe("Sua reserva de sex 23/10 às 10:30 foi cancelada pelo Cris");
    expect(email.text).toContain("O Cris cancelou a sua reserva: Corte de Cabelo, sexta 23/10 às 10:30.");
    expect(email.text.endsWith(CLIENT_FOOTER)).toBe(true);
  });

  it("avisos ao Cris: sem convite a responder", () => {
    const created = adminNewBookingEmail({ customerName: "João", slot, shop });
    expect(created.subject).toBe("Nova reserva: João — sex 23/10 às 10:30");
    expect(created.text.endsWith("Cris du Corte · Rua das Flores, 10 - BH · Aviso automático do app de agendamento.")).toBe(true);
    expect(created.text).not.toContain("Responda");

    const cancelled = adminCancelledEmail({ customerName: "João", slot, shop });
    expect(cancelled.subject).toBe("Cancelamento: João — sex 23/10 às 10:30");
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
    expect(email.subject).toBe("Renovar mensalistas: Pedro, Ana");
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
