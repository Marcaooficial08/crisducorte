"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { fixedSlotLockKey, lockKey } from "@/app/_lib/slot-lock";
import { INTERACTIVE_TX_OPTIONS, isTransactionTimeout } from "@/app/_lib/transaction";
import { normalizePhone } from "@/app/_lib/phone";
import { getNow } from "@/app/_lib/schedule";
import {
  AdminActionError,
  AdminActionResult,
  adminFail,
  adminOk,
  isAdminSession,
  timeSchema,
} from "@/app/_lib/admin-actions";

const inputSchema = z.object({
  id: z.string().min(1).optional(), // ausente = cadastro novo
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  fixedDay: z.union([z.literal(5), z.literal(6)]),
  fixedTime: timeSchema,
});

const emailSchema = z.string().email().max(120);

// Cadastrar e editar mensalista (spec §4.6). Dia e horário fixos obrigatórios; dois mensalistas
// ativos não dividem o mesmo dia e horário. Editar o horário não mexe nas reservas já geradas:
// vale a partir do próximo ciclo (D4h).
export const saveMensalista = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { id, fixedDay, fixedTime } = parsed.data;
  const name = parsed.data.name.trim();
  if (name.length === 0 || name.length > 80) {
    return adminFail("INVALID_NAME");
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return adminFail("INVALID_PHONE");
  }
  // E-mail da conta Google (opcional): liga a reserva ao "Meu próximo agendamento" do cliente.
  const email = parsed.data.email?.trim().toLowerCase() || null;
  if (email && !emailSchema.safeParse(email).success) {
    return adminFail("INVALID_EMAIL");
  }

  let message: string;
  try {
    message = await db.$transaction(async (tx) => {
      await lockKey(tx, fixedSlotLockKey(fixedDay, fixedTime));

      const current = id
        ? await tx.mensalista.findUnique({ where: { id }, select: { status: true, fixedDay: true, fixedTime: true } })
        : null;
      if (id && (!current || current.status === "EXCLUIDO")) {
        throw new AdminActionError("MENSALISTA_NOT_FOUND");
      }

      // Pausado não segura o horário; a checagem volta a rodar ao reativar.
      if (!current || current.status === "ATIVO") {
        const other = await tx.mensalista.findFirst({
          where: { status: "ATIVO", fixedDay, fixedTime, ...(id ? { id: { not: id } } : {}) },
          select: { id: true },
        });
        if (other) {
          throw new AdminActionError("FIXED_SLOT_TAKEN");
        }
      }

      const data = { name, phone, email, fixedDay, fixedTime };
      if (!id || !current) {
        await tx.mensalista.create({ data });
        return `${name} cadastrado. Registre o pagamento para reservar os horários.`;
      }

      await tx.mensalista.update({ where: { id }, data });
      const fixedChanged = current.fixedDay !== fixedDay || current.fixedTime !== fixedTime;
      const hasFuture = fixedChanged && (await tx.booking.count({ where: { mensalistaId: id, date: { gt: getNow() } } })) > 0;
      return hasFuture
        ? "Dados salvos. O novo dia e horário valem a partir do próximo ciclo."
        : "Dados salvos.";
    }, INTERACTIVE_TX_OPTIONS);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return adminFail(error.code);
    }
    if (isTransactionTimeout(error)) {
      return adminFail("BUSY");
    }
    console.error("Erro ao salvar mensalista:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/adm");
  revalidatePath("/adm/mensalistas");
  return adminOk(message);
};
