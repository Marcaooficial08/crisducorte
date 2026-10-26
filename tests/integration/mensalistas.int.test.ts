import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { ADMIN_ERROR_MESSAGES, AdminErrorCode } from "@/app/_lib/admin-actions";
import { getMensalistas } from "@/app/_lib/mensalistas";
import { getNextBooking } from "@/app/_lib/next-booking";
import { cycleFromDb } from "@/app/_lib/mensalista-cycle";
import { saveMensalista } from "@/app/_actions/admin/save-mensalista";
import { registerMensalistaPayment } from "@/app/_actions/admin/register-mensalista-payment";
import { excludeMensalista, pauseMensalista, reactivateMensalista } from "@/app/_actions/admin/mensalista-status";
import { adminCancelBooking } from "@/app/_actions/admin/admin-cancel-booking";
import { saveBooking } from "@/app/_actions/save-booking";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, admin } = FIXTURES;

// Horário de São Paulo (UTC-3) → Date.
const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

// Relógio fixo (getNow = new Date(), com fake timers): quarta 02/01/2030 12:00.
// Sextas do ciclo novo: 04/01, 11/01, 18/01, 25/01 (endsAt domingo 27/01).
const WEDNESDAY_NOON = sp("2030-01-02T12:00:00");
const NEXT_MONDAY = sp("2030-01-07T10:00:00");
const FRIDAYS = ["2030-01-04", "2030-01-11", "2030-01-18", "2030-01-25"];
const at1030 = (date: string) => sp(`${date}T10:30:00`);

type User = { id: string; name: string; email: string };

const sessionOf = (user: User, isAdmin = false) => ({ user: { ...user, isAdmin }, expires: "2999-01-01T00:00:00.000Z" });
const as = <T>(user: User, fn: () => Promise<T>, isAdmin = false) => {
  mocks.getServerSession.mockResolvedValueOnce(sessionOf(user, isAdmin));
  return fn();
};
const asAdmin = <T>(fn: () => Promise<T>) => as(admin, fn, true);

const failed = (code: AdminErrorCode) => ({ success: false, code, error: ADMIN_ERROR_MESSAGES[code] });

const create = async (overrides: Partial<Parameters<typeof saveMensalista>[0]> = {}) => {
  const result = await asAdmin(() =>
    saveMensalista({ name: "Pedro Mensal", phone: "(11) 98888-7777", fixedDay: 5, fixedTime: "10:30", ...overrides }),
  );
  expect(result).toMatchObject({ success: true });
  return db.mensalista.findFirstOrThrow({ where: { name: overrides.name ?? "Pedro Mensal" } });
};

const pay = (mensalistaId: string, remainingWeekends?: number) =>
  asAdmin(() => registerMensalistaPayment({ mensalistaId, serviceId: service.id, remainingWeekends }));

const itemOf = async (id: string) => (await getMensalistas(new Date())).find((item) => item.id === id);

