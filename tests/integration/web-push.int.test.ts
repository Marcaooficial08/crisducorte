import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Banco real (TEST_DATABASE_URL); e-mail e push mockados: nada sai. O segundo plano (waitUntil) vira uma
// lista de promessas que o teste espera com flush().
const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  sendEmail: vi.fn(),
  sendNotification: vi.fn(),
  pending: [] as Promise<unknown>[],
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ delete: vi.fn() }) }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/notifications/transport", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("web-push", () => ({ default: { sendNotification: mocks.sendNotification } }));
vi.mock("@/app/_lib/notifications/background", () => ({
  runInBackground: (task: () => Promise<unknown>) => {
    mocks.pending.push(task());
  },
}));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { adminCancelBooking } from "@/app/_actions/admin/admin-cancel-booking";
import { cancelBooking } from "@/app/_actions/cancel-booking";
import { deleteAccount } from "@/app/_actions/delete-account";
import { deletePushSubscription, savePushSubscription } from "@/app/_actions/push-subscription";
import { runNotificationsCron, sendPushReminders } from "@/app/_lib/notifications/notify";
import { MAX_ATTEMPTS } from "@/app/_lib/notifications/log";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

// Quinta 03/01/2030 20:00 em São Paulo (hora do Cron); reserva na sexta 04/01 às 10:30.
const THURSDAY_20H = new Date("2030-01-03T23:00:00.000Z");
const FRIDAY = "2030-01-04";
const FRIDAY_1030 = new Date("2030-01-04T13:30:00.000Z");

const ENDPOINT_A1 = "https://fcm.googleapis.com/fcm/send/cliente-a-celular";
const ENDPOINT_A2 = "https://web.push.apple.com/cliente-a-iphone";
const KEYS = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

