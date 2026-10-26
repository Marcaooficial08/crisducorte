import { describe, expect, it } from "vitest";
import { whatsappConfirmationText, whatsappConfirmationUrl, whatsappReminderText, whatsappReminderUrl } from "./whatsapp-message";

const input = {
  phone: "31973576347",
  address: "Rua das Flores, 10 - BH",
  serviceName: "Corte de Cabelo",
  date: "2026-10-24",
  time: "10:30",
};

describe("WhatsAppButton (MEL-022)", () => {
  it("texto pronto com serviço, dia, hora e endereço", () => {
    expect(whatsappConfirmationText(input)).toBe(
      "Olá, Cris! Reservei Corte de Cabelo para sábado 24/10 às 10:30 pelo app. Endereço: Rua das Flores, 10 - BH.",
    );
  });

  it("link wa.me com o telefone do banco e o texto codificado", () => {
    const url = new URL(whatsappConfirmationUrl(input));
    expect(`${url.origin}${url.pathname}`).toBe("https://wa.me/5531973576347");
    expect(url.searchParams.get("text")).toBe(whatsappConfirmationText(input));
  });
});

describe("Lembrar no WhatsApp (painel, Prompt 22)", () => {
  const reminder = {
    phone: "31988887777",
    customerName: "  João da Silva ",
    address: "Rua das Flores, 10 - BH",
    serviceName: "Corte de Cabelo",
    date: "2026-10-23",
    time: "10:30",
  };

  it("texto com o primeiro nome, serviço, dia, hora e endereço", () => {
    expect(whatsappReminderText(reminder)).toBe(
      "Olá, João! Passando para lembrar do seu horário com o Cris: Corte de Cabelo, sexta 23/10 às 10:30. Endereço: Rua das Flores, 10 - BH. Até lá!",
    );
  });

  it("sem nome: só Olá", () => {
    expect(whatsappReminderText({ ...reminder, customerName: " " })).toMatch(/^Olá! Passando/);
  });

  it("link wa.me para o telefone do cliente, com o texto codificado", () => {
    const url = new URL(whatsappReminderUrl(reminder));
    expect(`${url.origin}${url.pathname}`).toBe("https://wa.me/5531988887777");
    expect(url.searchParams.get("text")).toBe(whatsappReminderText(reminder));
  });
});
