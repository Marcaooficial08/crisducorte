import { db } from "@/app/_lib/prisma";
import { isNotificacoesEnabledForUser } from "@/app/_lib/flags";
import { getCustomerName } from "@/app/_lib/customer-name";
import { dayRange } from "@/app/_lib/availability";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { addDays, dateOf } from "@/app/_lib/mensalista-cycle";
import { getMensalistas } from "@/app/_lib/mensalistas";
import { NotificationKind, acquire, expireStuck, markFailed, markSent, recordSkipped, retryableKeys } from "./log";
import { sendEmail } from "./transport";
import {
  EmailContent,
  Shop,
  adminCancelledEmail,
  adminNewBookingEmail,
  cancelledByCrisEmail,
  confirmationEmail,
  reminderEmail,
  renewalEmail,
} from "./templates";
import { unsubscribeOneClickUrl, unsubscribePageUrl } from "./unsubscribe-token";

// Notificações por e-mail (Prompt 19). Quem chama nunca depende do resultado: tudo aqui acontece
// depois do commit da reserva/cancelamento e os erros só ficam no NotificationLog e no log.

export type DeliveryResult = "SENT" | "FAILED" | "SKIPPED" | "DUPLICATE";

interface Recipient {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  emailReminders: boolean;
}

const RECIPIENT_SELECT = { id: true, name: true, email: true, isAdmin: true, emailReminders: true } as const;

const BOOKING_INCLUDE = {
  user: { select: RECIPIENT_SELECT },
  service: { select: { name: true } },
  barbershop: { select: { address: true, phone: true } },
  mensalista: { select: { email: true } },
} as const;

// Dados da reserva lidos ANTES do cancelamento (o cancelamento apaga a linha).
export interface BookingSnapshot {
  id: string;
  date: Date;
  customerName: string | null;
  user: Recipient | null;
  service: { name: string };
  barbershop: Shop;
}

export const loadBookingSnapshot = (bookingId: string) =>
  db.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });

export type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBookingSnapshot>>>;

// NOTIFY_ALLOWLIST (só na staging): com a lista definida, ninguém fora dela recebe.
const isAllowed = (email: string): boolean => {
  const list = (process.env.NOTIFY_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email.trim().toLowerCase());
};

interface Delivery {
  key: string;
  kind: NotificationKind;
  to: string | null;
  content: () => EmailContent;
  headers?: Record<string, string>;
  replyTo?: string[];
  retryable: boolean;
}

const deliver = async ({ key, kind, to, content, headers, replyTo, retryable }: Delivery): Promise<DeliveryResult> => {
  if (!to) {
    return "SKIPPED";
  }
  if (!isAllowed(to)) {
    await recordSkipped(key, kind, "Fora da NOTIFY_ALLOWLIST.");
    return "SKIPPED";
  }
  if (!(await acquire(key, kind))) {
    return "DUPLICATE";
  }
  try {
    await sendEmail({ to, ...content(), headers, replyTo });
  } catch (error) {
    console.error(`Falha ao enviar ${kind}:`, error);
    await markFailed(key, error, retryable);
    return "FAILED";
  }
  // Se gravar SENT falhar, a linha fica SENDING e o Cron fecha como FAILED sem reenviar.
  await markSent(key);
  return "SENT";
};

// Avisos ao Cris: todos os User.isAdmin com e-mail (nada de e-mail no código).
const getAdmins = () =>
  db.user.findMany({ where: { isAdmin: true, email: { not: null } }, select: RECIPIENT_SELECT, orderBy: { id: "asc" } });

// Reply-To dos e-mails ao cliente: "Dúvidas? Responda este e-mail" chega no Cris.
const replyToOf = (admins: Recipient[]): string[] => admins.flatMap((admin) => (admin.email ? [admin.email] : []));

const slotOf = (booking: BookingSnapshot) => ({ date: booking.date, serviceName: booking.service.name });

