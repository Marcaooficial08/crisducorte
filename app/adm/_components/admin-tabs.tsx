import Link from "next/link";
import { cn } from "@/app/_lib/utils";

interface AdminTabsProps {
  current: "agenda" | "mensalistas";
  pendingRenewals: number;
}

const TABS = [
  { id: "agenda", label: "Agenda", href: "/adm" },
  { id: "mensalistas", label: "Mensalistas", href: "/adm/mensalistas" },
] as const;

// Abas do painel do admin (spec §3, AdminTabs): Agenda e Mensalistas, com o número de renovações
// pendentes. Só aparece com a flag MENSALISTAS.
const AdminTabs = ({ current, pendingRenewals }: AdminTabsProps) => (
  <nav aria-label="Painel do admin" className="mb-6 flex gap-1 rounded-[var(--radius-lg)] border border-border p-1">
    {TABS.map((tab) => {
      const active = tab.id === current;
      return (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 text-body font-bold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
          )}
        >
          {tab.label}
          {tab.id === "mensalistas" && pendingRenewals > 0 && (
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warning px-1.5 text-caption font-bold text-background"
              aria-label={`${pendingRenewals} ${pendingRenewals === 1 ? "renovação pendente" : "renovações pendentes"}`}
            >
              {pendingRenewals}
            </span>
          )}
        </Link>
      );
    })}
  </nav>
);

export default AdminTabs;
