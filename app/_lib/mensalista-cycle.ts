import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIME_ZONE, serviceDayLabel } from "@/app/_lib/schedule";

// Ciclo do mensalista (spec §5, decisões do Prompt 18). Funções puras, sem banco: também rodam
// no navegador (prévia do "Registrar pagamento").
//
// Datas como "yyyy-MM-dd" no fuso de São Paulo. Um fim de semana é identificado pela sua sexta.
// No banco: MensalistaCycle.weekends = as sextas geradas (00:00 de São Paulo) e
// endsAt = o domingo depois do último fim de semana (00:00 de São Paulo).

export const CYCLE_WEEKENDS = 4;

export const FIXED_DAYS = [5, 6] as const; // 5 = sexta, 6 = sábado
export type FixedDay = (typeof FIXED_DAYS)[number];

export const isFixedDay = (day: number | null | undefined): day is FixedDay => day === 5 || day === 6;

export const FIXED_DAY_LABELS: Record<FixedDay, string> = { 5: "Toda sexta", 6: "Todo sábado" };

export const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Instante → data em São Paulo.
export const dateOf = (instant: Date): string => formatInTimeZone(instant, TIME_ZONE, "yyyy-MM-dd");

// Data (00:00 de São Paulo) → instante gravado em weekends[] e endsAt.
export const dateToDb = (isoDate: string): Date => fromZonedTime(`${isoDate}T00:00:00`, TIME_ZONE);

const instantOf = (date: string, time: string): Date => fromZonedTime(`${date}T${time}:00`, TIME_ZONE);

// Sexta da semana (segunda a domingo) da data.
export const fridayOfWeek = (isoDate: string): string => {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7; // segunda = 1 … domingo = 7
  return addDays(isoDate, 5 - weekday);
};

export const fixedDateOf = (friday: string, fixedDay: FixedDay): string => addDays(friday, fixedDay - 5);

// "2026-11-08" → "08/11"
export const shortDate = (isoDate: string): string => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;

// "2026-10-23" → "Sex 23/10"; "2030-01-04" → "Sex 04/01"
export const slotDayLabel = (isoDate: string): string => `${serviceDayLabel(isoDate).split(" ")[0]} ${shortDate(isoDate)}`;

export interface CyclePlan {
  weekends: string[]; // sextas
  slots: { date: string; time: string }[]; // um horário fixo por fim de semana, em ordem
  endsAt: string; // domingo depois do último fim de semana
}

export interface PlanCycleInput {
  now: Date;
  fixedDay: FixedDay;
  fixedTime: string;
  // Quantos fins de semana gerar: 4 = ciclo novo; 1–3 = ciclo que já estava em andamento.
  weekends?: number;
  // Sexta do último fim de semana do ciclo anterior: o novo começa depois dela (renovação sem sobrepor).
  afterFriday?: string;
}

// Fins de semana do ciclo (D4a, D4b): o 1º é o primeiro cujo horário fixo ainda está por vir
// e, na renovação, depois do último fim de semana do ciclo anterior.
export const planCycle = ({ now, fixedDay, fixedTime, weekends = CYCLE_WEEKENDS, afterFriday }: PlanCycleInput): CyclePlan => {
  let friday = fridayOfWeek(dateOf(now));
  while (instantOf(fixedDateOf(friday, fixedDay), fixedTime).getTime() <= now.getTime()) {
    friday = addDays(friday, 7);
  }
  while (afterFriday && friday <= afterFriday) {
    friday = addDays(friday, 7);
  }

  const fridays = Array.from({ length: weekends }, (_, index) => addDays(friday, 7 * index));
  return {
    weekends: fridays,
    slots: fridays.map((date) => ({ date: fixedDateOf(date, fixedDay), time: fixedTime })),
    endsAt: addDays(fridays[fridays.length - 1], 2),
  };
};

export interface CycleDates {
  weekends: string[];
  endsAt: string;
}

export const cycleFromDb = (cycle: { weekends: Date[]; endsAt: Date }): CycleDates => ({
  weekends: cycle.weekends.map(dateOf).sort(),
  endsAt: dateOf(cycle.endsAt),
});

export interface CycleProgress {
  // Fim de semana atual ou o próximo, contando os que já tinham passado antes do cadastro
  // ("ciclo já em andamento"): 2 restantes → começa em "3 de 4".
  position: number;
  total: number;
  firstWeekend: string;
  endsAt: string;
  ended: boolean; // hoje > endsAt
  lastWeekend: boolean; // o atual (ou o próximo) é o último do ciclo
  needsRenewal: boolean; // aviso "Renovar" (D4d)
}

// Progresso "x de 4" (decisão do Prompt 18). Um fim de semana termina no domingo; falta e
// "Desmarcar esta semana" contam como usados (D2), então só as datas importam, não as reservas.
// Pausar encurta o endsAt (truncatedEndsAt): fins de semana depois dele não contam.
export const cycleProgress = (cycle: CycleDates, now: Date): CycleProgress => {
  const today = dateOf(now);
  const planned = [...cycle.weekends].sort();
  const before = Math.max(0, CYCLE_WEEKENDS - planned.length);
  const effective = planned.filter((friday) => addDays(friday, 2) <= cycle.endsAt);
  const finished = effective.filter((friday) => addDays(friday, 2) < today).length;
  const ended = today > cycle.endsAt;
  const lastWeekend = !ended && finished + 1 >= effective.length;

  return {
    position: before + (ended ? effective.length : Math.min(effective.length, finished + 1)),
    total: CYCLE_WEEKENDS,
    firstWeekend: effective[0] ?? planned[0],
    endsAt: cycle.endsAt,
    ended,
    lastWeekend,
    needsRenewal: ended || lastWeekend,
  };
};

// "2 de 4 — termina 08/11" ou "Ciclo terminou em 08/11"
export const cycleSituation = (progress: CycleProgress): string =>
  progress.ended
    ? `Ciclo terminou em ${shortDate(progress.endsAt)}`
    : `${progress.position} de ${progress.total} — termina ${shortDate(progress.endsAt)}`;

// endsAt depois de pausar ou excluir (D4f): o ciclo acaba no último fim de semana já começado
// (sexta ≤ hoje); sem nenhum, no domingo antes do 1º. Nunca estende.
export const truncatedEndsAt = (cycle: CycleDates, now: Date): string => {
  const today = dateOf(now);
  const planned = [...cycle.weekends].sort();
  const started = planned.filter((friday) => friday <= today);
  const endsAt = started.length > 0 ? addDays(started[started.length - 1], 2) : addDays(planned[0], -5);
  return endsAt < cycle.endsAt ? endsAt : cycle.endsAt;
};

// Sexta a partir da qual a renovação começa: a do fim de semana que termina no endsAt.
export const renewAfterFriday = (cycle: CycleDates): string => addDays(cycle.endsAt, -2);
