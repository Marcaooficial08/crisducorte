// Seleção da home nova guardada antes do login com Google (MEL-009, spec §4.1 item 6).
// Sem sessionStorage (aba anônima, bloqueado, servidor) as funções não fazem nada: o fluxo segue sem retomar.

export interface BookingResume {
  serviceId: string;
  date: string; // yyyy-MM-dd (São Paulo)
  time: string; // HH:mm
}

export const BOOKING_RESUME_KEY = "crisducorte:booking-resume";
export const RESUME_PARAM = "resume";
export const RESUME_CALLBACK_URL = `/?${RESUME_PARAM}=1`;
export const RESUME_UNAVAILABLE_MESSAGE = "Esse horário não está mais disponível. Escolha outro.";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const isBookingResume = (value: unknown): value is BookingResume => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { serviceId, date, time } = value as Record<string, unknown>;
  return typeof serviceId === "string" && typeof date === "string" && DATE_PATTERN.test(date) && typeof time === "string" && TIME_PATTERN.test(time);
};

export const saveBookingResume = (resume: BookingResume) => {
  try {
    window.sessionStorage.setItem(BOOKING_RESUME_KEY, JSON.stringify(resume));
  } catch {
    // Sem storage: depois do login a home abre como hoje, sem a seleção.
  }
};

// Lê e apaga: a seleção só é retomada uma vez.
export const takeBookingResume = (): BookingResume | undefined => {
  try {
    const raw = window.sessionStorage.getItem(BOOKING_RESUME_KEY);
    window.sessionStorage.removeItem(BOOKING_RESUME_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    return isBookingResume(parsed) ? { serviceId: parsed.serviceId, date: parsed.date, time: parsed.time } : undefined;
  } catch {
    return undefined;
  }
};
