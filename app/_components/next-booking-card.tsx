import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIME_ZONE } from "../_lib/schedule";
import AddToCalendar, { AddToCalendarProps } from "./add-to-calendar";

interface NextBookingCardProps {
  date: Date;
  serviceName: string;
  // Horário fixo de mensalista (MEL-025): não está em /bookings e não se cancela pelo app.
  mensalista?: boolean;
  // "Adicionar ao calendário" (flag CALENDARIO), abaixo do cartão (fora do link para /bookings).
  calendar?: AddToCalendarProps;
}

// Próxima reserva futura do próprio cliente (MEL-008). Sem reserva, quem chama não renderiza.
const NextBookingCard = ({ date, serviceName, mensalista = false, calendar }: NextBookingCardProps) => {
  const weekday = formatInTimeZone(date, TIME_ZONE, "EEE", { locale: ptBR }).replace(".", "").toUpperCase();
  const content = (
    <>
      <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[14px] border border-accent bg-accent/[0.18]">
        <span className="text-caption font-bold text-accent-soft">{weekday}</span>
        <span className="text-display font-bold">{formatInTimeZone(date, TIME_ZONE, "dd")}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-bold text-title truncate">{serviceName}</span>
        <span className="text-body text-muted-foreground">
          às {formatInTimeZone(date, TIME_ZONE, "HH:mm")} · {mensalista ? "Mensalista" : "Confirmado"}
        </span>
        {mensalista && <span className="text-caption text-muted-foreground">Para remarcar, fale com o Cris.</span>}
      </span>
    </>
  );

  const card = mensalista ? (
    <div className="glass flex items-center gap-4 rounded-[var(--radius-lg)] border p-4">{content}</div>
  ) : (
    <Link
      href="/bookings"
      className="glass flex items-center gap-4 rounded-[var(--radius-lg)] border p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  );

  if (!calendar) {
    return card;
  }
  return (
    <div className="flex flex-col gap-3">
      {card}
      <AddToCalendar {...calendar} />
    </div>
  );
};

export default NextBookingCard;
