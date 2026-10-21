import { formatInTimeZone } from "date-fns-tz";
import { TIME_ZONE } from "@/app/_lib/schedule";
import { SITE_NAME, SITE_URL } from "@/app/_lib/site";
import { formatPhone, whatsappUrl } from "@/app/_lib/phone";

// Textos dos e-mails (Prompt 19; ajustados para entregabilidade em 2026-10-21). Funções puras: português
// simples, multipart (texto puro + HTML leve, sem imagens), assunto sem "!", no máximo 2 links por e-mail,
// sempre com texto (nada de URL nua no HTML). Todo e-mail termina com o rodapé da barbearia.

export interface Shop {
  address: string;
  phone: string | null; // só dígitos; null = rodapé sem o WhatsApp
}

export interface Slot {
  date: Date;
  serviceName: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

// Links do e-mail: na staging o NEXTAUTH_URL aponta para ela; em produção, o site.
export const appUrl = (path = "/"): string => `${(process.env.NEXTAUTH_URL ?? SITE_URL).replace(/\/$/, "")}${path}`;

export const MAX_LINKS = 2;

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const time = (date: Date) => formatInTimeZone(date, TIME_ZONE, "HH:mm");
const dayMonth = (date: Date) => formatInTimeZone(date, TIME_ZONE, "dd/MM");
const weekdayOf = (date: Date) => WEEKDAY_NAMES[Number(formatInTimeZone(date, TIME_ZONE, "i")) % 7];

// "sex 23/10 às 10:30" (assuntos)
export const slotLabel = (date: Date): string => `${weekdayOf(date).slice(0, 3)} ${dayMonth(date)} às ${time(date)}`;

// "sexta 23/10 às 10:30" (corpo)
export const longSlotLabel = (date: Date): string => `${weekdayOf(date)} ${dayMonth(date)} às ${time(date)}`;

const greeting = (name: string | null | undefined) => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Olá, ${first}!` : "Olá!";
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Bloco de conteúdo: parágrafo de texto ou link. Vira texto puro e HTML do mesmo jeito.
type Block = string | { label: string; url: string };

const linkHtml = (label: string, url: string, style: string) =>
  `<a href="${escapeHtml(url)}" style="${style}">${escapeHtml(label)}</a>`;

// Cliente pode responder (Reply-To = Cris) ou chamar no WhatsApp. O número entra como link só se o
// e-mail ainda tiver espaço no limite de links; senão vai como texto.
const clientFooter = (shop: Shop, linkAllowed: boolean): { text: string; html: string } => {
  const base = `${SITE_NAME} · ${shop.address} · Dúvidas? Responda este e-mail ou chame o Cris no WhatsApp`;
  if (!shop.phone) {
    const text = `${SITE_NAME} · ${shop.address} · Dúvidas? Responda este e-mail.`;
    return { text, html: escapeHtml(text) };
  }
  const number = formatPhone(shop.phone);
  const html = linkAllowed
    ? `${escapeHtml(base)}: ${linkHtml(number, whatsappUrl(shop.phone), "color:#5B3FD6")}.`
    : `${escapeHtml(`${base}: ${number}`)}.`;
  return { text: `${base}: ${number}.`, html };
};

// Avisos para o próprio Cris: sem convite a responder.
const adminFooter = (shop: Shop): { text: string; html: string } => {
  const text = `${SITE_NAME} · ${shop.address} · Aviso automático do app de agendamento.`;
  return { text, html: escapeHtml(text) };
};

type Audience = "client" | "admin";

const compose = (subject: string, blocks: Block[], shop: Shop, audience: Audience): EmailContent => {
  const links = blocks.filter((block) => typeof block !== "string").length;
  if (links > MAX_LINKS) {
    throw new Error(`E-mail com ${links} links (máximo ${MAX_LINKS}).`);
  }
  const footer = audience === "client" ? clientFooter(shop, links < MAX_LINKS) : adminFooter(shop);
  const text = [...blocks.map((block) => (typeof block === "string" ? block : `${block.label}: ${block.url}`)), "--", footer.text].join(
    "\n\n",
  );
  const body = blocks
    .map((block) =>
      typeof block === "string"
        ? `<p style="margin:0 0 16px">${escapeHtml(block)}</p>`
        : `<p style="margin:0 0 16px">${linkHtml(block.label, block.url, "color:#5B3FD6;font-weight:bold")}</p>`,
    )
    .join("");
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#15161A;max-width:560px">` +
    body +
    `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #DDDDE3;font-size:13px;color:#52525B">${footer.html}</p>` +
    `</div>`;
  return { subject, text, html };
};

