import { describe, expect, it } from "vitest";
import { generateDayTimeList } from "./hours";

describe("generateDayTimeList", () => {
  it("devolve exatamente os 11 horários de 09:00 a 19:30", () => {
    expect(generateDayTimeList(new Date(2026, 9, 16))).toEqual([
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
