import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIME_ZONE } from "../_lib/schedule";

interface NextBookingCardProps {
  date: Date;
  serviceName: string;
}

// Próxima reserva futura do próprio cliente (MEL-008). Sem reserva, quem chama não renderiza.
const NextBookingCard = ({ date, serviceName }: NextBookingCardProps) => {
  const weekday = formatInTimeZone(date, TIME_ZONE, "EEE", { locale: ptBR }).replace(".", "").toUpperCase();

  return (
    <Link
      href="/bookings"
      className="glass flex items-center gap-4 rounded-[var(--radius-lg)] border p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[14px] border border-accent bg-accent/[0.18]">
        <span className="text-caption font-bold text-accent-soft">{weekday}</span>
        <span className="text-display font-bold">{formatInTimeZone(date, TIME_ZONE, "dd")}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-bold text-title truncate">{serviceName}</span>
        <span className="text-body text-muted-foreground">às {formatInTimeZone(date, TIME_ZONE, "HH:mm")} · Confirmado</span>
      </span>
    </Link>
  );
};

export default NextBookingCard;
