import { fromZonedTime } from "date-fns-tz";
import { SITE_NAME } from "@/app/_lib/site";
import { TIME_GRID, TIME_ZONE } from "@/app/_lib/schedule";

// "Adicionar ao calendário" (Prompt 20, MEL-023): link do Google Agenda e arquivo .ics (Apple/Outlook).
// Funções puras, sem banco: o link do Google é montado no navegador; o .ics, na rota /api/calendario.

// Todo serviço ocupa 1 horário; no calendário vale 60 minutos fixos (decisão do dono, 2026-10-21).
export const EVENT_DURATION_MINUTES = 60;

export interface CalendarEvent {
  date: string; // "yyyy-MM-dd" no fuso de São Paulo
  time: string; // horário da grade, "HH:mm"
  serviceName: string;
  address: string;
  bookingsUrl: string; // "Ver ou cancelar" (na staging, o endereço dela)
}

export const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isGridTime = (value: string): boolean => (TIME_GRID as readonly string[]).includes(value);

// Início e fim como instantes UTC (o horário vem no fuso de São Paulo).
export const eventRange = (date: string, time: string) => {
  const start = fromZonedTime(`${date}T${time}:00`, TIME_ZONE);
  const end = new Date(start.getTime() + EVENT_DURATION_MINUTES * 60 * 1000);
  return { start, end };
};

// 20261023T120000Z (formato UTC do iCalendar e do Google Agenda).
const utcStamp = (instant: Date) => instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const eventTitle = (serviceName: string) => `${serviceName} · ${SITE_NAME}`;

const eventDescription = (bookingsUrl: string) => `Ver ou cancelar a reserva: ${bookingsUrl}`;

export const googleCalendarUrl = (event: CalendarEvent): string => {
  const { start, end } = eventRange(event.date, event.time);
  const params = [
    ["action", "TEMPLATE"],
    ["text", eventTitle(event.serviceName)],
    ["dates", `${utcStamp(start)}/${utcStamp(end)}`],
    ["details", eventDescription(event.bookingsUrl)],
    ["location", event.address],
    ["ctz", TIME_ZONE],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `https://calendar.google.com/calendar/render?${params}`;
};

// Texto do iCalendar (RFC 5545 §3.3.11): barra, ponto e vírgula, vírgula e quebra de linha escapados.
export const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

// Linhas com no máximo 75 octetos (RFC 5545 §3.1); a continuação começa com espaço.
// Nunca corta um caractere de vários bytes (acentos do endereço) no meio.
export const foldIcsLine = (line: string): string => {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  // Array.from percorre por caractere (code point), não por unidade UTF-16.
  for (const char of Array.from(line)) {
    const charSize = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + charSize > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
};

export const icsFileName = (date: string) => `cris-du-corte-${date}.ics`;

export const buildIcs = (event: CalendarEvent, now: Date): string => {
  const { start, end } = eventRange(event.date, event.time);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cris du Corte//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Mesmo horário = mesmo UID: adicionar de novo atualiza o evento em vez de duplicar.
    `UID:${event.date}-${event.time.replace(":", "")}@crisducorte`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcsText(eventTitle(event.serviceName))}`,
    `LOCATION:${escapeIcsText(event.address)}`,
    `DESCRIPTION:${escapeIcsText(eventDescription(event.bookingsUrl))}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT1H",
    `DESCRIPTION:${escapeIcsText(eventTitle(event.serviceName))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
};

// Link do .ics servido por /api/calendario (serviço e endereço lidos do banco lá).
export const icsPath = (date: string, time: string, serviceId: string) =>
  `/api/calendario?${new URLSearchParams({ data: date, hora: time, servico: serviceId }).toString()}`;
