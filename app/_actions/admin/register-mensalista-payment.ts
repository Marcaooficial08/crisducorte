"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { slotInstant } from "@/app/_lib/availability";
import { lockKey, lockSlot, mensalistaLockKey } from "@/app/_lib/slot-lock";
import { INTERACTIVE_TX_OPTIONS, isTransactionTimeout } from "@/app/_lib/transaction";
import { TIME_GRID, getNow } from "@/app/_lib/schedule";
import { findCycleConflicts } from "@/app/_lib/mensalistas";
import {
  CYCLE_WEEKENDS,
  cycleFromDb,
  cycleProgress,
  dateToDb,
  isFixedDay,
  planCycle,
  renewAfterFriday,
  slotDayLabel,
} from "@/app/_lib/mensalista-cycle";
import {
  ADMIN_ERROR_MESSAGES,
  AdminActionError,
  CycleConflict,
  PaymentResult,
  adminFail,
  adminOk,
  getPanelBarbershop,
  isAdminSession,
} from "@/app/_lib/admin-actions";

const inputSchema = z.object({
  mensalistaId: z.string().min(1),
  serviceId: z.string().min(1),
  // "Ciclo já em andamento": quantos fins de semana faltam (4 = ciclo novo).
  remainingWeekends: z.number().int().min(1).max(CYCLE_WEEKENDS).default(CYCLE_WEEKENDS),
});

class CycleConflictError extends Error {
  constructor(public readonly conflicts: CycleConflict[]) {
    super("CYCLE_CONFLICT");
    this.name = "CycleConflictError";
  }
}

// Registrar pagamento = novo ciclo (spec §5, D3, D4): reserva o horário fixo nos próximos
// fins de semana (4, ou os restantes de um ciclo em andamento), source = MENSALISTA, numa
// transação com lockSlot. Tudo ou nada: se um horário estiver ocupado ou bloqueado, nada é
// gravado e a resposta lista as datas. Renovar só no último fim de semana ou depois de vencido;
// o novo ciclo começa depois do anterior.
export const registerMensalistaPayment = async (input: z.input<typeof inputSchema>): Promise<PaymentResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { mensalistaId, serviceId, remainingWeekends } = parsed.data;

  let summary: { name: string; labels: string[] };
  try {
    const barbershop = await getPanelBarbershop();
    if (!barbershop) {
      return adminFail("NO_BARBERSHOP");
    }
    const service = await db.service.findFirst({ where: { id: serviceId, barbershopId: barbershop.id }, select: { id: true } });
    if (!service) {
      return adminFail("INVALID");
    }
    const now = getNow();

    summary = await db.$transaction(async (tx) => {
      // Dois cliques ao mesmo tempo: o segundo espera e cai no CYCLE_ACTIVE.
      await lockKey(tx, mensalistaLockKey(mensalistaId));
      const mensalista = await tx.mensalista.findUnique({
        where: { id: mensalistaId },
        include: { cycles: { orderBy: { endsAt: "desc" }, take: 1 } },
      });
      if (!mensalista || mensalista.status === "EXCLUIDO") {
        throw new AdminActionError("MENSALISTA_NOT_FOUND");
      }
      if (mensalista.status !== "ATIVO") {
        throw new AdminActionError("MENSALISTA_INACTIVE");
      }
      const { fixedDay, fixedTime } = mensalista;
      if (!isFixedDay(fixedDay) || !fixedTime || !(TIME_GRID as readonly string[]).includes(fixedTime)) {
        throw new AdminActionError("NO_FIXED_SLOT");
      }

      const previous = mensalista.cycles[0];
      const previousDates = previous ? cycleFromDb(previous) : null;
      if (previousDates && !cycleProgress(previousDates, now).needsRenewal) {
        throw new AdminActionError("CYCLE_ACTIVE");
      }

      const plan = planCycle({
        now,
        fixedDay,
        fixedTime,
        weekends: remainingWeekends,
        afterFriday: previousDates ? renewAfterFriday(previousDates) : undefined,
      });
      const instants = plan.slots.map((slot) => slotInstant(slot.date, slot.time));

      // Em ordem crescente (planCycle já devolve assim): duas gerações nunca se travam em ordem trocada.
      for (const instant of instants) {
        await lockSlot(tx, barbershop.id, instant);
      }
      const conflicts = await findCycleConflicts(tx, barbershop.id, plan.slots);
      if (conflicts.length > 0) {
        throw new CycleConflictError(conflicts);
      }

      const cycle = await tx.mensalistaCycle.create({
        data: {
          mensalistaId,
          paidAt: now,
          weekends: plan.weekends.map(dateToDb),
          endsAt: dateToDb(plan.endsAt),
        },
      });
      if (previous && !previous.renewedAt) {
        await tx.mensalistaCycle.update({ where: { id: previous.id }, data: { renewedAt: now } });
      }
      await tx.booking.createMany({
        data: instants.map((date) => ({
          barbershopId: barbershop.id,
          serviceId: service.id,
          date,
          userId: null,
          customerName: mensalista.name,
          customerPhone: mensalista.phone,
          source: "MENSALISTA" as const,
          mensalistaId,
          cycleId: cycle.id,
        })),
      });

      return { name: mensalista.name, labels: plan.slots.map((slot) => slotDayLabel(slot.date)) };
    }, INTERACTIVE_TX_OPTIONS);
  } catch (error) {
    if (error instanceof CycleConflictError) {
      return { success: false, code: "CYCLE_CONFLICT", error: ADMIN_ERROR_MESSAGES.CYCLE_CONFLICT, conflicts: error.conflicts };
    }
    if (error instanceof AdminActionError) {
      return adminFail(error.code);
    }
    if (isTransactionTimeout(error)) {
      return adminFail("BUSY");
    }
    console.error("Erro ao registrar pagamento de mensalista:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/adm");
  revalidatePath("/adm/mensalistas");
  const count = summary.labels.length;
  return adminOk(
    `Pagamento registrado: ${count} ${count === 1 ? "reserva" : "reservas"} para ${summary.name} (${summary.labels.join(", ")}).`,
  );
};
