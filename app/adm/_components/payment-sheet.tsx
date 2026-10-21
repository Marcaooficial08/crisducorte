"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { registerMensalistaPayment } from "@/app/_actions/admin/register-mensalista-payment";
import type { CycleConflict } from "@/app/_lib/admin-actions";
import type { MensalistaItem } from "@/app/_lib/mensalistas";
import { CYCLE_WEEKENDS, planCycle, slotDayLabel } from "@/app/_lib/mensalista-cycle";
import ChoiceGroup from "./choice-group";
import { PanelService } from "./manual-booking-sheet";
import { showAdminResult } from "./admin-result";

interface PaymentSheetProps {
  mensalista: MensalistaItem | null; // null = fechado
  services: PanelService[];
  now: string; // relógio da agenda no servidor (ISO), para a prévia
  onClose: () => void;
}

const REMAINING_OPTIONS = [1, 2, 3, 4].map((count) => ({ value: count, label: String(count) }));

// Registrar pagamento / Renovar (spec §5, D3): escolhe o serviço e, para quem já estava no meio
// de um ciclo, quantos fins de semana faltam. Mostra as datas antes; se o servidor achar conflito,
// nada é gravado e a lista aparece aqui.
const PaymentSheet = ({ mensalista, services, now, onClose }: PaymentSheetProps) => {
  const [serviceId, setServiceId] = useState<string | undefined>(services[0]?.id);
  const [inProgress, setInProgress] = useState(false);
  const [remaining, setRemaining] = useState(CYCLE_WEEKENDS);
  const [conflicts, setConflicts] = useState<CycleConflict[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mensalista) {
      const last = services.find((service) => service.id === mensalista.lastServiceId);
      setServiceId(last?.id ?? services[0]?.id);
      setInProgress(false);
      setRemaining(CYCLE_WEEKENDS);
      setConflicts([]);
    }
  }, [mensalista, services]);

  const weekends = inProgress ? remaining : CYCLE_WEEKENDS;
  const preview = useMemo(() => {
    if (!mensalista?.fixedDay || !mensalista.fixedTime) {
      return null;
    }
    return planCycle({
      now: new Date(now),
      fixedDay: mensalista.fixedDay,
      fixedTime: mensalista.fixedTime,
      weekends,
      afterFriday: mensalista.cycle?.renewAfterFriday,
    });
  }, [mensalista, now, weekends]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!mensalista || !serviceId) {
      return;
    }
    setSubmitting(true);
    setConflicts([]);
    try {
      const result = await registerMensalistaPayment({ mensalistaId: mensalista.id, serviceId, remainingWeekends: weekends });
      if (!result.success && "conflicts" in result) {
        setConflicts(result.conflicts);
      }
      if (showAdminResult(result)) {
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Não deu certo agora. Tente de novo em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  const renewing = !!mensalista?.cycle;
  const title = mensalista ? `${renewing ? "Renovar" : "Registrar pagamento"} · ${mensalista.name}` : "Registrar pagamento";

  return (
    <Sheet open={!!mensalista} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-auto p-0" aria-describedby={undefined}>
        <SheetHeader className="border-b border-solid border-secondary px-page py-6 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 px-page py-6">
          {services.length > 1 && (
            <ChoiceGroup
              legend="Serviço"
              name="servico-mensalista"
              options={services.map((service) => ({ value: service.id, label: service.name }))}
              value={serviceId}
              onChange={setServiceId}
            />
          )}

          {!renewing && (
            <div className="flex flex-col gap-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-bold">
                <input
                  type="checkbox"
                  checked={inProgress}
                  onChange={(event) => setInProgress(event.target.checked)}
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                />
                Ciclo já em andamento
              </label>
              {inProgress && (
                <ChoiceGroup
                  legend="Fins de semana restantes"
                  name="fins-de-semana-restantes"
                  options={REMAINING_OPTIONS}
                  value={remaining}
                  onChange={setRemaining}
                  columns={4}
                />
              )}
            </div>
          )}

          {preview && (
            <section aria-labelledby="previa-ciclo">
              <h3 id="previa-ciclo" className="mb-2 text-label font-bold uppercase text-muted-foreground">
                Vai reservar
              </h3>
              {weekends < CYCLE_WEEKENDS && (
                <p className="mb-2 text-caption text-muted-foreground">
                  Começa no {CYCLE_WEEKENDS - weekends + 1}º de {CYCLE_WEEKENDS} fins de semana do ciclo.
                </p>
              )}
              <ul className="flex flex-col gap-1 text-body">
                {preview.slots.map((slot) => (
                  <li key={slot.date}>
                    {slotDayLabel(slot.date)} às {slot.time}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {conflicts.length > 0 && (
            <div role="alert" className="rounded-[var(--radius-lg)] border border-warning p-4">
              <p className="text-body font-bold">Nada foi reservado. Horários ocupados:</p>
              <ul className="mt-2 flex flex-col gap-1 text-body">
                {conflicts.map((conflict) => (
                  <li key={conflict.date}>
                    {conflict.label} — {conflict.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-caption text-muted-foreground">
                Cancele ou desbloqueie esses horários na agenda, ou mude o horário fixo do mensalista, e tente de novo.
              </p>
            </div>
          )}

          <SheetFooter>
            <Button type="submit" className="w-full" disabled={submitting || !serviceId || !preview}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {renewing ? "Renovar" : "Registrar pagamento"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentSheet;
