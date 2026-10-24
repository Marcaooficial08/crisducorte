import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
  createCancellation: vi.fn(),
  transaction: vi.fn(),
  notifyBookingCancelled: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
// Só o envio é mockado; loadBookingSnapshot continua lendo pelo db mockado abaixo.
vi.mock("@/app/_lib/notifications/notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_lib/notifications/notify")>()),
  notifyBookingCancelled: mocks.notifyBookingCancelled,
}));
vi.mock("@/app/_lib/prisma", () => ({
  db: {
    booking: { findUnique: mocks.findUnique, delete: mocks.delete },
    bookingCancellation: { create: mocks.createCancellation },
    $transaction: mocks.transaction,
  },
}));

import { CANCEL_ERRORS, cancelBooking } from "./cancel-booking";
import { resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

// Reserva futura: o cliente só cancela o que ainda não passou.
const slotDate = new Date("2099-10-16T12:00:00.000Z");
const pastDate = new Date("2020-10-16T12:00:00.000Z");

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "cliente-a", date: slotDate, source: "CLIENT" });
    mocks.delete.mockResolvedValue({});
    mocks.createCancellation.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([]);
    mocks.notifyBookingCancelled.mockResolvedValue([]);
  });

  it("recusa sem sessão", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: false, error: CANCEL_ERRORS.UNAUTHENTICATED });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("cancela a própria reserva e registra o cancelamento na mesma transação", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "booking-1" } });
    expect(mocks.createCancellation).toHaveBeenCalledWith({
      data: { bookingId: "booking-1", date: slotDate, byAdmin: false, source: "CLIENT" },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("recusa cancelar a reserva de outro cliente", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-b"));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: false, error: CANCEL_ERRORS.FORBIDDEN });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("admin cancela a reserva de qualquer cliente (byAdmin)", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.createCancellation).toHaveBeenCalledWith({ data: expect.objectContaining({ byAdmin: true }) });
  });

  it("admin cancelando a própria reserva não conta como byAdmin", async () => {
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "admin", date: slotDate, source: "CLIENT" });
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.createCancellation).toHaveBeenCalledWith({ data: expect.objectContaining({ byAdmin: false }) });
  });

  it("cliente cancela: aviso ao Cris (byAdmin false) com a reserva lida antes do delete", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await cancelBooking("booking-1");
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "booking-1" }, include: expect.any(Object) }));
    expect(mocks.notifyBookingCancelled).toHaveBeenCalledWith(expect.objectContaining({ id: "booking-1" }), false);
  });

  it("admin cancela a de outro cliente: aviso ao cliente (byAdmin true)", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await cancelBooking("booking-1");
    expect(mocks.notifyBookingCancelled).toHaveBeenCalledWith(expect.objectContaining({ id: "booking-1" }), true);
  });

  it("falha no e-mail não impede o cancelamento", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));
    mocks.notifyBookingCancelled.mockRejectedValue(new Error("SMTP fora do ar"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith("Erro ao enviar notificação:", expect.any(Error)));
    consoleError.mockRestore();
  });

  it("cancelamento recusado não envia aviso", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-b"));

    await expect(cancelBooking("booking-1")).resolves.toMatchObject({ success: false });
    expect(mocks.notifyBookingCancelled).not.toHaveBeenCalled();
  });

  it("cliente não cancela reserva que já passou (histórico e métricas)", async () => {
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "cliente-a", date: pastDate, source: "CLIENT" });
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: false, error: CANCEL_ERRORS.PAST });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notifyBookingCancelled).not.toHaveBeenCalled();
  });

  it("admin ainda pode apagar uma reserva passada", async () => {
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "cliente-a", date: pastDate, source: "CLIENT" });
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
  });

  it("reserva inexistente devolve erro em vez de lançar", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking("nao-existe")).resolves.toEqual({ success: false, error: CANCEL_ERRORS.NOT_FOUND });
  });

  it.each([[""], ["x".repeat(65)], [123 as unknown as string]])("id inválido (%s) não chega ao banco", async (id) => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking(id)).resolves.toEqual({ success: false, error: CANCEL_ERRORS.INVALID });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
