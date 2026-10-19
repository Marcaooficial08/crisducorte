"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { slotInstant } from "@/app/_lib/availability";
import { lockSlot } from "@/app/_lib/slot-lock";
import { getNextServiceDays, getNow } from "@/app/_lib/schedule";
import {
  AdminActionResult,
  adminFail,
  adminOk,
  blockDayMessage,
  dateSchema,
  getPanelBarbershop,
  isAdminSession,
  reasonSchema,
} from "@/app/_lib/admin-actions";

const inputSchema = z.object({ date: dateSchema, reason: reasonSchema });

// "Bloquear dia inteiro" (folga ou feriado, spec §4.4): numa transação só, bloqueia os horários
// livres e ainda por vir do dia. Reservas existentes não são tocadas.
export const blockDay = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { date, reason } = parsed.data;

  const day = getNextServiceDays(getNow()).find((serviceDay) => serviceDay.date === date);
  if (!day) {
    return adminFail("OUTSIDE_SCHEDULE");
  }

  let blocked = 0;
  let kept = 0;
  try {
    const barbershop = await getPanelBarbershop();
    if (!barbershop) {
      return adminFail("NO_BARBERSHOP");
    }
    // day.times já vem em ordem: as travas são pegas sempre na mesma ordem (sem deadlock).
    const instants = day.times.map((time) => slotInstant(date, time));

    await db.$transaction(
      async (tx) => {
        for (const instant of instants) {
          await lockSlot(tx, barbershop.id, instant);
        }
        const [bookings, blocks] = await Promise.all([
          tx.booking.findMany({ where: { barbershopId: barbershop.id, date: { in: instants } }, select: { date: true } }),
          tx.slotBlock.findMany({ where: { date: { in: instants } }, select: { date: true } }),
        ]);
        const booked = new Set(bookings.map((booking) => booking.date.getTime()));
        const alreadyBlocked = new Set(blocks.map((block) => block.date.getTime()));
        const free = instants.filter((instant) => !booked.has(instant.getTime()) && !alreadyBlocked.has(instant.getTime()));

        if (free.length > 0) {
          await tx.slotBlock.createMany({ data: free.map((instant) => ({ date: instant, reason })) });
        }
        blocked = free.length;
        kept = booked.size;
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    console.error("Erro ao bloquear o dia:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/adm");
  return adminOk(blockDayMessage(blocked, kept));
};
