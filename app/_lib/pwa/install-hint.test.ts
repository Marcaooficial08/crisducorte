import { describe, expect, it } from "vitest";
import { VISITS_KEY, countVisit, installPlatform, isStandalone, shouldOfferInstall } from "./install-hint";

// Storage em memória (o mesmo contrato do localStorage/sessionStorage).
const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
};

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const INSTAGRAM_IPHONE = `${IPHONE} Instagram 350.0.0.0`;

describe("dica de instalação", () => {
  it("iPhone e iPad (inclusive o iPadOS que se apresenta como Mac) mostram a instrução do Safari", () => {
    expect(installPlatform(IPHONE, 5)).toBe("ios");
    expect(installPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
  });

  it("Mac de verdade, Android e navegador do Instagram não mostram a instrução do iPhone", () => {
    expect(installPlatform(IPAD_DESKTOP_MODE, 0)).toBe("other");
    expect(installPlatform(ANDROID, 5)).toBe("other");
    expect(installPlatform(INSTAGRAM_IPHONE, 5)).toBe("other");
  });

  it("já instalado: display-mode standalone ou navigator.standalone do iPhone", () => {
    expect(isStandalone(true, undefined)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, false)).toBe(false);
    expect(isStandalone(false, undefined)).toBe(false);
  });

  it("oferece a dica a partir da 2ª visita ou depois de reservar; nunca na 1ª visita sem reserva", () => {
    expect(shouldOfferInstall(1, false)).toBe(false);
    expect(shouldOfferInstall(1, true)).toBe(true);
    expect(shouldOfferInstall(2, false)).toBe(true);
  });

  it("conta 1 visita por sessão do navegador", () => {
    const local = memoryStorage();
    const firstTab = memoryStorage();
    expect(countVisit(local, firstTab)).toBe(1);
    // Recarregar ou navegar na mesma sessão não conta de novo.
    expect(countVisit(local, firstTab)).toBe(1);
    // Nova sessão (outro dia, outra aba): 2ª visita.
    expect(countVisit(local, memoryStorage())).toBe(2);
    expect(local.getItem(VISITS_KEY)).toBe("2");
  });

  it("sem armazenamento ou com armazenamento que lança: 1 visita, sem erro", () => {
    expect(countVisit(null, null)).toBe(1);
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error("bloqueado");
    };
    expect(countVisit(broken, memoryStorage())).toBe(1);
  });
});
