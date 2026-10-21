import { NextResponse } from "next/server";
import { disableRemindersByToken } from "@/app/_lib/notifications/reminders-preference";

// One-click unsubscribe (RFC 8058): o Gmail faz POST aqui pelo cabeçalho List-Unsubscribe-Post.
// Só POST desliga; o link visível no e-mail abre a página /notificacoes/lembretes.
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const ok = await disableRemindersByToken(params.get("u") ?? "", params.get("t") ?? "");
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
};
