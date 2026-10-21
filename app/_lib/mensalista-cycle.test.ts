import { describe, expect, it } from "vitest";
import {
  cycleFromDb,
  cycleProgress,
  cycleSituation,
  dateToDb,
  fridayOfWeek,
  planCycle,
  renewAfterFriday,
  slotDayLabel,
  truncatedEndsAt,
} from "./mensalista-cycle";

// Semana de seg 19/10/2026 a dom 25/10/2026, horário de São Paulo (UTC-3).
const at = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

describe("fridayOfWeek", () => {
  it.each([
    ["2026-10-19", "2026-10-23"], // segunda
    ["2026-10-23", "2026-10-23"], // sexta
    ["2026-10-24", "2026-10-23"], // sábado
    ["2026-10-25", "2026-10-23"], // domingo: a semana ainda é a mesma
  ])("%s → %s", (date, friday) => {
    expect(fridayOfWeek(date)).toBe(friday);
  });
});

describe("planCycle", () => {
  it("pagou na segunda: os 4 fins de semana a partir desta sexta", () => {
    expect(planCycle({ now: at("2026-10-19T10:00:00"), fixedDay: 5, fixedTime: "10:30" })).toEqual({
      weekends: ["2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13"],
      slots: [
        { date: "2026-10-23", time: "10:30" },
        { date: "2026-10-30", time: "10:30" },
        { date: "2026-11-06", time: "10:30" },
        { date: "2026-11-13", time: "10:30" },
      ],
      endsAt: "2026-11-15",
    });
  });

  it("dia fixo sábado: horários no sábado, referência na sexta", () => {
    const plan = planCycle({ now: at("2026-10-19T10:00:00"), fixedDay: 6, fixedTime: "09:00" });
    expect(plan.weekends[0]).toBe("2026-10-23");
    expect(plan.slots.map((slot) => slot.date)).toEqual(["2026-10-24", "2026-10-31", "2026-11-07", "2026-11-14"]);
  });

  it("pagou na sexta antes do horário fixo: este fim de semana é o 1º", () => {
    const plan = planCycle({ now: at("2026-10-23T09:00:00"), fixedDay: 5, fixedTime: "10:30" });
    expect(plan.slots[0]).toEqual({ date: "2026-10-23", time: "10:30" });
  });

  it("pagou na sexta depois do horário fixo: começa na sexta seguinte (D4a)", () => {
    const plan = planCycle({ now: at("2026-10-23T10:30:00"), fixedDay: 5, fixedTime: "10:30" });
    expect(plan.slots[0]).toEqual({ date: "2026-10-30", time: "10:30" });
  });

  it("pagou no sábado com dia fixo sexta: começa na sexta seguinte", () => {
    const plan = planCycle({ now: at("2026-10-24T08:00:00"), fixedDay: 5, fixedTime: "19:30" });
    expect(plan.weekends[0]).toBe("2026-10-30");
  });

  it("pagou no sábado antes do horário fixo de sábado: o próprio sábado conta", () => {
    const plan = planCycle({ now: at("2026-10-24T08:00:00"), fixedDay: 6, fixedTime: "19:30" });
    expect(plan.slots[0]).toEqual({ date: "2026-10-24", time: "19:30" });
  });

  it("pagou no domingo: começa no fim de semana seguinte", () => {
    const plan = planCycle({ now: at("2026-10-25T12:00:00"), fixedDay: 6, fixedTime: "09:00" });
    expect(plan.weekends[0]).toBe("2026-10-30");
  });

  it("ciclo já em andamento com 2 restantes: gera só 2, endsAt no domingo do 2º", () => {
    expect(planCycle({ now: at("2026-10-19T10:00:00"), fixedDay: 5, fixedTime: "10:30", weekends: 2 })).toMatchObject({
      weekends: ["2026-10-23", "2026-10-30"],
      endsAt: "2026-11-01",
    });
  });

  it("renovação: começa depois do último fim de semana do ciclo anterior (D4b)", () => {
    const plan = planCycle({ now: at("2026-10-26T10:00:00"), fixedDay: 5, fixedTime: "10:30", afterFriday: "2026-10-30" });
    expect(plan.weekends).toEqual(["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"]);
  });

  it("renovação atrasada: começa no próximo horário, não no passado", () => {
    const plan = planCycle({ now: at("2026-12-01T10:00:00"), fixedDay: 5, fixedTime: "10:30", afterFriday: "2026-10-30" });
    expect(plan.weekends[0]).toBe("2026-12-04");
  });
});

