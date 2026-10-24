"use client";

import { useState } from "react";
import { CalendarClockIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DayChip from "@/app/_components/day-chip";
import EmptyState from "@/app/_components/empty-state";
import { Button } from "@/app/_components/ui/button";
import { blockDay } from "@/app/_actions/admin/block-day";
import { blockSlot } from "@/app/_actions/admin/block-slot";
import { unblockDay } from "@/app/_actions/admin/unblock-day";
import type { AdminDay } from "@/app/_lib/admin-agenda";
import { AGENDA_CLOSED_MESSAGE } from "@/app/_lib/schedule";
import BlockSheet from "./block-sheet";
import ManualBookingSheet, { PanelService } from "./manual-booking-sheet";
import SlotRow from "./slot-row";
import { showAdminResult } from "./admin-result";

interface AdminAgendaProps {
  days: AdminDay[]; // semana aberta, calculada no servidor
  services: PanelService[];
  address: string; // endereço da barbearia (texto do "Lembrar no WhatsApp")
}

type BlockTarget = { kind: "slot"; time: string } | { kind: "day" };

// Grade da semana aberta no /adm (spec §4.4, flag ADMIN_PANEL_V2).
const AdminAgenda = ({ days, services, address }: AdminAgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [manualSlot, setManualSlot] = useState<{ date: string; dayLabel: string; time: string } | null>(null);
  const [unblockingDay, setUnblockingDay] = useState(false);

  // Dia selecionado pode sair da lista depois de recarregar (ex.: o sábado chegou).
  const day = days.find((d) => d.date === selectedDate) ?? days[0];

  if (!day) {
    return <EmptyState icon={CalendarClockIcon} title={AGENDA_CLOSED_MESSAGE} />;
  }

  const handleUnblockDay = async () => {
    setUnblockingDay(true);
    try {
      showAdminResult(await unblockDay({ date: day.date }));
    } catch (error) {
      console.error(error);
      toast.error("Não deu certo agora. Tente de novo em instantes.");
    } finally {
      setUnblockingDay(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        {days.map((d) => (
          <DayChip key={d.date} label={d.label} freeCount={d.freeCount} selected={d.date === day.date} onSelect={() => setSelectedDate(d.date)} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={day.freeCount === 0} onClick={() => setBlockTarget({ kind: "day" })}>
          Bloquear dia inteiro
        </Button>
        <Button variant="outline" disabled={day.blockedCount === 0 || unblockingDay} onClick={handleUnblockDay}>
          {unblockingDay && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Desbloquear dia
        </Button>
      </div>

      <ul aria-label={`Horários de ${day.label}`} className="mt-4 flex flex-col gap-2">
        {day.slots.map((slot) => (
          <SlotRow
            // Dia + horário: trocar de dia monta linhas novas (a animação de "mudou de estado" não dispara).
            key={`${day.date}-${slot.time}`}
            date={day.date}
            dayLabel={day.label}
            slot={slot}
            address={address}
            onBlock={() => setBlockTarget({ kind: "slot", time: slot.time })}
            onManualBooking={() => setManualSlot({ date: day.date, dayLabel: day.label, time: slot.time })}
          />
        ))}
      </ul>

      <BlockSheet
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        title={blockTarget?.kind === "slot" ? `Bloquear ${day.label} às ${blockTarget.time}` : `Bloquear ${day.label} inteiro`}
        description={
          blockTarget?.kind === "day"
            ? "Bloqueia todos os horários livres do dia. Reservas existentes são mantidas."
            : undefined
        }
        onConfirm={(reason) =>
          blockTarget?.kind === "slot"
            ? blockSlot({ date: day.date, time: blockTarget.time, reason })
            : blockDay({ date: day.date, reason })
        }
      />

      <ManualBookingSheet slot={manualSlot} services={services} onClose={() => setManualSlot(null)} />
    </>
  );
};

export default AdminAgenda;
