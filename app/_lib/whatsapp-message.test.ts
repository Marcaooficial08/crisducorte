import { describe, expect, it } from "vitest";
import { whatsappConfirmationText, whatsappConfirmationUrl } from "./whatsapp-message";

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