export const confirmationEmail = (input: { name: string | null; slot: Slot; shop: Shop }): EmailContent =>
  compose(
    `Sua reserva com o Cris — ${slotLabel(input.slot.date)}`,
    [
      greeting(input.name),
      `Sua reserva está confirmada: ${input.slot.serviceName}, ${longSlotLabel(input.slot.date)}, em ${input.shop.address}.`,
      { label: "Ver ou cancelar a reserva", url: appUrl("/bookings") },
    ],
    input.shop,
    "client",
  );

export const reminderEmail = (input: { name: string | null; slot: Slot; shop: Shop; unsubscribeUrl: string }): EmailContent =>
  compose(
    `Amanhã às ${time(input.slot.date)} com o Cris — ${weekdayOf(input.slot.date).slice(0, 3)} ${dayMonth(input.slot.date)}`,
    [
      greeting(input.name),
      `Lembrete: amanhã, ${longSlotLabel(input.slot.date)}, ${input.slot.serviceName}, em ${input.shop.address}.`,
      "Não vai poder ir? Cancele no app para liberar o horário.",
      { label: "Ver ou cancelar a reserva", url: appUrl("/bookings") },
      { label: "Não quero mais lembretes", url: input.unsubscribeUrl },
    ],
    input.shop,
    "client",
  );

export const cancelledByCrisEmail = (input: { name: string | null; slot: Slot; shop: Shop }): EmailContent =>
  compose(
    `Sua reserva de ${slotLabel(input.slot.date)} foi cancelada pelo Cris`,
    [
      greeting(input.name),
      `O Cris cancelou a sua reserva: ${input.slot.serviceName}, ${longSlotLabel(input.slot.date)}.`,
      "Se quiser, escolha outro horário no app.",
      { label: "Reservar de novo", url: appUrl("/") },
    ],
    input.shop,
    "client",
  );

export const adminNewBookingEmail = (input: { customerName: string; slot: Slot; shop: Shop }): EmailContent =>
  compose(
    `Nova reserva: ${input.customerName} — ${slotLabel(input.slot.date)}`,
    [
      `${input.customerName} reservou ${input.slot.serviceName} para ${longSlotLabel(input.slot.date)}.`,
      { label: "Abrir a agenda", url: appUrl("/adm") },
    ],
    input.shop,
    "admin",
  );

export const adminCancelledEmail = (input: { customerName: string; slot: Slot; shop: Shop }): EmailContent =>
  compose(
    `Cancelamento: ${input.customerName} — ${slotLabel(input.slot.date)}`,
    [
      `${input.customerName} cancelou ${input.slot.serviceName} de ${longSlotLabel(input.slot.date)}. O horário voltou a ficar livre.`,
      { label: "Abrir a agenda", url: appUrl("/adm") },
    ],
    input.shop,
    "admin",
  );

export interface RenewalItem {
  name: string;
  situation: string; // "4 de 4 — termina 25/10" ou "Ciclo terminou em 25/10"
}

export const renewalEmail = (input: { items: RenewalItem[]; shop: Shop }): EmailContent =>
  compose(
    `Renovar mensalistas: ${input.items.map((item) => item.name).join(", ")}`,
    [
      input.items.length === 1
        ? "Este mensalista está no último fim de semana do ciclo:"
        : "Estes mensalistas estão no último fim de semana do ciclo:",
      ...input.items.map((item) => `• ${item.name}: ${item.situation}`),
      { label: "Abrir Mensalistas", url: appUrl("/adm/mensalistas") },
    ],
    input.shop,
    "admin",
  );