const sessionOf = (user: { id: string; name: string; email: string }, isAdmin = false) => ({
  user: { ...user, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const as = <T>(user: Parameters<typeof sessionOf>[0], fn: () => Promise<T>, isAdmin = false) => {
  mocks.getServerSession.mockResolvedValueOnce(sessionOf(user, isAdmin));
  return fn();
};

const flush = async () => {
  while (mocks.pending.length > 0) {
    await Promise.all(mocks.pending.splice(0));
  }
};

const subscribe = (userId: string, endpoint = ENDPOINT_A1) =>
  db.pushSubscription.create({ data: { userId, endpoint, ...KEYS } });

const createBooking = (userId: string | null = clienteA.id, date = FRIDAY_1030) =>
  db.booking.create({ data: { barbershopId: barbershop.id, serviceId: service.id, date, userId } });

const pushedTo = () => mocks.sendNotification.mock.calls.map(([subscription]) => subscription.endpoint as string);
const pushedTitles = () => mocks.sendNotification.mock.calls.map(([, body]) => JSON.parse(body).title as string);
const logOf = (key: string) => db.notificationLog.findUnique({ where: { key } });
const httpError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });

describe("Web Push (banco real, envio mockado)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.pending.length = 0;
    resetRateLimit();
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.sendNotification.mockResolvedValue({ statusCode: 201 });
    vi.stubEnv("NOTIFICACOES", "all");
    vi.stubEnv("WEB_PUSH", "all");
    vi.stubEnv("VAPID_PUBLIC_KEY", "publica");
    vi.stubEnv("VAPID_PRIVATE_KEY", "privada");
    vi.stubEnv("VAPID_SUBJECT", "mailto:barbearia@example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "segredo-int");
    vi.stubEnv("NOTIFY_ALLOWLIST", "");
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterEach(async () => {
    await flush();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe("lembrete da véspera", () => {
    it("e-mail e push saem 1x cada, com keys separadas; Cron repetido não reenvia", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);

      const first = await runNotificationsCron(THURSDAY_20H);
      expect(first.reminders).toMatchObject({ sent: 1 });
      expect(first.pushReminders).toEqual({ sent: 1, failed: 0, skipped: 0 });
      await runNotificationsCron(THURSDAY_20H);

      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
      expect(pushedTo()).toEqual([ENDPOINT_A1]);
      expect(pushedTitles()).toEqual(["Amanhã às 10:30 com o Cris"]);
      expect(await logOf(`reminder:${booking.id}`)).toMatchObject({ kind: "REMINDER", status: "SENT" });
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ kind: "PUSH_REMINDER", status: "SENT" });
      expect((await db.pushSubscription.findUnique({ where: { endpoint: ENDPOINT_A1 } }))?.lastSuccessAt).not.toBeNull();
    });

    it("dois Crons ao mesmo tempo: 1 push só", async () => {
      await createBooking();
      await subscribe(clienteA.id);
      await Promise.all([sendPushReminders(FRIDAY, THURSDAY_20H), sendPushReminders(FRIDAY, THURSDAY_20H)]);
      expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    });

    it("push não depende do emailReminders: lembrete por e-mail desligado, push sai", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);
      await db.user.update({ where: { id: clienteA.id }, data: { emailReminders: false } });

      await runNotificationsCron(THURSDAY_20H);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(await logOf(`reminder:${booking.id}`)).toMatchObject({ status: "SKIPPED" });
      expect(pushedTo()).toEqual([ENDPOINT_A1]);
    });

    it("todos os aparelhos da conta recebem; sem inscrição não há push nem registro", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id, ENDPOINT_A1);
      await subscribe(clienteA.id, ENDPOINT_A2);
      const other = await createBooking(clienteB.id, new Date("2030-01-04T14:30:00.000Z"));

      const summary = await sendPushReminders(FRIDAY, THURSDAY_20H);
      expect(summary).toEqual({ sent: 1, failed: 0, skipped: 1 });
      expect(pushedTo().sort()).toEqual([ENDPOINT_A1, ENDPOINT_A2].sort());
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ status: "SENT" });
      expect(await logOf(`push-reminder:${other.id}`)).toBeNull();
    });

    it("410/404: apaga só a inscrição vencida; com outro aparelho válido, conta como enviado", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id, ENDPOINT_A1);
      await subscribe(clienteA.id, ENDPOINT_A2);
      mocks.sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
        if (subscription.endpoint === ENDPOINT_A1) {
          throw httpError(410);
        }
        return { statusCode: 201 };
      });

      await sendPushReminders(FRIDAY, THURSDAY_20H);
      expect(await db.pushSubscription.findMany({ select: { endpoint: true } })).toEqual([{ endpoint: ENDPOINT_A2 }]);
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ status: "SENT" });
    });

    it("única inscrição vencida (404): removida, sem nova tentativa", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);
      mocks.sendNotification.mockRejectedValue(httpError(404));

      expect(await sendPushReminders(FRIDAY, THURSDAY_20H)).toEqual({ sent: 0, failed: 0, skipped: 1 });
      expect(await db.pushSubscription.count()).toBe(0);
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ status: "FAILED", attempts: MAX_ATTEMPTS });
      expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    });

    it("falha passageira: 2ª tentativa na mesma rodada; e-mail sai mesmo com o push fora", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);
      mocks.sendNotification.mockRejectedValueOnce(httpError(500));

      const summary = await runNotificationsCron(THURSDAY_20H);
      expect(summary.pushReminders).toEqual({ sent: 1, failed: 0, skipped: 0 });
      expect(mocks.sendNotification).toHaveBeenCalledTimes(2);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ status: "SENT", attempts: 2 });

      mocks.sendNotification.mockReset();
      mocks.sendNotification.mockRejectedValue(httpError(503));
      const next = await createBooking(clienteB.id, new Date("2030-01-04T15:30:00.000Z"));
      await subscribe(clienteB.id, ENDPOINT_A2);
      const failed = await sendPushReminders(FRIDAY, THURSDAY_20H);
      expect(failed).toMatchObject({ failed: 1 });
      expect(await logOf(`push-reminder:${next.id}`)).toMatchObject({ status: "FAILED" });
      // A inscrição continua (erro passageiro não apaga).
      expect(await db.pushSubscription.count({ where: { userId: clienteB.id } })).toBe(1);
    });

    it("WEB_PUSH=admin: só a conta admin recebe; sem VAPID nada sai", async () => {
      vi.stubEnv("WEB_PUSH", "admin");
      await createBooking();
      await subscribe(clienteA.id);
      expect(await sendPushReminders(FRIDAY, THURSDAY_20H)).toMatchObject({ sent: 0 });

      await db.booking.deleteMany();
      await createBooking(admin.id);
      await subscribe(admin.id, ENDPOINT_A2);
      expect(await sendPushReminders(FRIDAY, THURSDAY_20H)).toMatchObject({ sent: 1 });
      expect(pushedTo()).toEqual([ENDPOINT_A2]);

      vi.stubEnv("VAPID_PRIVATE_KEY", "");
      await db.notificationLog.deleteMany();
      expect(await sendPushReminders(FRIDAY, THURSDAY_20H)).toEqual({ sent: 0, failed: 0, skipped: 0 });
      expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    });

    it("NOTIFY_ALLOWLIST (staging): conta fora da lista não recebe push", async () => {
      vi.stubEnv("NOTIFY_ALLOWLIST", admin.email);
      const booking = await createBooking();
      await subscribe(clienteA.id);
      await sendPushReminders(FRIDAY, THURSDAY_20H);
      expect(mocks.sendNotification).not.toHaveBeenCalled();
      expect(await logOf(`push-reminder:${booking.id}`)).toMatchObject({ status: "SKIPPED" });
    });
  });

  describe("o Cris cancelou", () => {
    it("painel do admin: e-mail e push ao cliente, 1x cada", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);

      await as(admin, () => adminCancelBooking(booking.id), true);
      await flush();

      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
      expect(pushedTitles()).toEqual(["Sua reserva foi cancelada"]);
      expect(await logOf(`push-cancelled-by-admin:${booking.id}`)).toMatchObject({ status: "SENT" });
    });

    it("cliente cancelou a própria reserva: nenhum push (o aviso vai só por e-mail ao Cris)", async () => {
      const booking = await createBooking();
      await subscribe(clienteA.id);
      await subscribe(admin.id, ENDPOINT_A2);

      await as(clienteA, () => cancelBooking(booking.id));
      await flush();
      expect(mocks.sendNotification).not.toHaveBeenCalled();
    });

    it("WEB_PUSH off: só o e-mail; NOTIFICACOES off: só o push", async () => {
      vi.stubEnv("WEB_PUSH", "off");
      const first = await createBooking();
      await subscribe(clienteA.id);
      await as(admin, () => adminCancelBooking(first.id), true);
      await flush();
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
      expect(mocks.sendNotification).not.toHaveBeenCalled();

      vi.stubEnv("WEB_PUSH", "all");
      vi.stubEnv("NOTIFICACOES", "off");
      const second = await createBooking();
      await as(admin, () => adminCancelBooking(second.id), true);
      await flush();
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
      expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe("inscrições", () => {
    it("ligar grava e manda o teste; o mesmo aparelho em outra conta passa para ela; desligar só apaga a própria", async () => {
      expect(await as(clienteA, () => savePushSubscription({ endpoint: ENDPOINT_A1, keys: KEYS }, true))).toEqual({ success: true });
      await flush();
      expect(pushedTitles()).toEqual(["Notificações ligadas"]);
      expect(await db.pushSubscription.findMany({ select: { userId: true } })).toEqual([{ userId: clienteA.id }]);

      await as(clienteB, () => savePushSubscription({ endpoint: ENDPOINT_A1, keys: KEYS }));
      expect(await db.pushSubscription.findMany({ select: { userId: true } })).toEqual([{ userId: clienteB.id }]);

      await as(clienteA, () => deletePushSubscription(ENDPOINT_A1));
      expect(await db.pushSubscription.count()).toBe(1);
      await as(clienteB, () => deletePushSubscription(ENDPOINT_A1));
      expect(await db.pushSubscription.count()).toBe(0);
    });

    it("excluir a conta apaga as inscrições dela (LGPD)", async () => {
      await subscribe(clienteA.id, ENDPOINT_A1);
      await subscribe(clienteB.id, ENDPOINT_A2);
      expect(await as(clienteA, () => deleteAccount())).toMatchObject({ success: true });
      expect(await db.pushSubscription.findMany({ select: { userId: true } })).toEqual([{ userId: clienteB.id }]);
    });
  });
});