// Cliente reservou pelo app: confirmação para ele e "Nova reserva" para o Cris.
export const notifyBookingCreated = async (bookingId: string): Promise<DeliveryResult[]> => {
  const booking = await loadBookingSnapshot(bookingId);
  const user = booking?.user;
  if (!booking || !user || !isNotificacoesEnabledForUser(user)) {
    return [];
  }
  const shop = booking.barbershop;
  const slot = slotOf(booking);
  const admins = await getAdmins();
  const results = [
    await deliver({
      key: `confirm:${booking.id}`,
      kind: "CONFIRMATION",
      to: user.email,
      content: () => confirmationEmail({ name: user.name, slot, shop }),
      replyTo: replyToOf(admins),
      retryable: true,
    }),
  ];
  const customerName = getCustomerName(booking);
  for (const admin of admins) {
    results.push(
      await deliver({
        key: `admin-new:${booking.id}:${admin.id}`,
        kind: "ADMIN_NEW_BOOKING",
        to: admin.email,
        content: () => adminNewBookingEmail({ customerName, slot, shop }),
        retryable: true,
      }),
    );
  }
  return results;
};

// Cancelamento. byAdmin: o Cris cancelou a reserva do cliente → aviso ao cliente.
// Senão foi o próprio cliente → aviso ao Cris. Reserva sem conta (manual, mensalista) não avisa ninguém.
export const notifyBookingCancelled = async (booking: BookingSnapshot, byAdmin: boolean): Promise<DeliveryResult[]> => {
  const user = booking.user;
  if (!user || !isNotificacoesEnabledForUser(user)) {
    return [];
  }
  const shop = booking.barbershop;
  const slot = slotOf(booking);
  const admins = await getAdmins();
  if (byAdmin) {
    return [
      await deliver({
        key: `cancelled-by-admin:${booking.id}`,
        kind: "CANCELLED_BY_ADMIN",
        to: user.email,
        content: () => cancelledByCrisEmail({ name: user.name, slot, shop }),
        replyTo: replyToOf(admins),
        retryable: false,
      }),
    ];
  }
  const customerName = getCustomerName(booking);
  const results: DeliveryResult[] = [];
  for (const admin of admins) {
    results.push(
      await deliver({
        key: `admin-cancelled:${booking.id}:${admin.id}`,
        kind: "ADMIN_CANCELLED",
        to: admin.email,
        content: () => adminCancelledEmail({ customerName, slot, shop }),
        retryable: false,
      }),
    );
  }
  return results;
};

// Quem recebe o lembrete: a conta da reserva ou, na de mensalista, a conta com o mesmo e-mail.
const reminderRecipient = async (booking: LoadedBooking) => {
  if (booking.user) {
    return booking.user;
  }
  const email = booking.mensalista?.email;
  if (!email) {
    return null;
  }
  return db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: RECIPIENT_SELECT });
};

export interface ReminderSummary {
  date: string;
  bookings: number;
  sent: number;
  failed: number;
  skipped: number;
}

// Lembrete da véspera (Cron qui e sex às 20h): todas as reservas de `date` ("yyyy-MM-dd", fuso de SP).
// Reserva feita depois do Cron não recebe lembrete (a confirmação já chegou na hora).
export const sendReminders = async (date: string, now: Date): Promise<ReminderSummary> => {
  const bookings = await db.booking.findMany({
    where: { date: { ...dayRange(date), gt: now } },
    include: BOOKING_INCLUDE,
    orderBy: { date: "asc" },
  });
  const summary: ReminderSummary = { date, bookings: bookings.length, sent: 0, failed: 0, skipped: 0 };
  const pending: Delivery[] = [];
  const replyTo = replyToOf(await getAdmins());

  for (const booking of bookings) {
    const user = await reminderRecipient(booking);
    if (!user?.email || !isNotificacoesEnabledForUser(user)) {
      summary.skipped += 1;
      continue;
    }
    const key = `reminder:${booking.id}`;
    if (!user.emailReminders) {
      await recordSkipped(key, "REMINDER", "Lembretes desligados pelo cliente.");
      summary.skipped += 1;
      continue;
    }
    const oneClick = unsubscribeOneClickUrl(user.id);
    pending.push({
      key,
      kind: "REMINDER",
      to: user.email,
      content: () =>
        reminderEmail({ name: user.name, slot: slotOf(booking), shop: booking.barbershop, unsubscribeUrl: unsubscribePageUrl(user.id) }),
      // List-Unsubscribe só no lembrete: confirmação e avisos são transacionais.
      headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      replyTo,
      retryable: true,
    });
  }

  for (const delivery of pending) {
    let result = await deliver(delivery);
    // Falhou: tenta mais uma vez agora. O próximo Cron já é tarde para o lembrete.
    if (result === "FAILED") {
      result = await deliver(delivery);
    }
    if (result === "SENT") {
      summary.sent += 1;
    } else if (result === "FAILED") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
    }
  }
  return summary;
};

