import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  sendPush: vi.fn(),
  pending: [] as Promise<unknown>[],
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({ db: { pushSubscription: { upsert: mocks.upsert, deleteMany: mocks.deleteMany } } }));
vi.mock("@/app/_lib/notifications/background", () => ({
  runInBackground: (task: () => Promise<unknown>) => {
    mocks.pending.push(task());
  },
}));
vi.mock("@/app/_lib/notifications/push", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_lib/notifications/push")>()),
  sendPush: mocks.sendPush,
}));

import { deletePushSubscription, savePushSubscription } from "./push-subscription";
import { resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/aparelho-1",
  keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
};

describe("inscrição do Web Push (Server Actions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending.length = 0;
    resetRateLimit();
    vi.stubEnv("WEB_PUSH", "all");
    vi.stubEnv("VAPID_PUBLIC_KEY", "publica");
    vi.stubEnv("VAPID_PRIVATE_KEY", "privada");
    vi.stubEnv("VAPID_SUBJECT", "mailto:barbearia@example.com");
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));
    mocks.upsert.mockImplementation(async ({ create }) => ({ id: "sub-1", ...create }));
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.sendPush.mockResolvedValue({ status: "SENT" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem sessão: recusa sem tocar no banco", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    await expect(savePushSubscription(VALID)).rejects.toThrow("Não autenticado.");
    await expect(deletePushSubscription(VALID.endpoint)).rejects.toThrow("Não autenticado.");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("flag off, flag só de admin para cliente comum ou sem VAPID: indisponível", async () => {
    vi.stubEnv("WEB_PUSH", "off");
    expect((await savePushSubscription(VALID)).success).toBe(false);
    vi.stubEnv("WEB_PUSH", "admin");
    expect((await savePushSubscription(VALID)).success).toBe(false);
    vi.stubEnv("WEB_PUSH", "all");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect((await savePushSubscription(VALID)).success).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("endpoint fora dos serviços de push ou chaves inválidas: recusado", async () => {
    for (const input of [
      { ...VALID, endpoint: "https://169.254.169.254/latest/meta-data" },
      { ...VALID, endpoint: "http://fcm.googleapis.com/fcm/send/x" },
      { ...VALID, keys: { ...VALID.keys, p256dh: "curta" } },
      { ...VALID, keys: { ...VALID.keys, auth: "com espaço e acentuação!" } },
    ]) {
      expect(await savePushSubscription(input)).toEqual({ success: false, error: "Dados inválidos." });
    }
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("grava na conta da sessão (o mesmo aparelho em outra conta passa para a atual)", async () => {
    expect(await savePushSubscription(VALID)).toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { endpoint: VALID.endpoint },
      create: { endpoint: VALID.endpoint, p256dh: VALID.keys.p256dh, auth: VALID.keys.auth, userId: "cliente-a" },
      update: { p256dh: VALID.keys.p256dh, auth: VALID.keys.auth, userId: "cliente-a" },
    });
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("ao ligar, manda o push de teste só para este aparelho; inscrição vencida é apagada", async () => {
    mocks.sendPush.mockResolvedValueOnce({ status: "GONE" });
    await savePushSubscription(VALID, true);
    await Promise.all(mocks.pending);
    expect(mocks.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: VALID.endpoint }),
      expect.objectContaining({ title: "Notificações ligadas" }),
    );
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "sub-1" } });
  });

  it("desligar apaga só a inscrição da própria conta", async () => {
    expect(await deletePushSubscription(VALID.endpoint)).toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { endpoint: VALID.endpoint, userId: "cliente-a" } });
  });

  it("muitos cliques seguidos: limite de tentativas", async () => {
    for (let index = 0; index < 10; index += 1) {
      await savePushSubscription(VALID);
    }
    expect((await savePushSubscription(VALID)).success).toBe(false);
  });
});
