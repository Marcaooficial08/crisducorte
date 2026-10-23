import { describe, expect, it } from "vitest";
import {
  buildIcs,
  escapeIcsText,
  eventRange,
  foldIcsLine,
  googleCalendarUrl,
  icsFileName,
  icsPath,
  isGridTime,
  isValidDate,
} from "./calendar";

const EVENT = {
  date: "2026-10-23",
  time: "09:00",
  serviceName: "Corte de Cabelo",
  address: "Rua dos Testes, 1; Centro, Belo Horizonte",
  bookingsUrl: "https://crisducorte.vercel.app/bookings",
};
const NOW = new Date("2026-10-21T15:04:05.678Z");

const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const lineOf = (ics: string, name: string) => unfold(ics).split("\r\n").find((line) => line.startsWith(`${name}:`));

describe("calendário (.ics e Google Agenda)", () => {
  it("horário de São Paulo vira UTC (UTC-3) e dura 60 minutos", () => {
    expect(eventRange("2026-10-23", "09:00")).toEqual({
      start: new Date("2026-10-23T12:00:00Z"),
      end: new Date("2026-10-23T13:00:00Z"),
    });
    // 09:00 → 10:30 na grade, mas o evento continua com 1 hora.
    expect(eventRange("2026-10-24", "19:30")).toEqual({
      start: new Date("2026-10-24T22:30:00Z"),
      end: new Date("2026-10-24T23:30:00Z"),
    });
  });

  it("valida data real e horário da grade", () => {
    expect(isValidDate("2026-10-23")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("23/10/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isGridTime("10:30")).toBe(true);
    expect(isGridTime("10:00")).toBe(false);
    expect(isGridTime("9:00")).toBe(false);
  });

  it("link do Google Agenda com datas em UTC, fuso de SP, título, local e link", () => {
    const url = new URL(googleCalendarUrl(EVENT));
    expect(`${url.origin}${url.pathname}`).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20261023T120000Z/20261023T130000Z");
    expect(url.searchParams.get("ctz")).toBe("America/Sao_Paulo");
    expect(url.searchParams.get("text")).toBe("Corte de Cabelo · Cris du Corte");
    expect(url.searchParams.get("location")).toBe(EVENT.address);
    expect(url.searchParams.get("details")).toBe("Ver ou cancelar a reserva: https://crisducorte.vercel.app/bookings");
  });

  it(".ics com CRLF, UTC, UID estável, alarme de 1 hora e endereço escapado", () => {
    const ics = buildIcs(EVENT, NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    expect(lineOf(ics, "DTSTART")).toBe("DTSTART:20261023T120000Z");
    expect(lineOf(ics, "DTEND")).toBe("DTEND:20261023T130000Z");
    expect(lineOf(ics, "DTSTAMP")).toBe("DTSTAMP:20261021T150405Z");
    expect(lineOf(ics, "UID")).toBe("UID:2026-10-23-0900@crisducorte");
    expect(lineOf(ics, "SUMMARY")).toBe("SUMMARY:Corte de Cabelo · Cris du Corte");
    expect(lineOf(ics, "LOCATION")).toBe("LOCATION:Rua dos Testes\\, 1\\; Centro\\, Belo Horizonte");
    expect(unfold(ics)).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT1H\r\n");
    // Mesmo horário, outro momento: mesmo UID (o calendário atualiza em vez de duplicar).
    expect(lineOf(buildIcs(EVENT, new Date()), "UID")).toBe(lineOf(ics, "UID"));
  });

  it("escapa barra, ponto e vírgula, vírgula e quebra de linha", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("dobra linhas em 75 octetos sem cortar acento no meio", () => {
    const line = `LOCATION:${"Avenida São João, ".repeat(8)}`;
    const folded = foldIcsLine(line);
    const encoder = new TextEncoder();
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((part, index) => {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
      if (index > 0) {
        expect(part.startsWith(" ")).toBe(true);
      }
    });
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    expect(foldIcsLine("CURTA:ok")).toBe("CURTA:ok");
  });

  it("nome do arquivo e link da rota", () => {
    expect(icsFileName("2026-10-23")).toBe("cris-du-corte-2026-10-23.ics");
    expect(icsPath("2026-10-23", "10:30", "svc-1")).toBe("/api/calendario?data=2026-10-23&hora=10%3A30&servico=svc-1");
  });
});