// Confirmações e "Nova reserva" que falharam na hora: nova tentativa no Cron, se a reserva ainda vale.
export const retryFailedConfirmations = async (now: Date): Promise<number> => {
  const keys = [...(await retryableKeys("CONFIRMATION")), ...(await retryableKeys("ADMIN_NEW_BOOKING"))];
  const bookingIds = Array.from(new Set(keys.map((key) => key.split(":")[1]).filter(Boolean)));
  let retried = 0;
  for (const bookingId of bookingIds) {
    const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { date: true } });
    if (booking && booking.date > now) {
      retried += (await notifyBookingCreated(bookingId)).filter((result) => result === "SENT").length;
    }
  }
  return retried;
};

// Aviso ao Cris: mensalistas no último fim de semana do ciclo (ou vencidos), 1x por ciclo.
export const sendRenewalAlerts = async (now: Date): Promise<number> => {
  const items = (await getMensalistas(now)).filter((item) => item.needsRenewal && item.cycleId && item.cycle);
  if (items.length === 0) {
    return 0;
  }
  const shop = await db.barbershop.findFirst({
    where: visibleBarbershopWhere,
    orderBy: { id: "asc" },
    select: { address: true, phone: true },
  });
  if (!shop) {
    return 0;
  }

  let sent = 0;
  for (const admin of await getAdmins()) {
    if (!admin.email || !isNotificacoesEnabledForUser(admin)) {
      continue;
    }
    if (!isAllowed(admin.email)) {
      continue;
    }
    // Um e-mail com todos os ciclos ainda não avisados; cada ciclo tem a sua linha (key).
    const claimed: { key: string; name: string; situation: string }[] = [];
    for (const item of items) {
      const key = `renewal:${item.cycleId}:${admin.id}`;
      if (await acquire(key, "ADMIN_RENEWAL")) {
        claimed.push({ key, name: item.name, situation: item.cycle?.situation ?? "" });
      }
    }
    if (claimed.length === 0) {
      continue;
    }
    try {
      await sendEmail({ to: admin.email, ...renewalEmail({ items: claimed, shop }) });
    } catch (error) {
      console.error("Falha ao enviar ADMIN_RENEWAL:", error);
      for (const item of claimed) {
        await markFailed(item.key, error, true);
      }
      continue;
    }
    for (const item of claimed) {
      await markSent(item.key);
    }
    sent += 1;
  }
  return sent;
};

export interface CronSummary {
  expired: number;
  retried: number;
  reminders: ReminderSummary;
  renewals: number;
}

// Rodada do Cron: fecha envios interrompidos, tenta de novo as confirmações, lembretes de amanhã
// (ou de `date`, só fora de produção) e avisos de renovação.
export const runNotificationsCron = async (now: Date, date?: string): Promise<CronSummary> => {
  const expired = await expireStuck(now);
  const retried = await retryFailedConfirmations(now);
  const reminders = await sendReminders(date ?? addDays(dateOf(now), 1), now);
  const renewals = await sendRenewalAlerts(now);
  return { expired, retried, reminders, renewals };
};
