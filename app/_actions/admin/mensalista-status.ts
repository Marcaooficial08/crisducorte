"use server";

import { MensalistaStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { fixedSlotLockKey, lockKey, mensalistaLockKey } from "@/app/_lib/slot-lock";
import { INTERACTIVE_TX_OPTIONS, isTransactionTimeout } from "@/app/_lib/transaction";
import { getNow } from "@/app/_lib/schedule";
import { cancelFutureMensalistaBookings } from "@/app/_lib/mensalistas";
import {
  AdminActionError,
  AdminActionResult,
  adminFail,
  adminOk,
  isAdminSession,
  plural,
} from "@/app/_lib/admin-actions";

// Pausar, reativar e excluir mensalista (D4f, D4g). Nada é apagado: excluir só marca EXCLUIDO;
// os ciclos e as reservas passadas ficam no histórico.

const idSchema = z.string().min(1);

type Transition = {
  from: MensalistaStatus[];
  to: MensalistaStatus;
  cancelFuture: boolean;
  message: (name: string, cancelled: number) => string;
};

const cancelledText = (count: number) =>
  count > 0 ? ` ${plural(count, "reserva futura cancelada", "reservas futuras canceladas")}.` : "";

const TRANSITIONS = {
  pause: {
    from: ["ATIVO"],
    to: "PAUSADO",
    cancelFuture: true,
    message: (name, cancelled) => `${name} pausado.${cancelledText(cancelled)}`,
  },
  exclude: {
    from: ["ATIVO", "PAUSADO"],
    to: "EXCLUIDO",
    cancelFuture: true,
    message: (name, cancelled) => `${name} excluído.${cancelledText(cancelled)}`,
  },
  reactivate: {
    from: ["PAUSADO"],
    to: "ATIVO",
    cancelFuture: false,
    message: (name) => `${name} reativado. Registre o pagamento para reservar os horários.`,
  },
} satisfies Record<string, Transition>;

const changeStatus = async (mensalistaId: string, transition: Transition): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = idSchema.safeParse(mensalistaId);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const id = parsed.data;

  let message: string;
  try {
    message = await db.$transaction(async (tx) => {
      await lockKey(tx, mensalistaLockKey(id));
      const mensalista = await tx.mensalista.findUnique({
        where: { id },
        select: { name: true, status: true, fixedDay: true, fixedTime: true },
      });
      if (!mensalista || mensalista.status === "EXCLUIDO") {
        throw new AdminActionError("MENSALISTA_NOT_FOUND");
      }
      if (!transition.from.includes(mensalista.status)) {
        throw new AdminActionError("INVALID_STATUS");
      }

      // Reativar: o horário fixo pode ter ido para outro mensalista enquanto este estava pausado.
      if (transition.to === "ATIVO" && mensalista.fixedDay !== null && mensalista.fixedTime) {
        await lockKey(tx, fixedSlotLockKey(mensalista.fixedDay, mensalista.fixedTime));
        const other = await tx.mensalista.findFirst({
          where: { status: "ATIVO", fixedDay: mensalista.fixedDay, fixedTime: mensalista.fixedTime, id: { not: id } },
          select: { id: true },
        });
        if (other) {
          throw new AdminActionError("FIXED_SLOT_TAKEN");
        }
      }

      const cancelled = transition.cancelFuture ? await cancelFutureMensalistaBookings(tx, id, getNow()) : 0;
      await tx.mensalista.update({ where: { id }, data: { status: transition.to } });
      return transition.message(mensalista.name, cancelled);
    }, INTERACTIVE_TX_OPTIONS);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return adminFail(error.code);
    }
    if (isTransactionTimeout(error)) {
      return adminFail("BUSY");
    }
    console.error("Erro ao mudar situação do mensalista:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");
  revalidatePath("/adm/mensalistas");
  return adminOk(message);
};

export const pauseMensalista = async (mensalistaId: string) => changeStatus(mensalistaId, TRANSITIONS.pause);

export const excludeMensalista = async (mensalistaId: string) => changeStatus(mensalistaId, TRANSITIONS.exclude);

export const reactivateMensalista = async (mensalistaId: string) => changeStatus(mensalistaId, TRANSITIONS.reactivate);
