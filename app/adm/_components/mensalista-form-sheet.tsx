"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { saveMensalista } from "@/app/_actions/admin/save-mensalista";
import type { MensalistaItem } from "@/app/_lib/mensalistas";
import { FIXED_DAY_LABELS, FixedDay } from "@/app/_lib/mensalista-cycle";
import { formatPhone } from "@/app/_lib/phone";
import { TIME_GRID } from "@/app/_lib/schedule";
import ChoiceGroup from "./choice-group";
import { showAdminResult } from "./admin-result";

interface MensalistaFormSheetProps {
  // null = fechado; "new" = cadastro novo; item = edição.
  target: MensalistaItem | "new" | null;
  onClose: () => void;
}

const DAY_OPTIONS = ([5, 6] as const).map((day) => ({ value: day, label: FIXED_DAY_LABELS[day] }));
const TIME_OPTIONS = TIME_GRID.map((time) => ({ value: time, label: time }));

// Novo / editar mensalista (spec §4.6): nome, WhatsApp, e-mail da conta Google (opcional),
// dia e horário fixos.
const MensalistaFormSheet = ({ target, onClose }: MensalistaFormSheetProps) => {
  const editing = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fixedDay, setFixedDay] = useState<FixedDay>(5);
  const [fixedTime, setFixedTime] = useState<string>(TIME_GRID[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) {
      setName(editing?.name ?? "");
      setPhone(editing ? formatPhone(editing.phone) : "");
      setEmail(editing?.email ?? "");
      setFixedDay(editing?.fixedDay ?? 5);
      setFixedTime(editing?.fixedTime ?? TIME_GRID[0]);
    }
  }, [target, editing]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await saveMensalista({ id: editing?.id, name, phone, email, fixedDay, fixedTime });
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
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-auto p-0" aria-describedby={undefined}>
        <SheetHeader className="border-b border-solid border-secondary px-page py-6 text-left">
          <SheetTitle>{editing ? `Editar ${editing.name}` : "Novo mensalista"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 px-page py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome-mensalista">Nome</Label>
            <Input
              id="nome-mensalista"
              value={name}
              required
              maxLength={80}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp-mensalista">WhatsApp com DDD</Label>
            <Input
              id="whatsapp-mensalista"
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-mensalista">E-mail da conta Google (opcional)</Label>
            <Input
              id="email-mensalista"
              type="email"
              inputMode="email"
              value={email}
              maxLength={120}
              autoComplete="off"
              aria-describedby="email-mensalista-ajuda"
              onChange={(event) => setEmail(event.target.value)}
              className="h-11"
            />
            <p id="email-mensalista-ajuda" className="text-caption text-muted-foreground">
              Se ele entrar no app com esse e-mail, vê o horário em &quot;Meu próximo agendamento&quot;.
            </p>
          </div>

          <ChoiceGroup legend="Dia fixo" name="dia-fixo" options={DAY_OPTIONS} value={fixedDay} onChange={setFixedDay} columns={2} />
          <ChoiceGroup legend="Horário fixo" name="horario-fixo" options={TIME_OPTIONS} value={fixedTime} onChange={setFixedTime} columns={4} />

          {editing?.nextBooking && (
            <p className="text-caption text-muted-foreground">
              Mudar o dia ou o horário vale a partir do próximo ciclo; as reservas já feitas continuam.
            </p>
          )}

          <SheetFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default MensalistaFormSheet;
