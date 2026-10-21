import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  transaction: vi.fn(),
  findBarbershop: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: { $transaction: mocks.transaction, barbershop: { findFirst: mocks.findBarbershop } },
}));

import { saveMensalista } from "./save-mensalista";
import { registerMensalistaPayment } from "./register-mensalista-payment";
import { excludeMensalista, pauseMensalista, reactivateMensalista } from "./mensalista-status";
import { ADMIN_ERROR_MESSAGES, AdminErrorCode } from "@/app/_lib/admin-actions";

const sessionOf = (isAdmin: boolean) => ({
  user: { id: isAdmin ? "admin-1" : "user-1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const failed = (code: AdminErrorCode) => ({ success: false, code, error: ADMIN_ERROR_MESSAGES[code] });

const validInput = { name: "Pedro", phone: "(11) 98888-7777", fixedDay: 5 as const, fixedTime: "10:30" };

describe("Server Actions dos mensalistas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
  });

  describe("isAdmin conferido no servidor", () => {
    const calls = {
      saveMensalista: () => saveMensalista(validInput),
      registerMensalistaPayment: () => registerMensalistaPayment({ mensalistaId: "m1", serviceId: "s1" }),
      pauseMensalista: () => pauseMensalista("m1"),
      excludeMensalista: () => excludeMensalista("m1"),
      reactivateMensalista: () => reactivateMensalista("m1"),
    };

    for (const [name, call] of Object.entries(calls)) {
      it(`${name}: sem sessão e conta comum são recusadas sem tocar no banco`, async () => {
        mocks.getServerSession.mockResolvedValueOnce(null);
        expect(await call()).toEqual(failed("UNAUTHORIZED"));
        mocks.getServerSession.mockResolvedValueOnce(sessionOf(false));
        expect(await call()).toEqual(failed("UNAUTHORIZED"));
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.findBarbershop).not.toHaveBeenCalled();
      });
    }
  });

  describe("validação antes do banco", () => {
    it.each([
      ["nome vazio", { ...validInput, name: "   " }, "INVALID_NAME"],
      ["telefone curto", { ...validInput, phone: "1234" }, "INVALID_PHONE"],
      ["e-mail inválido", { ...validInput, email: "pedro@" }, "INVALID_EMAIL"],
      ["horário fora da grade", { ...validInput, fixedTime: "10:00" }, "INVALID"],
      ["domingo como dia fixo", { ...validInput, fixedDay: 0 as unknown as 5 }, "INVALID"],
    ] as const)("saveMensalista: %s", async (_caso, input, code) => {
      expect(await saveMensalista(input)).toEqual(failed(code));
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it.each([0, 5, 2.5])("registerMensalistaPayment: %s fins de semana restantes é recusado", async (remainingWeekends) => {
      expect(await registerMensalistaPayment({ mensalistaId: "m1", serviceId: "s1", remainingWeekends })).toEqual(failed("INVALID"));
      expect(mocks.findBarbershop).not.toHaveBeenCalled();
    });

    it("P2028 (fila na conexão) vira a mensagem de muita gente reservando", async () => {
      const { Prisma } = await import("@prisma/client");
      mocks.transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("timeout", { code: "P2028", clientVersion: "test" }),
      );
      expect(await pauseMensalista("m1")).toEqual(failed("BUSY"));
    });
  });
});
