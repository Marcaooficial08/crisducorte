import { afterEach, describe, expect, it, vi } from "vitest";
import { BOOKING_RESUME_KEY, saveBookingResume, takeBookingResume } from "./booking-resume";

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

const blockedStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("SecurityError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

const resume = { serviceId: "service-1", date: "2026-10-23", time: "10:30" };

describe("booking-resume", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("salva e retoma a seleção uma vez só", () => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
    saveBookingResume(resume);
    expect(takeBookingResume()).toEqual(resume);
    expect(takeBookingResume()).toBeUndefined();
  });

  it("sem nada salvo devolve undefined", () => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
    expect(takeBookingResume()).toBeUndefined();
  });

  it("JSON inválido ou formato errado é descartado", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });

    storage.setItem(BOOKING_RESUME_KEY, "{quebrado");
    expect(takeBookingResume()).toBeUndefined();

    storage.setItem(BOOKING_RESUME_KEY, JSON.stringify({ ...resume, time: "10h30" }));
    expect(takeBookingResume()).toBeUndefined();
    expect(storage.getItem(BOOKING_RESUME_KEY)).toBeNull();
  });

  it("storage bloqueado não lança erro", () => {
    vi.stubGlobal("window", { sessionStorage: blockedStorage });
    expect(() => saveBookingResume(resume)).not.toThrow();
    expect(takeBookingResume()).toBeUndefined();
  });

  it("sem window (servidor) não lança erro", () => {
    expect(() => saveBookingResume(resume)).not.toThrow();
    expect(takeBookingResume()).toBeUndefined();
  });
});
