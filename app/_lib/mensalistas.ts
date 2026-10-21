import { MensalistaStatus, Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/app/_lib/prisma";
import { slotInstant } from "@/app/_lib/availability";
import { getCustomerName } from "@/app/_lib/customer-name";
import { TIME_ZONE } from "@/app/_lib/schedule";
import { CycleConflict } from "@/app/_lib/admin-actions";
import {
  CycleDates,
  CycleProgress,
  FixedDay,
  cycleFromDb,
  cycleProgress,
  cycleSituation,
  dateOf,
  isFixedDay,
  renewAfterFriday,
  shortDate,
  slotDayLabel,
  truncatedEndsAt,
  dateToDb,
} from "@/app/_lib/mensalista-cycle";

// Consultas e passos de transação dos mensalistas (MEL-025), usados pelas actions de
// app/_actions/admin/ e pela página /adm/mensalistas.

type Tx = Prisma.TransactionClient;

// Horários do ciclo já ocupados por reserva (de qualquer origem) ou bloqueio. Roda depois do lockSlot.
export const findCycleConflicts = async (
  tx: Pick<Tx, "booking" | "slotBlock">,
  barbershopId: string,
  slots: { date: string; time: string }[],
): Promise<CycleConflict[]> => {
  const instants = slots.map((slot) => slotInstant(slot.date, slot.time));
  const [bookings, blocks] = await Promise.all([
    tx.booking.findMany({
      where: { barbershopId, date: { in: instants } },
      select: {
        date: true,
        source: true,
        customerName: true,
        user: { select: { name: true } },
        mensalista: { select: { name: true } },
      },
    }),
    tx.slotBlock.findMany({ where: { date: { in: instants } }, select: { date: true, reason: true } }),
  ]);

  return slots.flatMap((slot, index) => {
    const time = instants[index].getTime();
    const booking = bookings.find((item) => item.date.getTime() === time);
    const block = blocks.find((item) => item.date.getTime() === time);
    if (!booking && !block) {
      return [];
    }
    const reason = booking
      ? booking.source === "MENSALISTA"
        ? `Mensalista ${booking.mensalista?.name ?? getCustomerName(booking)}`
        : `Reserva de ${getCustomerName(booking)}`
      : `Bloqueado${block?.reason ? ` · ${block.reason}` : ""}`;
    return [{ ...slot, label: `${slotDayLabel(slot.date)} às ${slot.time}`, reason }];
  });
};

// Pausar e excluir (D4f, D4g): cancela as reservas futuras do mensalista, cada uma com
// BookingCancellation (byAdmin = true), e encurta o endsAt do último ciclo. Devolve quantas cancelou.
export const cancelFutureMensalistaBookings = async (tx: Tx, mensalistaId: string, now: Date): Promise<number> => {
  const bookings = await tx.booking.findMany({
    where: { mensalistaId, date: { gt: now } },
    select: { id: true, date: true, source: true },
  });
  if (bookings.length > 0) {
    await tx.bookingCancellation.createMany({
      data: bookings.map((booking) => ({ bookingId: booking.id, date: booking.date, byAdmin: true, source: booking.source })),
    });
    await tx.booking.deleteMany({ where: { id: { in: bookings.map((booking) => booking.id) } } });
  }

  const latest = await tx.mensalistaCycle.findFirst({ where: { mensalistaId }, orderBy: { endsAt: "desc" } });
  if (latest) {
    const cycle = cycleFromDb(latest);
    const endsAt = truncatedEndsAt(cycle, now);
    if (endsAt !== cycle.endsAt) {
      await tx.mensalistaCycle.update({ where: { id: latest.id }, data: { endsAt: dateToDb(endsAt) } });
    }
  }
  return bookings.length;
};

export interface MensalistaCycleView extends CycleProgress {
  situation: string; // "2 de 4 — termina 08/11"
  period: string; // "23/10 → 15/11"
  renewAfterFriday: string;
}

export interface MensalistaItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  fixedDay: FixedDay | null;
  fixedTime: string | null;
  status: Exclude<MensalistaStatus, "EXCLUIDO">;
  cycle: MensalistaCycleView | null;
  cycleId: string | null; // ciclo mais recente (aviso de renovação por e-mail, 1x por ciclo)
  nextBooking: string | null; // "Sex 23/10 às 10:30"
  lastServiceId: string | null; // serviço da última reserva do ciclo (padrão no próximo pagamento)
  needsRenewal: boolean; // ativo, com ciclo no último fim de semana ou vencido
}

const cycleView = (cycle: CycleDates, now: Date): MensalistaCycleView => {
  const progress = cycleProgress(cycle, now);
  return {
    ...progress,
    situation: cycleSituation(progress),
    period: `${shortDate(progress.firstWeekend)} → ${shortDate(progress.endsAt)}`,
    renewAfterFriday: renewAfterFriday(cycle),
  };
};

// Lista da aba Mensalistas (spec §4.5): renovações no topo, depois ativos pelo próximo
// atendimento, depois pausados. Excluídos não aparecem (o histórico continua no banco).
export const getMensalistas = async (now: Date): Promise<MensalistaItem[]> => {
  const mensalistas = await db.mensalista.findMany({
    where: { status: { not: "EXCLUIDO" } },
    orderBy: { name: "asc" },
    include: {
      cycles: {
        orderBy: { endsAt: "desc" },
        take: 1,
        include: { bookings: { orderBy: { date: "desc" }, take: 1, select: { serviceId: true } } },
      },
      bookings: { where: { date: { gt: now } }, orderBy: { date: "asc" }, take: 1, select: { date: true } },
    },
  });

  const items = mensalistas.map((mensalista) => {
    const latest = mensalista.cycles[0];
    const cycle = latest ? cycleView(cycleFromDb(latest), now) : null;
    const next = mensalista.bookings[0]?.date;
    const status = mensalista.status === "PAUSADO" ? "PAUSADO" : "ATIVO";
    const item: MensalistaItem = {
      id: mensalista.id,
      name: mensalista.name,
      phone: mensalista.phone,
      email: mensalista.email,
      fixedDay: isFixedDay(mensalista.fixedDay) ? mensalista.fixedDay : null,
      fixedTime: mensalista.fixedTime,
      status,
      cycle,
      cycleId: latest?.id ?? null,
      nextBooking: next ? `${slotDayLabel(dateOf(next))} às ${formatInTimeZone(next, TIME_ZONE, "HH:mm")}` : null,
      lastServiceId: latest?.bookings[0]?.serviceId ?? null,
      needsRenewal: status === "ATIVO" && !!cycle?.needsRenewal && !latest?.renewedAt,
    };
    return { item, nextAt: next?.getTime() ?? Number.POSITIVE_INFINITY };
  });

  const rank = (item: MensalistaItem) => (item.status === "PAUSADO" ? 2 : item.needsRenewal ? 0 : 1);
  return items.sort((a, b) => rank(a.item) - rank(b.item) || a.nextAt - b.nextAt).map(({ item }) => item);
};

export const countPendingRenewals = async (now: Date): Promise<number> =>
  (await getMensalistas(now)).filter((item) => item.needsRenewal).length;