describe("cycleProgress", () => {
  const full = { weekends: ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"], endsAt: "2026-11-08" };

  it("exemplo do dono: \"2 de 4 — termina 08/11\" na segunda depois do 1º fim de semana", () => {
    const progress = cycleProgress(full, at("2026-10-19T10:00:00"));
    expect(progress).toMatchObject({ position: 2, total: 4, ended: false, lastWeekend: false, needsRenewal: false });
    expect(cycleSituation(progress)).toBe("2 de 4 — termina 08/11");
  });

  it("ciclo novo antes do 1º fim de semana: 1 de 4", () => {
    expect(cycleProgress(full, at("2026-10-12T10:00:00")).position).toBe(1);
  });

  it("durante o fim de semana a posição não muda; muda na segunda", () => {
    expect(cycleProgress(full, at("2026-10-18T20:00:00")).position).toBe(1);
    expect(cycleProgress(full, at("2026-10-19T00:00:00")).position).toBe(2);
  });

  it("último fim de semana: aviso de renovação", () => {
    expect(cycleProgress(full, at("2026-11-02T10:00:00"))).toMatchObject({ position: 4, lastWeekend: true, needsRenewal: true });
  });

  it("vencido depois do domingo final", () => {
    const progress = cycleProgress(full, at("2026-11-09T10:00:00"));
    expect(progress).toMatchObject({ position: 4, ended: true, needsRenewal: true });
    expect(cycleSituation(progress)).toBe("Ciclo terminou em 08/11");
  });

  it("ciclo em andamento com 2 restantes: começa em 3 de 4", () => {
    const partial = { weekends: ["2026-10-23", "2026-10-30"], endsAt: "2026-11-01" };
    expect(cycleProgress(partial, at("2026-10-19T10:00:00"))).toMatchObject({ position: 3, needsRenewal: false });
    expect(cycleSituation(cycleProgress(partial, at("2026-10-19T10:00:00")))).toBe("3 de 4 — termina 01/11");
    expect(cycleProgress(partial, at("2026-10-26T10:00:00"))).toMatchObject({ position: 4, needsRenewal: true });
  });

  it("1 restante: já entra no último fim de semana", () => {
    const one = { weekends: ["2026-10-23"], endsAt: "2026-10-25" };
    expect(cycleProgress(one, at("2026-10-19T10:00:00"))).toMatchObject({ position: 4, needsRenewal: true });
  });

  it("ciclo pausado (endsAt encurtado): vencido, sem contar os fins de semana cortados", () => {
    const paused = { ...full, endsAt: "2026-10-18" };
    expect(cycleProgress(paused, at("2026-10-20T10:00:00"))).toMatchObject({ position: 1, ended: true, needsRenewal: true });
  });
});

describe("truncatedEndsAt", () => {
  const full = { weekends: ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"], endsAt: "2026-11-08" };

  it("pausou na terça: acaba no domingo do último fim de semana começado", () => {
    expect(truncatedEndsAt(full, at("2026-10-20T10:00:00"))).toBe("2026-10-18");
  });

  it("pausou no sábado: o fim de semana atual conta", () => {
    expect(truncatedEndsAt(full, at("2026-10-24T10:00:00"))).toBe("2026-10-25");
  });

  it("pausou antes do 1º fim de semana: domingo antes dele", () => {
    expect(truncatedEndsAt(full, at("2026-10-13T10:00:00"))).toBe("2026-10-11");
  });

  it("pausou depois do fim: não estende", () => {
    expect(truncatedEndsAt(full, at("2026-12-01T10:00:00"))).toBe("2026-11-08");
  });
});

describe("conversões", () => {
  it("cycleFromDb volta às datas de São Paulo; renewAfterFriday é a sexta do endsAt", () => {
    const cycle = cycleFromDb({ weekends: [dateToDb("2026-10-30"), dateToDb("2026-10-23")], endsAt: dateToDb("2026-11-01") });
    expect(cycle).toEqual({ weekends: ["2026-10-23", "2026-10-30"], endsAt: "2026-11-01" });
    expect(renewAfterFriday(cycle)).toBe("2026-10-30");
  });

  it("slotDayLabel", () => {
    expect(slotDayLabel("2026-10-23")).toBe("Sex 23/10");
  });
});
