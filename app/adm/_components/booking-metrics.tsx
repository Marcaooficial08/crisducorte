import { BookingMetrics, CANCELLATIONS_SINCE_LABEL } from "@/app/_lib/metrics";

interface BookingMetricsCardProps {
  metrics: BookingMetrics;
  semanas: string[]; // segundas-feiras (YYYY-MM-DD) da janela, da mais antiga para a atual
}

// "2026-10-12" → "12/10"
const weekLabel = (monday: string) => `${monday.slice(8, 10)}/${monday.slice(5, 7)}`;

// Métricas do /adm (spec §6, medição): reservas confirmadas e canceladas, lidas do banco.
const BookingMetricsCard = ({ metrics, semanas }: BookingMetricsCardProps) => {
  const byWeek = new Map(metrics.porSemana.map((week) => [week.semana, week]));

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border p-4">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-caption text-muted-foreground">Confirmadas</dt>
          <dd className="text-title font-bold">{metrics.confirmadas}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Canceladas</dt>
          <dd className="text-title font-bold">{metrics.canceladas}</dd>
        </div>
      </dl>

      <table className="w-full text-body">
        <caption className="sr-only">Reservas por semana</caption>
        <thead>
          <tr className="text-left text-caption text-muted-foreground">
            <th scope="col" className="py-1 font-medium">Semana de</th>
            <th scope="col" className="py-1 text-right font-medium">Confirmadas</th>
            <th scope="col" className="py-1 text-right font-medium">Canceladas</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => {
            const week = byWeek.get(semana);
            return (
              <tr key={semana} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-medium">{weekLabel(semana)}</th>
                <td className="py-2 text-right">{week?.total ?? 0}</td>
                <td className="py-2 text-right">{week?.canceladas ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-caption text-muted-foreground">Canceladas registradas desde {CANCELLATIONS_SINCE_LABEL}.</p>
    </div>
  );
};

export default BookingMetricsCard;