describe("mensalistas (banco real, relógio fixo)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(WEDNESDAY_NOON);
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("conta comum e sem sessão são recusadas em todas as actions, sem gravar nada", async () => {
    const pedro = await create();
    const calls = [
      () => saveMensalista({ name: "Outro", phone: "11977776666", fixedDay: 6, fixedTime: "09:00" }),
      () => registerMensalistaPayment({ mensalistaId: pedro.id, serviceId: service.id }),
      () => pauseMensalista(pedro.id),
      () => excludeMensalista(pedro.id),
      () => reactivateMensalista(pedro.id),
    ];
    for (const call of calls) {
      expect(await as(clienteA, call)).toEqual(failed("UNAUTHORIZED"));
      mocks.getServerSession.mockResolvedValueOnce(null);
      expect(await call()).toEqual(failed("UNAUTHORIZED"));
    }
    expect(await db.mensalista.count()).toBe(1);
    expect(await db.mensalistaCycle.count()).toBe(0);
    expect(await db.booking.count()).toBe(0);
    expect((await db.mensalista.findUniqueOrThrow({ where: { id: pedro.id } })).status).toBe("ATIVO");
  });

  describe("cadastro", () => {
    it("normaliza WhatsApp e e-mail; valida nome, telefone e e-mail", async () => {
      const pedro = await create({ email: "  Pedro@Gmail.COM " });
      expect(pedro).toMatchObject({ phone: "11988887777", email: "pedro@gmail.com", fixedDay: 5, fixedTime: "10:30", status: "ATIVO" });

      const base = { phone: "11988887777", fixedDay: 6 as const, fixedTime: "09:00" };
      expect(await asAdmin(() => saveMensalista({ ...base, name: "  " }))).toEqual(failed("INVALID_NAME"));
      expect(await asAdmin(() => saveMensalista({ ...base, name: "A", phone: "123" }))).toEqual(failed("INVALID_PHONE"));
      expect(await asAdmin(() => saveMensalista({ ...base, name: "A", email: "nao-e-email" }))).toEqual(failed("INVALID_EMAIL"));
      expect(await asAdmin(() => saveMensalista({ ...base, name: "A", fixedTime: "10:00" }))).toEqual(failed("INVALID"));
      expect(await db.mensalista.count()).toBe(1);
    });

    it("dois ativos não dividem o mesmo dia e horário; pausado não segura o horário até reativar", async () => {
      const pedro = await create();
      expect(await asAdmin(() => saveMensalista({ name: "João", phone: "11977776666", fixedDay: 5, fixedTime: "10:30" }))).toEqual(
        failed("FIXED_SLOT_TAKEN"),
      );

      await asAdmin(() => pauseMensalista(pedro.id));
      await create({ name: "João" });
      expect(await asAdmin(() => reactivateMensalista(pedro.id))).toEqual(failed("FIXED_SLOT_TAKEN"));
    });
  });

  describe("registrar pagamento", () => {
    it("gera as 4 reservas MENSALISTA do ciclo no dia e horário fixos, com cycleId e o serviço escolhido", async () => {
      const pedro = await create();

      expect(await pay(pedro.id)).toEqual({
        success: true,
        message: "Pagamento registrado: 4 reservas para Pedro Mensal (Sex 04/01, Sex 11/01, Sex 18/01, Sex 25/01).",
      });

      const cycle = await db.mensalistaCycle.findFirstOrThrow({ where: { mensalistaId: pedro.id } });
      expect(cycleFromDb(cycle)).toEqual({ weekends: FRIDAYS, endsAt: "2030-01-27" });
      expect(cycle.paidAt).toEqual(WEDNESDAY_NOON);

      const bookings = await db.booking.findMany({ orderBy: { date: "asc" } });
      expect(bookings.map((booking) => booking.date)).toEqual(FRIDAYS.map(at1030));
      for (const booking of bookings) {
        expect(booking).toMatchObject({
          source: "MENSALISTA",
          mensalistaId: pedro.id,
          cycleId: cycle.id,
          serviceId: service.id,
          barbershopId: barbershop.id,
          userId: null,
          customerName: "Pedro Mensal",
          customerPhone: "11988887777",
        });
      }

      expect(await itemOf(pedro.id)).toMatchObject({
        cycle: { situation: "1 de 4 — termina 27/01", period: "04/01 → 27/01" },
        nextBooking: "Sex 04/01 às 10:30",
        lastServiceId: service.id,
        needsRenewal: false,
      });
    });

    it("conflito com cliente e bloqueio: nada é gravado e as datas voltam na resposta", async () => {
      const pedro = await create();
      await db.booking.create({
        data: { barbershopId: barbershop.id, serviceId: service.id, userId: clienteA.id, date: at1030(FRIDAYS[0]) },
      });
      await db.slotBlock.create({ data: { date: at1030(FRIDAYS[2]), reason: "Feriado" } });

      expect(await pay(pedro.id)).toEqual({
        ...failed("CYCLE_CONFLICT"),
        conflicts: [
          { date: FRIDAYS[0], time: "10:30", label: "Sex 04/01 às 10:30", reason: `Reserva de ${clienteA.name}` },
          { date: FRIDAYS[2], time: "10:30", label: "Sex 18/01 às 10:30", reason: "Bloqueado · Feriado" },
        ],
      });
      expect(await db.mensalistaCycle.count()).toBe(0);
      expect(await db.booking.count()).toBe(1);
    });

    it("conflito com outro mensalista (horário fixo trocado no meio do ciclo)", async () => {
      const pedro = await create();
      await pay(pedro.id);
      // Pedro muda para 11:30: vale no próximo ciclo; as reservas das 10:30 ficam.
      expect(await asAdmin(() => saveMensalista({ id: pedro.id, name: "Pedro Mensal", phone: "11988887777", fixedDay: 5, fixedTime: "11:30" }))).toEqual({
        success: true,
        message: "Dados salvos. O novo dia e horário valem a partir do próximo ciclo.",
      });

      const joao = await create({ name: "João" });
      const result = await pay(joao.id);
      expect(result).toMatchObject({ code: "CYCLE_CONFLICT" });
      expect("conflicts" in result && result.conflicts.map((conflict) => conflict.reason)).toEqual(
        Array(4).fill("Mensalista Pedro Mensal"),
      );
      expect(await db.booking.count({ where: { mensalistaId: joao.id } })).toBe(0);
    });

    it("dois cliques ao mesmo tempo: um ciclo só", async () => {
      const pedro = await create();
      const results = await Promise.all([pay(pedro.id), pay(pedro.id)]);

      expect(results.filter((result) => result.success)).toHaveLength(1);
      expect(results.find((result) => !result.success)).toEqual(failed("CYCLE_ACTIVE"));
      expect(await db.mensalistaCycle.count()).toBe(1);
      expect(await db.booking.count()).toBe(4);
    });

    it("mensalista pausado não registra pagamento; excluído some", async () => {
      const pedro = await create();
      await asAdmin(() => pauseMensalista(pedro.id));
      expect(await pay(pedro.id)).toEqual(failed("MENSALISTA_INACTIVE"));
      await asAdmin(() => excludeMensalista(pedro.id));
      expect(await pay(pedro.id)).toEqual(failed("MENSALISTA_NOT_FOUND"));
    });

    it("o cliente não reserva o horário do mensalista quando a semana abre", async () => {
      const pedro = await create();
      await pay(pedro.id);

      vi.setSystemTime(NEXT_MONDAY);
      expect(
        await as(clienteA, () => saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date: at1030(FRIDAYS[1]).toISOString() })),
      ).toMatchObject({ success: false, code: "SLOT_TAKEN" });
    });
  });

  describe("ciclo e renovação", () => {
    it("ciclo já em andamento com 2 restantes: gera 2, mostra 3 de 4 e a renovação começa depois do 2º", async () => {
      const pedro = await create();
      expect(await pay(pedro.id, 2)).toMatchObject({
        success: true,
        message: "Pagamento registrado: 2 reservas para Pedro Mensal (Sex 04/01, Sex 11/01).",
      });

      const first = await db.mensalistaCycle.findFirstOrThrow();
      expect(cycleFromDb(first)).toEqual({ weekends: FRIDAYS.slice(0, 2), endsAt: "2030-01-13" });
      expect(await db.booking.count()).toBe(2);
      expect(await itemOf(pedro.id)).toMatchObject({ cycle: { situation: "3 de 4 — termina 13/01" }, needsRenewal: false });

      // Antes do último fim de semana, renovar é recusado.
      expect(await pay(pedro.id)).toEqual(failed("CYCLE_ACTIVE"));

      // Segunda depois do 1º: entra no último fim de semana → aviso de renovação.
      vi.setSystemTime(NEXT_MONDAY);
      expect(await itemOf(pedro.id)).toMatchObject({ cycle: { situation: "4 de 4 — termina 13/01" }, needsRenewal: true });

      expect(await pay(pedro.id)).toMatchObject({ success: true });
      const second = await db.mensalistaCycle.findFirstOrThrow({ where: { id: { not: first.id } } });
      expect(cycleFromDb(second)).toEqual({ weekends: ["2030-01-18", "2030-01-25", "2030-02-01", "2030-02-08"], endsAt: "2030-02-10" });
      expect((await db.mensalistaCycle.findUniqueOrThrow({ where: { id: first.id } })).renewedAt).toEqual(NEXT_MONDAY);
      expect(await db.booking.count()).toBe(6);
      // O ciclo novo vira o atual; o anterior já foi renovado.
      expect(await itemOf(pedro.id)).toMatchObject({ cycle: { situation: "1 de 4 — termina 10/02" }, needsRenewal: false });
    });

    it("falta (admin desmarca uma reserva): conta como usada, o ciclo não estende", async () => {
      const pedro = await create();
      await pay(pedro.id);
      const firstBooking = await db.booking.findFirstOrThrow({ where: { date: at1030(FRIDAYS[0]) } });

      expect(await asAdmin(() => adminCancelBooking(firstBooking.id))).toMatchObject({ success: true });
      expect(await db.bookingCancellation.findFirst()).toMatchObject({ bookingId: firstBooking.id, byAdmin: true, source: "MENSALISTA" });

      vi.setSystemTime(NEXT_MONDAY);
      const cycle = await db.mensalistaCycle.findFirstOrThrow();
      expect(cycleFromDb(cycle).endsAt).toBe("2030-01-27");
      expect(await itemOf(pedro.id)).toMatchObject({ cycle: { situation: "2 de 4 — termina 27/01" } });
    });
  });

  describe("pausar e excluir", () => {
    it("pausar cancela só as futuras (com BookingCancellation), encurta o ciclo e reativar exige novo pagamento", async () => {
      const pedro = await create();
      await pay(pedro.id);
      vi.setSystemTime(NEXT_MONDAY); // o 1º fim de semana já passou

      expect(await asAdmin(() => pauseMensalista(pedro.id))).toEqual({
        success: true,
        message: "Pedro Mensal pausado. 3 reservas futuras canceladas.",
      });
      expect((await db.mensalista.findUniqueOrThrow({ where: { id: pedro.id } })).status).toBe("PAUSADO");
      expect((await db.booking.findMany()).map((booking) => booking.date)).toEqual([at1030(FRIDAYS[0])]);
      const cancellations = await db.bookingCancellation.findMany({ orderBy: { date: "asc" } });
      expect(cancellations.map((item) => item.date)).toEqual(FRIDAYS.slice(1).map(at1030));
      expect(cancellations.every((item) => item.byAdmin && item.source === "MENSALISTA")).toBe(true);
      expect(cycleFromDb(await db.mensalistaCycle.findFirstOrThrow()).endsAt).toBe("2030-01-06");
      expect(await itemOf(pedro.id)).toMatchObject({ status: "PAUSADO", needsRenewal: false, nextBooking: null });

      // Horário livre para cliente de novo.
      expect(
        await as(clienteA, () => saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date: at1030(FRIDAYS[1]).toISOString() })),
      ).toEqual({ success: true });

      expect(await asAdmin(() => pauseMensalista(pedro.id))).toEqual(failed("INVALID_STATUS"));
      expect(await asAdmin(() => reactivateMensalista(pedro.id))).toMatchObject({ success: true });
      expect(await itemOf(pedro.id)).toMatchObject({ status: "ATIVO", needsRenewal: true });
      expect(await db.booking.count({ where: { mensalistaId: pedro.id, date: { gt: NEXT_MONDAY } } })).toBe(0);

      // Novo pagamento: começa no próximo horário fixo livre (sexta 11/01 é do cliente → conflito).
      expect(await pay(pedro.id)).toMatchObject({ code: "CYCLE_CONFLICT" });
    });

    it("excluir: status EXCLUIDO, futuras canceladas, histórico mantido, some da lista", async () => {
      const pedro = await create();
      await pay(pedro.id);
      vi.setSystemTime(NEXT_MONDAY);

      expect(await asAdmin(() => excludeMensalista(pedro.id))).toMatchObject({ success: true });
      expect(await db.mensalista.findUniqueOrThrow({ where: { id: pedro.id } })).toMatchObject({ status: "EXCLUIDO" });
      expect(await db.mensalistaCycle.count()).toBe(1);
      expect(await db.booking.count({ where: { mensalistaId: pedro.id } })).toBe(1); // a passada
      expect(await db.bookingCancellation.count()).toBe(3);
      expect(await itemOf(pedro.id)).toBeUndefined();
      expect(await asAdmin(() => reactivateMensalista(pedro.id))).toEqual(failed("MENSALISTA_NOT_FOUND"));
    });
  });

  describe("Meu próximo agendamento", () => {
    it("a conta com o mesmo e-mail vê a reserva do mensalista; outro e-mail, não", async () => {
      const pedro = await create({ email: clienteA.email.toUpperCase() });
      await pay(pedro.id);

      const next = await getNextBooking(clienteA, new Date());
      expect(next).toMatchObject({ date: at1030(FRIDAYS[0]), source: "MENSALISTA", service: { name: service.name } });
      expect(await getNextBooking(FIXTURES.clienteB, new Date())).toBeNull();

      // Pausado: as futuras foram canceladas, nada aparece.
      await asAdmin(() => pauseMensalista(pedro.id));
      expect(await getNextBooking(clienteA, new Date())).toBeNull();
    });

    it("a reserva própria do cliente continua aparecendo e vem antes se for mais cedo", async () => {
      const pedro = await create({ email: clienteA.email, fixedTime: "11:30" });
      await pay(pedro.id);
      await db.booking.create({
        data: { barbershopId: barbershop.id, serviceId: service.id, userId: clienteA.id, date: at1030(FRIDAYS[0]) },
      });
      expect(await getNextBooking(clienteA, new Date())).toMatchObject({ source: "CLIENT", userId: clienteA.id });
    });
  });
});
