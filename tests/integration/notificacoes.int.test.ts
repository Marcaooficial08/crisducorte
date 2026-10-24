import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Banco real (TEST_DATABASE_URL); envio mockado: nenhum e-mail sai. O segundo plano (waitUntil) vira uma
// lista de promessas que o teste espera com flush().
const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  sendEmail: vi.fn(),
  pending: [] as Promise<unknown>[],
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/notifications/transport", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/app/_lib/notifications/background", () => ({
  runInBackground: (task: () => Promise<unknown>) => {
    mocks.pending.push(task());
  },
}));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { saveBooking } from "@/app/barbershop/[id]/_actions/save-booking";
import { cancelBooking } from "@/app/_actions/cancel-booking";
import { adminCancelBooking } from "@/app/_actions/admin/admin-cancel-booking";
import { DEFERRED_REASON, MAX_ATTEMPTS, STUCK_AFTER_MS } from "@/app/_lib/notifications/log";
import {
  SEND_BUDGET_MS,
  notifyBookingCreated,
  retryFailedConfirmations,
  runNotificationsCron,
  sendReminders,
} from "@/app/_lib/notifications/notify";
import { disableRemindersByToken } from "@/app/_lib/notifications/reminders-preference";
import { unsubscribeToken } from "@/app/_lib/notifications/unsubscribe-token";
import { dateToDb } from "@/app/_lib/mensalista-cycle";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

// Quinta 03/01/2030 20:00 em São Paulo (hora do Cron); reservas na sexta 04/01.
const THURSDAY_20H = new Date("2030-01-03T23:00:00.000Z");
const FRIDAY = "2030-01-04";
const FRIDAY_1030 = new Date("2030-01-04T13:30:00.000Z");
const FRIDAY_1130 = new Date("2030-01-04T14:30:00.000Z");

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

const book = (user: Parameters<typeof sessionOf>[0], date = FRIDAY_1030, isAdmin = false) =>
  as(user, () => saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date: date.toISOString() }), isAdmin);

const sentTo = () => mocks.sendEmail.mock.calls.map(([message]) => message.to as string);
const subjects = () => mocks.sendEmail.mock.calls.map(([message]) => message.subject as string);
const logs = () => db.notificationLog.findMany({ orderBy: { key: "asc" } });

// Erros no formato do nodemailer (Prompt 22): comando SMTP em que falhou + código.
const smtpError = (message: string, command: string, code: string) => Object.assign(new Error(message), { command, code });
const beforeMessage = (message = "timeout") => smtpError(message, "CONN", "ETIMEDOUT");

const createBookingRow = (data: { userId?: string | null; date?: Date; source?: "CLIENT" | "MANUAL" | "MENSALISTA"; mensalistaId?: string; customerName?: string }) =>
  db.booking.create({ data: { barbershopId: barbershop.id, serviceId: service.id, date: FRIDAY_1030, userId: clienteA.id, ...data } });

