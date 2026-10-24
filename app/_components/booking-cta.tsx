import { ArrowRightIcon, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface BookingCTAProps {
  dayLabel?: string; // "Sex 16"
  time?: string;
  loading: boolean;
  onClick: () => void;
}

// Botão principal da reserva (MEL-008).
const BookingCTA = ({ dayLabel, time, loading, onClick }: BookingCTAProps) => {
  const ready = !!dayLabel && !!time;

  return (
    <Button
      className="h-[52px] w-full rounded-[var(--radius-lg)] text-base font-bold"
      disabled={!ready || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          {/* Com "reduzir movimento", o ícone fica parado: o texto já diz que está reservando. */}
          <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          Reservando…
        </>
      ) : ready ? (
        <>
          Reservar {dayLabel} às {time}
          <ArrowRightIcon className="ml-2 h-5 w-5" aria-hidden="true" />
        </>
      ) : (
        "Escolha um horário"
      )}
    </Button>
  );
};

export default BookingCTA;
