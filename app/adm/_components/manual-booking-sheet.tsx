"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { createManualBooking } from "@/app/_actions/admin/create-manual-booking";
import { cn } from "@/app/_lib/utils";
import { showAdminResult } from "./admin-result";

export interface PanelService {
  id: string;
  name: string;
}

interface ManualBookingSheetProps {
  slot: { date: string; dayLabel: string; time: string } | null; // null = fechado
  services: PanelService[];
  onClose: () => void;
}

// Reserva na mão (spec §4.4): nome + WhatsApp, sem conta Google.
const ManualBookingSheet = ({ slot, services, onClose }: ManualBookingSheetProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const firstServiceId = services[0]?.id;
  const [serviceId, setServiceId] = useState(firstServiceId);
  const [submitting, setSubmitting] = useState(false);

  // Formulário limpo a cada horário aberto.
  useEffect(() => {
    if (slot) {
      setName("");
      setPhone("");
      setServiceId(firstServiceId);
    }
  }, [slot, firstServiceId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!slot || !serviceId) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await createManualBooking({
        date: slot.date,
        time: slot.time,
        serviceId,
        customerName: name,
        customerPhone: phone,
      });
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

  return (
    <Sheet open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-auto p-0" aria-describedby={undefined}>
        <SheetHeader className="border-b border-solid border-secondary px-page py-6 text-left">
          <SheetTitle>{slot ? `Reservar na mão · ${slot.dayLabel} às ${slot.time}` : "Reservar na mão"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 px-page py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome-cliente">Nome do cliente</Label>
            <Input
              id="nome-cliente"
              value={name}
              required
              maxLength={80}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp-cliente">WhatsApp com DDD</Label>
            <Input
              id="whatsapp-cliente"
              type="tel"
              inputMode="tel"
              value={phone}
              required
              autoComplete="off"
              placeholder="(11) 91234-5678"
              onChange={(event) => setPhone(event.target.value)}
              className="h-11"
            />
          </div>

          {services.length > 1 && (
            <fieldset>
              <legend className="float-left mb-3 w-full text-label font-bold uppercase text-muted-foreground">Serviço</legend>
              <div className="clear-both flex flex-col gap-2">
                {services.map((service) => (
                  <label key={service.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="servico-manual"
                      value={service.id}
                      checked={service.id === serviceId}
                      onChange={() => setServiceId(service.id)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex min-h-11 items-center rounded-[var(--radius-sm)] border px-4 py-2 font-bold transition-colors",
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                        service.id === serviceId ? "border-accent bg-accent/[0.18]" : "border-border hover:bg-secondary",
                      )}
                    >
                      {service.name}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <SheetFooter>
            <Button type="submit" className="w-full" disabled={submitting || !serviceId}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Reservar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ManualBookingSheet;
