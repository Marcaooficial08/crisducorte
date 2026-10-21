import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getFlagMode } from "@/app/_lib/flags";
import { getNow } from "@/app/_lib/schedule";
import { runNotificationsCron } from "@/app/_lib/notifications/notify";

// Cron da Vercel (vercel.json: qui e sex, 23:00 UTC = 20h em São Paulo; no Hobby roda em algum minuto
// dessa hora). Só roda sozinho em Production; na staging, chamar à mão com o CRON_SECRET do Preview.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A Vercel manda "Authorization: Bearer <CRON_SECRET>". Sem CRON_SECRET definido, ninguém entra.
const isAuthorized = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const GET = async (request: Request) => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (getFlagMode("NOTIFICACOES") === "off") {
    return NextResponse.json({ skipped: "NOTIFICACOES=off" });
  }

  // ?dia=yyyy-MM-dd: lembretes de outro dia, para testar na staging. Nunca em produção.
  const dia = new URL(request.url).searchParams.get("dia");
  if (dia !== null && (process.env.VERCEL_ENV === "production" || !ISO_DATE.test(dia))) {
    return NextResponse.json({ error: "Parâmetro dia não permitido." }, { status: 400 });
  }

  try {
    const summary = await runNotificationsCron(getNow(), dia ?? undefined);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Erro no Cron de notificações:", error);
    return NextResponse.json({ error: "Erro ao enviar notificações." }, { status: 500 });
  }
};
