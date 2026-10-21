"use client";

import { useState } from "react";
import { PlusIcon, UsersIcon } from "lucide-react";
import EmptyState from "@/app/_components/empty-state";
import { Button } from "@/app/_components/ui/button";
import type { MensalistaItem } from "@/app/_lib/mensalistas";
import MensalistaCard from "./mensalista-card";
import MensalistaFormSheet from "./mensalista-form-sheet";
import PaymentSheet from "./payment-sheet";
import { PanelService } from "./manual-booking-sheet";

interface MensalistasPanelProps {
  mensalistas: MensalistaItem[]; // já ordenados no servidor (renovações, ativos, pausados)
  services: PanelService[];
  now: string;
}

// Aba Mensalistas (spec §4.5). A lista atualiza sozinha: as actions chamam revalidatePath.
const MensalistasPanel = ({ mensalistas, services, now }: MensalistasPanelProps) => {
  const [formTarget, setFormTarget] = useState<MensalistaItem | "new" | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Pelo id: depois de salvar, a lista nova chega do servidor com os dados atualizados.
  const paymentTarget = mensalistas.find((item) => item.id === paymentId) ?? null;

  const active = mensalistas.filter((item) => item.status === "ATIVO");
  const paused = mensalistas.filter((item) => item.status === "PAUSADO");

  const renderList = (items: MensalistaItem[], label: string) => (
    <ul aria-label={label} className="flex flex-col gap-3">
      {items.map((item) => (
        <MensalistaCard key={item.id} mensalista={item} onEdit={() => setFormTarget(item)} onPay={() => setPaymentId(item.id)} />
      ))}
    </ul>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-title font-bold">Mensalistas</h1>
        <Button onClick={() => setFormTarget("new")}>
          <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo
        </Button>
      </div>

      {mensalistas.length === 0 && <EmptyState icon={UsersIcon} title="Nenhum mensalista cadastrado." />}

      {active.length > 0 && (
        <section aria-labelledby="mensalistas-ativos">
          <h2 id="mensalistas-ativos" className="mb-3 text-label font-bold uppercase text-muted-foreground">
            Ativos
          </h2>
          {renderList(active, "Mensalistas ativos")}
        </section>
      )}

      {paused.length > 0 && (
        <section aria-labelledby="mensalistas-pausados" className="mt-8">
          <h2 id="mensalistas-pausados" className="mb-3 text-label font-bold uppercase text-muted-foreground">
            Pausados
          </h2>
          {renderList(paused, "Mensalistas pausados")}
        </section>
      )}

      <MensalistaFormSheet target={formTarget} onClose={() => setFormTarget(null)} />
      <PaymentSheet mensalista={paymentTarget} services={services} now={now} onClose={() => setPaymentId(null)} />
    </>
  );
};

export default MensalistasPanel;
