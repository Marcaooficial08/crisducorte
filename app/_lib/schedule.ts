import { formatInTimeZone } from "date-fns-tz";

export const TIME_ZONE = "America/Sao_Paulo";

export const TIME_GRID = [
  "09:00",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
] as const;

export const AGENDA_CLOSED_MESSAGE = "A agenda da próxima semana abre na segunda-feira";

export interface ServiceDay {
  date: string; // "yyyy-MM-dd" no fuso de São Paulo
  times: string[]; // horários da grade ainda por vir
}

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Dias liberados para reserva (decisão do dono, 2026-10-15):
 * a agenda abre na segunda-feira só para a sexta e o sábado daquela semana.
 * Seg–qui: sexta e sábado. Sexta: sexta (horários futuros) e sábado. Sábado: só o sábado
 * (horários futuros). Domingo: nenhum dia. Dia sem horário futuro sai da lista.
 * Usada na home, no saveBooking e no painel (getSlotStatus).
 */
export const getNextServiceDays = (now: Date): ServiceDay[] => {
  const today = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const currentTime = formatInTimeZone(now, TIME_ZONE, "HH:mm");
  const weekday = Number(formatInTimeZone(now, TIME_ZONE, "i")) % 7; // 0 = domingo

  if (weekday === 0) {
    return [];
  }

  const friday = addDays(today, 5 - weekday);
  const saturday = addDays(today, 6 - weekday);

  return [friday, saturday]
    .filter((date) => date >= today)
    .map((date) => ({
      date,
      times: TIME_GRID.filter((time) => date > today || time > currentTime),
    }))
    .filter((day) => day.times.length > 0);
};

/**
 * Relógio da agenda no servidor. SCHEDULE_NOW só vale no e2e: exige E2E=1 (setado só no
 * playwright.config) e VERCEL ausente. Em qualquer outro caso, new Date().
 */
export const getNow = (): Date => {
  const fixed = process.env.SCHEDULE_NOW;
  if (fixed && process.env.E2E === "1" && process.env.VERCEL === undefined) {
    const date = new Date(fixed);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date();
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// "2026-10-16" → "Sex 16"
export const serviceDayLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${WEEKDAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()}`;
};

export interface DaySlot {
  time: string;
  booked: boolean;
}

export interface DaySlots {
  date: string;
  label: string;
  freeCount: number;
  slots: DaySlot[];
}

export const SLOT_UNAVAILABLE_MESSAGE = "Esse horário não está mais disponível.";
