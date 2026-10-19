import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, whatsappUrl } from "./phone";
import { slotLockKey } from "./slot-lock";

describe("telefone da reserva manual", () => {
  it("guarda só DDD + número, com ou sem máscara e +55", () => {
    expect(normalizePhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizePhone("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizePhone("11 3456-7890")).toBe("1134567890");
  });

  it("recusa número curto ou longo demais", () => {
    expect(normalizePhone("91234-5678")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("119123456789999")).toBeNull();
  });

  it("formata para exibir e monta o link do WhatsApp com 55", () => {
    expect(formatPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
    expect(whatsappUrl("11912345678")).toBe("https://wa.me/5511912345678");
  });
});

describe("slotLockKey", () => {
  it("barbearia + instante em UTC: igual para o mesmo horário, diferente para outro", () => {
    const instant = new Date("2026-10-16T12:00:00.000Z");
    expect(slotLockKey("shop-1", instant)).toBe("slot:shop-1:2026-10-16T12:00:00.000Z");
    expect(slotLockKey("shop-1", new Date("2026-10-16T09:00:00-03:00"))).toBe(slotLockKey("shop-1", instant));
    expect(slotLockKey("shop-2", instant)).not.toBe(slotLockKey("shop-1", instant));
  });
});
