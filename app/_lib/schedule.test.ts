import { describe, expect, it } from "vitest";
import { TIME_GRID, getNextServiceDays, isBookableSlot } from "./schedule";

// Semana de seg 12/10/2026 a dom 18/10/2026, horário de São Paulo (UTC-3).
const at = (isoLocal: string) => new Date(`${isoLocal}-03:00`);
const ALL = [...TIME_GRID];

describe("getNextServiceDays", () => {
  it.each([
    ["segunda", "2026-10-12T00:01:00"],
    ["terça", "2026-10-13T12:00:00"],
    ["quarta", "2026-10-14T12:00:00"],
    ["quinta", "2026-10-15T23:59:00"],
  ])("na %s mostra a sexta e o sábado desta semana, com todos os horários", (_dia, now) => {
    expect(getNextServiceDays(at(now))).toEqual([
      { date: "2026-10-16", times: ALL },
      { date: "2026-10-17", times: ALL },
    ]);
  });

  it("na sexta mostra a sexta só com horários futuros e o sábado inteiro", () => {
    expect(getNextServiceDays(at("2026-10-16T12:00:00"))).toEqual([
      { date: "2026-10-16", times: ["12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"] },
      { date: "2026-10-17", times: ALL },
    ]);
  });

  it("na sexta à tarde os horários que já passaram somem", () => {
    expect(getNextServiceDays(at("2026-10-16T15:10:00"))).toEqual([
      { date: "2026-10-16", times: ["15:30", "16:30", "17:30", "18:30", "19:30"] },
      { date: "2026-10-17", times: ALL },
    ]);
  });

  it("horário exatamente agora já conta como passado", () => {
    const [friday] = getNextServiceDays(at("2026-10-16T10:30:00"));
    expect(friday.times[0]).toBe("11:30");
  });

  it("na sexta antes das 09:00 mostra a sexta inteira", () => {
    expect(getNextServiceDays(at("2026-10-16T08:00:00"))[0]).toEqual({ date: "2026-10-16", times: ALL });
  });

  it("na sexta depois do último horário a sexta sai da lista", () => {
    expect(getNextServiceDays(at("2026-10-16T19:30:00"))).toEqual([{ date: "2026-10-17", times: ALL }]);
  });

  it("no sábado mostra só o sábado, com horários futuros", () => {
    expect(getNextServiceDays(at("2026-10-17T17:00:00"))).toEqual([
      { date: "2026-10-17", times: ["17:30", "18:30", "19:30"] },
    ]);
  });

  it("no sábado depois do último horário não mostra nenhum dia", () => {
    expect(getNextServiceDays(at("2026-10-17T20:00:00"))).toEqual([]);
  });

  it("no domingo não mostra nenhum dia", () => {
    expect(getNextServiceDays(at("2026-10-18T09:00:00"))).toEqual([]);
  });

  it("usa o fuso de São Paulo, não o UTC", () => {
    // Dom 18/10 às 22:00 em SP = seg 19/10 às 01:00 UTC: ainda é domingo no Brasil.
    expect(getNextServiceDays(at("2026-10-18T22:00:00"))).toEqual([]);
    // Qui 15/10 às 22:00 em SP = sex 16/10 às 01:00 UTC: ainda é quinta no Brasil.
    expect(getNextServiceDays(at("2026-10-15T22:00:00"))).toHaveLength(2);
  });

  it("vira o mês corretamente", () => {
    expect(getNextServiceDays(at("2026-10-26T12:00:00")).map((d) => d.date)).toEqual(["2026-10-30", "2026-10-31"]);
    expect(getNextServiceDays(at("2026-11-02T12:00:00")).map((d) => d.date)).toEqual(["2026-11-06", "2026-11-07"]);
  });
});

describe("TIME_GRID", () => {
  it("tem exatamente os 11 horários de 09:00 a 19:30", () => {
    expect(ALL).toEqual([
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
    ]);
  });
});

describe("isBookableSlot", () => {
  const wednesday = at("2026-10-14T12:00:00");

  it("aceita horário da grade na sexta e no sábado desta semana", () => {
    expect(isBookableSlot(at("2026-10-16T09:00:00"), wednesday)).toBe(true);
    expect(isBookableSlot(at("2026-10-17T19:30:00"), wednesday)).toBe(true);
  });

  it("recusa sábado da semana seguinte", () => {
    expect(isBookableSlot(at("2026-10-24T09:00:00"), wednesday)).toBe(false);
  });

  it("recusa dia que não é sexta nem sábado", () => {
    expect(isBookableSlot(at("2026-10-15T09:00:00"), wednesday)).toBe(false);
  });

  it("recusa horário fora da grade", () => {
    expect(isBookableSlot(at("2026-10-16T10:00:00"), wednesday)).toBe(false);
    expect(isBookableSlot(at("2026-10-16T09:00:30"), wednesday)).toBe(false);
  });

  it("recusa horário que já passou", () => {
    expect(isBookableSlot(at("2026-10-16T09:00:00"), at("2026-10-16T14:00:00"))).toBe(false);
    expect(isBookableSlot(at("2026-10-16T14:30:00"), at("2026-10-16T14:00:00"))).toBe(true);
  });

  it("recusa data inválida", () => {
    expect(isBookableSlot(new Date("lixo"), wednesday)).toBe(false);
  });
});
