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
 * Usada na tela e no saveBooking quando a flag AGENDA_V2 está ligada.
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

export const SLOT_UNAVAILABLE_MESSAGE = "Esse horário não está mais disponível.";

// O horário pedido é um dos liberados agora? (dia liberado, horário da grade, ainda por vir)
export const isBookableSlot = (slot: Date, now: Date): boolean => {
  if (Number.isNaN(slot.getTime()) || slot.getUTCSeconds() !== 0 || slot.getUTCMilliseconds() !== 0) {
    return false;
  }
  const date = formatInTimeZone(slot, TIME_ZONE, "yyyy-MM-dd");
  const time = formatInTimeZone(slot, TIME_ZONE, "HH:mm");
  return getNextServiceDays(now).some((day) => day.date === date && day.times.includes(time));
};
