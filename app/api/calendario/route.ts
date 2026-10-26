import { NextResponse } from "next/server";
import { db } from "@/app/_lib/prisma";
import { buildIcs, icsFileName, isGridTime, isValidDate } from "@/app/_lib/calendar";
import { appUrl } from "@/app/_lib/notifications/templates";

// Arquivo .ics do "Adicionar ao calendário" (Prompt 20): /api/calendario?data=yyyy-MM-dd&hora=HH:mm&servico=<id>.
// Sem id de reserva e sem dado pessoal: só serviço, dia, hora e endereço da barbearia (do banco).
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Não encontrado.", { status: 404 });

export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const date = params.get("data") ?? "";
  const time = params.get("hora") ?? "";
  const serviceId = params.get("servico") ?? "";
  if (!isValidDate(date) || !isGridTime(time) || !serviceId || serviceId.length > 64) {
    return new NextResponse("Pedido inválido.", { status: 400 });
  }

  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { name: true, barbershop: { select: { address: true } } },
  });
  if (!service) {
    return notFound();
  }

  const ics = buildIcs(
    { date, time, serviceName: service.name, address: service.barbershop.address, bookingsUrl: appUrl("/bookings") },
    new Date(),
  );
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // inline: no iPhone o Safari abre direto a tela "Adicionar ao Calendário"; Android e computador baixam.
      "Content-Disposition": `inline; filename="${icsFileName(date)}"`,
      "Cache-Control": "private, no-store",
    },
  });
};
