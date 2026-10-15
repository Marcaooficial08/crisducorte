import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: { booking: { findUnique: mocks.findUnique, delete: mocks.delete } },
}));

import { cancelBooking } from "./cancel-booking";
import { resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "cliente-a" });
    mocks.delete.mockResolvedValue({});
  });

  it("recusa sem sessão", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(cancelBooking("booking-1")).rejects.toThrow("Não autenticado.");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("cancela a própria reserva", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "booking-1" } });
  });

  it("recusa cancelar a reserva de outro cliente", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-b"));

    await expect(cancelBooking("booking-1")).rejects.toThrow("Sem permissão para cancelar esta reserva.");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("admin cancela a reserva de qualquer cliente", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalled();
  });
});
