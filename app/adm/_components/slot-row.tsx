"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { adminCancelBooking } from "@/app/_actions/admin/admin-cancel-booking";
import { unblockSlot } from "@/app/_actions/admin/unblock-slot";
import type { AdminSlot } from "@/app/_lib/admin-agenda";
import { formatPhone, whatsappUrl } from "@/app/_lib/phone";
import { track } from "@/app/_lib/track";
import { cn } from "@/app/_lib/utils";
import { showAdminResult } from "./admin-result";

interface SlotRowProps {
  date: string;
  dayLabel: string;
  slot: AdminSlot;
  onBlock: () => void;
  onManualBooking: () => void;
}

// Um horário da grade do admin (spec §4.4): estado + ações. Horário passado não tem ações.
const SlotRow = ({ date, dayLabel, slot, onBlock, onManualBooking }: SlotRowProps) => {
  const [loading, setLoading] = useState(false);
  const { time, past, booking, block } = slot;

  const run = async (action: () => ReturnType<typeof unblockSlot>, onSuccess?: () => void) => {
    setLoading(true);
    try {
      if (showAdminResult(await action())) {
        onSuccess?.();
      }
    } catch (error) {
      console.error(error);
      toast.error("Não deu certo agora. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () =>
    booking && run(() => adminCancelBooking(booking.id), () => track("booking_cancelled", { by: "admin" }));

  return (
    <li
      className={cn(
        // Celular: botões abaixo; computador: na mesma linha, à direita.
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border p-3 sm:flex-row sm:items-center sm:justify-between",
        block && !booking ? "border-dashed border-border" : "border-border",
        past && "opacity-70",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="w-14 shrink-0 text-body font-bold">{time}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {booking ? (
            <>
              <p className="text-body">
                <span className="font-bold">{booking.customerName}</span>
                <span className="text-muted-foreground"> · {booking.serviceName}</span>
              </p>
              {booking.source === "MANUAL" && (
                <Badge variant="secondary" className="w-fit">
                  Reserva na mão
                </Badge>
              )}
              {booking.customerPhone && (
                <a
                  href={whatsappUrl(booking.customerPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chamar ${booking.customerName} no WhatsApp`}
                  className="inline-flex min-h-11 w-fit items-center text-body font-bold text-accent-soft underline underline-offset-4"
                >
                  {formatPhone(booking.customerPhone)}
                </a>
              )}
            </>
          ) : block ? (
            <p className="text-body">
              <span className="font-bold">Bloqueado</span>
              {block.reason && <span className="text-muted-foreground"> · {block.reason}</span>}
            </p>
          ) : (
            <p className="text-body text-muted-foreground">Livre</p>
          )}
          {past && <p className="text-caption text-muted-foreground">Horário já passou</p>}
        </div>
      </div>

      {!past && (
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          {booking && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={loading} aria-label={`Cancelar reserva das ${time}`}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar reserva de {booking.customerName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {dayLabel} às {time} · {booking.serviceName}. O horário volta a ficar livre.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-3">
                  <AlertDialogCancel className="mt-0 w-full">Voltar</AlertDialogCancel>
                  <AlertDialogAction className="w-full" onClick={handleCancel}>
                    Cancelar reserva
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {block && (
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              aria-label={`Desbloquear ${time}`}
              onClick={() => run(() => unblockSlot({ date, time }))}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Desbloquear
            </Button>
          )}
          {!booking && !block && (
            <>
              <Button size="sm" aria-label={`Reservar na mão ${time}`} onClick={onManualBooking}>
                Reservar na mão
              </Button>
              <Button variant="secondary" size="sm" aria-label={`Bloquear ${time}`} onClick={onBlock}>
                Bloquear
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

export default SlotRow;