describe("notificações (banco real, envio mockado)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.pending.length = 0;
    resetRateLimit();
    mocks.sendEmail.mockResolvedValue(undefined);
    vi.stubEnv("NOTIFICACOES", "all");
    vi.stubEnv("NEXTAUTH_SECRET", "segredo-int");
    vi.stubEnv("NOTIFY_ALLOWLIST", "");
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe("reserva", () => {
    it("flag off: reserva grava e nada é enviado nem registrado", async () => {
      vi.stubEnv("NOTIFICACOES", "off");
      await expect(book(clienteA)).resolves.toEqual({ success: true });
      await flush();

      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(await db.notificationLog.count()).toBe(0);
    });

    it("confirmação para o cliente e 'Nova reserva' para o admin, 1 linha SENT cada", async () => {
      await expect(book(clienteA)).resolves.toEqual({ success: true });
      await flush();

      expect(sentTo().sort()).toEqual([admin.email, clienteA.email].sort());
      expect(subjects()).toContain("Sua reserva com o Cris — sex 04/01 às 10:30");
      expect(subjects()).toContain("Nova reserva: Cliente A — sex 04/01 às 10:30");
      // Reply-To: cliente responde para o Cris; aviso ao Cris sem Reply-To. List-Unsubscribe só no lembrete.
      const byTo = Object.fromEntries(mocks.sendEmail.mock.calls.map(([message]) => [message.to, message]));
      expect(byTo[clienteA.email].replyTo).toEqual([admin.email]);
      expect(byTo[admin.email].replyTo).toBeUndefined();
      expect(byTo[clienteA.email].headers).toBeUndefined();
      expect(byTo[admin.email].headers).toBeUndefined();
      const rows = await logs();
      expect(rows.map((row) => [row.kind, row.status])).toEqual([
        ["ADMIN_NEW_BOOKING", "SENT"],
        ["CONFIRMATION", "SENT"],
      ]);
      // Sem e-mail nem texto no registro (LGPD).
      expect(JSON.stringify(rows)).not.toContain("@teste.local");
    });

    it("mesmo evento de novo (retry, duplo clique) não envia de novo", async () => {
      await book(clienteA);
      await flush();
      const booking = await db.booking.findFirstOrThrow();

      await Promise.all([notifyBookingCreated(booking.id), notifyBookingCreated(booking.id)]);

      expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    });

    it("flag admin: cliente comum não recebe; reserva do admin gera os e-mails", async () => {
      vi.stubEnv("NOTIFICACOES", "admin");
      await book(clienteA);
      await flush();
      expect(mocks.sendEmail).not.toHaveBeenCalled();

      await book(admin, FRIDAY_1130, true);
      await flush();
      expect(sentTo()).toEqual([admin.email, admin.email]);
    });

    it("SMTP fora do ar: a reserva fica gravada, linhas FAILED e o Cron tenta de novo até o limite", async () => {
      mocks.sendEmail.mockRejectedValue(smtpError("421 <cliente-a@teste.local> tente mais tarde", "RCPT TO", "EENVELOPE"));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(book(clienteA)).resolves.toEqual({ success: true });
      await flush();
      expect(await db.booking.count()).toBe(1);
      const failed = await logs();
      expect(failed.map((row) => [row.status, row.attempts])).toEqual([
        ["FAILED", 1],
        ["FAILED", 1],
      ]);
      expect(failed[0].lastError).toBe("421 <<e-mail>> tente mais tarde");

      // Tentativas 2 e 3 falham; depois disso o Cron para de tentar.
      await retryFailedConfirmations(THURSDAY_20H);
      await retryFailedConfirmations(THURSDAY_20H);
      await retryFailedConfirmations(THURSDAY_20H);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(2 * MAX_ATTEMPTS);
      expect((await logs()).every((row) => row.attempts === MAX_ATTEMPTS)).toBe(true);
      consoleError.mockRestore();
    });

    it("falha só na primeira vez: o Cron reenvia e marca SENT", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.sendEmail.mockRejectedValueOnce(beforeMessage());
      await book(clienteA);
      await flush();

      await retryFailedConfirmations(THURSDAY_20H);

      expect((await logs()).map((row) => row.status)).toEqual(["SENT", "SENT"]);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
      consoleError.mockRestore();
    });

    it("falha depois do DATA (talvez entregue): FAILED final, o Cron não reenvia", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.sendEmail.mockRejectedValueOnce(smtpError("timeout esperando 250", "DATA", "ETIMEDOUT"));
      await book(clienteA);
      await flush();

      const confirmation = (await logs()).find((row) => row.kind === "CONFIRMATION");
      expect([confirmation?.status, confirmation?.attempts]).toEqual(["FAILED", MAX_ATTEMPTS]);

      await retryFailedConfirmations(THURSDAY_20H);
      // 1ª confirmação (falhou) + "Nova reserva" na hora; o Cron não manda a confirmação de novo.
      expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
      consoleError.mockRestore();
    });

    it("sem tempo na função: não começa o envio, fica para o Cron e sai 1x", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const booking = await createBookingRow({});

      // Função começou há mais que o orçamento: nada é enviado agora.
      await notifyBookingCreated(booking.id, Date.now() - SEND_BUDGET_MS - 1);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      const deferred = await logs();
      expect(deferred.map((row) => [row.kind, row.status, row.attempts, row.lastError])).toEqual([
        ["ADMIN_NEW_BOOKING", "FAILED", 0, DEFERRED_REASON],
        ["CONFIRMATION", "FAILED", 0, DEFERRED_REASON],
      ]);

      await retryFailedConfirmations(THURSDAY_20H);
      await retryFailedConfirmations(THURSDAY_20H);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
      expect((await logs()).map((row) => row.status)).toEqual(["SENT", "SENT"]);
      consoleWarn.mockRestore();
    });

    it("NOTIFY_ALLOWLIST: só quem está na lista recebe; o resto fica SKIPPED", async () => {
      vi.stubEnv("NOTIFY_ALLOWLIST", ` ${admin.email.toUpperCase()} `);
      await book(clienteA);
      await flush();

      expect(sentTo()).toEqual([admin.email]);
      expect((await logs()).map((row) => [row.kind, row.status])).toEqual([
        ["ADMIN_NEW_BOOKING", "SENT"],
        ["CONFIRMATION", "SKIPPED"],
      ]);
    });

    it("envio interrompido (SENDING parado) vira FAILED final e não é reenviado", async () => {
      await book(clienteA);
      await flush();
      const booking = await db.booking.findFirstOrThrow();
      await db.notificationLog.update({ where: { key: `confirm:${booking.id}` }, data: { status: "SENDING" } });
      mocks.sendEmail.mockClear();

      const later = new Date(Date.now() + STUCK_AFTER_MS + 60_000);
      const summary = await runNotificationsCron(later, "2030-01-05");

      expect(summary.expired).toBe(1);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      const row = await db.notificationLog.findUniqueOrThrow({ where: { key: `confirm:${booking.id}` } });
      expect([row.status, row.attempts]).toEqual(["FAILED", MAX_ATTEMPTS]);
    });
  });

  describe("cancelamento", () => {
    it("cliente cancela: aviso ao Cris", async () => {
      const booking = await createBookingRow({});
      await as(clienteA, () => cancelBooking(booking.id));
      await flush();

      expect(sentTo()).toEqual([admin.email]);
      expect(subjects()).toEqual(["Cancelamento: Cliente A — sex 04/01 às 10:30"]);
    });

    it("Cris cancela pelo painel: aviso ao cliente (mesmo com lembretes desligados)", async () => {
      await db.user.update({ where: { id: clienteA.id }, data: { emailReminders: false } });
      const booking = await createBookingRow({});
      await as(admin, () => adminCancelBooking(booking.id), true);
      await flush();

      expect(sentTo()).toEqual([clienteA.email]);
      expect(subjects()).toEqual(["Sua reserva de sex 04/01 às 10:30 foi cancelada pelo Cris"]);
      expect(mocks.sendEmail.mock.calls[0][0].replyTo).toEqual([admin.email]);
      expect(mocks.sendEmail.mock.calls[0][0].headers).toBeUndefined();
    });

    it("Cris cancela pelo cancelBooking (não dono): aviso ao cliente", async () => {
      const booking = await createBookingRow({ userId: clienteB.id });
      await as(admin, () => cancelBooking(booking.id), true);
      await flush();

      expect(sentTo()).toEqual([clienteB.email]);
    });

    it("reserva manual (sem conta) cancelada: ninguém recebe", async () => {
      const booking = await createBookingRow({ userId: null, source: "MANUAL", customerName: "João" });
      await as(admin, () => adminCancelBooking(booking.id), true);
      await flush();

      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(await db.booking.count()).toBe(0);
    });

    it("SMTP fora do ar: cancelamento acontece; aviso FAILED sem nova tentativa", async () => {
      mocks.sendEmail.mockRejectedValue(new Error("down"));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const booking = await createBookingRow({});

      await expect(as(admin, () => adminCancelBooking(booking.id), true)).resolves.toMatchObject({ success: true });
      await flush();

      expect(await db.booking.count()).toBe(0);
      const [row] = await logs();
      expect([row.kind, row.status, row.attempts]).toEqual(["CANCELLED_BY_ADMIN", "FAILED", MAX_ATTEMPTS]);
      consoleError.mockRestore();
    });
  });

  describe("lembrete da véspera (Cron)", () => {
    it("envia 1 lembrete por reserva de amanhã, com cabeçalho de one-click", async () => {
      await createBookingRow({});
      await createBookingRow({ userId: clienteB.id, date: FRIDAY_1130 });
      // Sábado: fica para o Cron de sexta.
      await createBookingRow({ date: new Date("2030-01-05T13:30:00.000Z") });

      const summary = await runNotificationsCron(THURSDAY_20H);

      expect(summary.reminders).toEqual({ date: FRIDAY, bookings: 2, sent: 2, failed: 0, skipped: 0 });
      expect(sentTo().sort()).toEqual([clienteA.email, clienteB.email].sort());
      expect(subjects()).toEqual(["Amanhã às 10:30 com o Cris — sex 04/01", "Amanhã às 11:30 com o Cris — sex 04/01"]);
      const [message] = mocks.sendEmail.mock.calls[0];
      expect(message.replyTo).toEqual([admin.email]);
      expect(message.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(message.headers["List-Unsubscribe"]).toContain("/api/notificacoes/lembretes?u=");
    });

    it("Cron rodando duas vezes (ou junto) não repete o lembrete", async () => {
      await createBookingRow({});

      await Promise.all([sendReminders(FRIDAY, THURSDAY_20H), sendReminders(FRIDAY, THURSDAY_20H)]);
      await runNotificationsCron(THURSDAY_20H);

      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    });

    it("opt-out: sem lembrete (SKIPPED), mas a confirmação continua saindo", async () => {
      await db.user.update({ where: { id: clienteA.id }, data: { emailReminders: false } });
      await book(clienteA);
      await flush();
      mocks.sendEmail.mockClear();

      const summary = await sendReminders(FRIDAY, THURSDAY_20H);

      expect(summary).toMatchObject({ bookings: 1, sent: 0, skipped: 1 });
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      const reminder = (await logs()).find((row) => row.kind === "REMINDER");
      expect(reminder?.status).toBe("SKIPPED");
      expect((await logs()).find((row) => row.kind === "CONFIRMATION")?.status).toBe("SENT");
    });

    it("falha passageira: segunda tentativa na mesma rodada", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.sendEmail.mockRejectedValueOnce(beforeMessage());
      await createBookingRow({});

      const summary = await sendReminders(FRIDAY, THURSDAY_20H);

      expect(summary).toMatchObject({ sent: 1, failed: 0 });
      expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
      consoleError.mockRestore();
    });

    it("reserva manual sem conta não recebe; mensalista recebe pela conta com o mesmo e-mail", async () => {
      const mensalista = await db.mensalista.create({
        data: { name: "Pedro", phone: "31999998888", email: clienteB.email.toUpperCase(), fixedDay: 5, fixedTime: "11:30" },
      });
      await createBookingRow({ userId: null, source: "MANUAL", customerName: "João" });
      await createBookingRow({ userId: null, source: "MENSALISTA", mensalistaId: mensalista.id, date: FRIDAY_1130, customerName: "Pedro" });

      const summary = await sendReminders(FRIDAY, THURSDAY_20H);

      expect(summary).toMatchObject({ bookings: 2, sent: 1, skipped: 1 });
      expect(sentTo()).toEqual([clienteB.email]);
    });

    it("flag admin: só o lembrete de quem é admin", async () => {
      vi.stubEnv("NOTIFICACOES", "admin");
      await createBookingRow({});
      await createBookingRow({ userId: admin.id, date: FRIDAY_1130 });

      await sendReminders(FRIDAY, THURSDAY_20H);

      expect(sentTo()).toEqual([admin.email]);
    });

    it("link do e-mail desliga os próximos lembretes", async () => {
      await createBookingRow({});
      expect(await disableRemindersByToken(clienteA.id, unsubscribeToken(clienteB.id))).toBe(false);
      expect(await disableRemindersByToken(clienteA.id, unsubscribeToken(clienteA.id))).toBe(true);

      await sendReminders(FRIDAY, THURSDAY_20H);

      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect((await db.user.findUniqueOrThrow({ where: { id: clienteA.id } })).emailReminders).toBe(false);
    });
  });

  describe("renovação de mensalista", () => {
    const createCycle = async (name: string, renewed = false) => {
      const mensalista = await db.mensalista.create({ data: { name, phone: "31999998888", fixedDay: 5, fixedTime: "09:00" } });
      // 4 fins de semana; o último é o de 04/01/2030 (quinta 03/01 = último fim de semana).
      return db.mensalistaCycle.create({
        data: {
          mensalistaId: mensalista.id,
          paidAt: dateToDb("2029-12-13"),
          weekends: ["2029-12-14", "2029-12-21", "2029-12-28", "2030-01-04"].map(dateToDb),
          endsAt: dateToDb("2030-01-06"),
          renewedAt: renewed ? dateToDb("2030-01-02") : null,
        },
      });
    };

    it("1 e-mail ao Cris com todos os do último fim de semana, só 1x por ciclo", async () => {
      await createCycle("Pedro");
      await createCycle("Ana");
      await createCycle("Renovado", true);

      expect((await runNotificationsCron(THURSDAY_20H)).renewals).toBe(1);
      expect(sentTo()).toEqual([admin.email]);
      expect(subjects()).toEqual(["Renovar mensalistas: Ana, Pedro"]);

      // Cron de sexta: nada de novo.
      expect((await runNotificationsCron(new Date("2030-01-04T23:00:00.000Z"))).renewals).toBe(0);
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    });

    it("mensalista novo no último fim de semana depois do aviso: só ele no próximo e-mail", async () => {
      await createCycle("Pedro");
      await runNotificationsCron(THURSDAY_20H);
      await createCycle("Ana");

      await runNotificationsCron(new Date("2030-01-04T23:00:00.000Z"));

      expect(subjects()).toEqual(["Renovar mensalistas: Pedro", "Renovar mensalistas: Ana"]);
    });
  });
});
