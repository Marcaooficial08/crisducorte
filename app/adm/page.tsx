import Header from "../_components/header";
import { redirect } from "next/navigation";
import { db } from "../_lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import BookingItemAdm from "../_components/booking-item-adm";
import { assertAdmin } from "../_lib/auth-guards";
import EmptyState from "../_components/empty-state";
import { CalendarIcon } from "lucide-react";
import { isAdminPanelV2Enabled, isMensalistasEnabled } from "../_lib/flags";
import { countPendingRenewals } from "../_lib/mensalistas";
import AdminTabs from "./_components/admin-tabs";
import { getBookingMetrics, recentWeeksWindow } from "../_lib/metrics";
import { getAdminAgenda } from "../_lib/admin-agenda";
import { visibleBarbershopWhere } from "../_lib/barbershops";
import { getNow } from "../_lib/schedule";
import AdminAgenda from "./_components/admin-agenda";
import BookingMetricsCard from "./_components/booking-metrics";
import { adminBookingItemSelect } from "../_lib/booking-item-data";

// Server Actions desta página enviam e-mail/push em segundo plano (waitUntil): até 60s (Prompt 22).
export const maxDuration = 60;

const BookingsPageAdm = async () => {
    const session = await getServerSession(authOptions);

    try {
        assertAdmin(session);
    } catch {
        return redirect("/");
    }

    const now = new Date();
    const panelV2 = isAdminPanelV2Enabled(session);
    // Relógio da agenda (getNow): no e2e, a mesma semana da grade.
    const metricsWindow = recentWeeksWindow(getNow());

    // Painel novo (ADMIN_PANEL_V2): grade da semana aberta, com o relógio da agenda (getNow).
    const barbershop = panelV2
        ? await db.barbershop.findFirst({
              where: visibleBarbershopWhere,
              orderBy: { id: "asc" },
              include: { services: { orderBy: { id: "asc" }, select: { id: true, name: true } } },
          })
        : null;
    const mensalistas = isMensalistasEnabled(session);
    const [agenda, metrics, pendingRenewals] = await Promise.all([
        barbershop ? getAdminAgenda(barbershop.id, getNow()) : Promise.resolve(null),
        getBookingMetrics(metricsWindow.desde, metricsWindow.ate),
        mensalistas ? countPendingRenewals(getNow()) : Promise.resolve(0),
    ]);

    // Admin vê todas as reservas — sem filtro de userId
    const confirmedBookings = await db.booking.findMany({
        where: {
            date: { gte: now },
        },
        select: adminBookingItemSelect,
        orderBy: { date: "asc" },
    });

    const finishedBookings = await db.booking.findMany({
        where: {
            date: { lt: now },
        },
        select: adminBookingItemSelect,
        orderBy: { date: "desc" },
    });

    return (
        <>
            <Header />
            {/* Coluna centralizada no computador, coerente com a home nova; o header segue largo. */}
            <div className="mx-auto w-full max-w-2xl px-page py-6">
                {mensalistas && <AdminTabs current="agenda" pendingRenewals={pendingRenewals} />}
                {barbershop && agenda && (
                    <section aria-labelledby="agenda-admin" className="mb-8">
                        <h1 id="agenda-admin" className="text-title font-bold mb-4">Agenda</h1>
                        <AdminAgenda days={agenda} services={barbershop.services} address={barbershop.address} />
                    </section>
                )}

                <section aria-labelledby="metricas-admin" className="mb-8">
                    <h2 id="metricas-admin" className="text-muted-foreground uppercase font-bold text-label mb-3">
                        Métricas · últimas 5 semanas
                    </h2>
                    <BookingMetricsCard metrics={metrics} semanas={metricsWindow.semanas} />
                </section>

                {barbershop && agenda ? (
                    <h2 className="text-title font-bold mb-6">Agendamentos dos clientes</h2>
                ) : (
                    <h1 className="text-title font-bold mb-6">Agendamentos dos clientes</h1>
                )}
                {confirmedBookings.length > 0 && (
                    <>
                        <h2 className="text-muted-foreground uppercase font-bold text-label mb-3">Confirmados</h2>
                        <div className="flex flex-col gap-3">
                            {confirmedBookings.map((booking) => (
                                <BookingItemAdm key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
                {finishedBookings.length > 0 && (
                    <>
                        <h2 className="text-muted-foreground uppercase font-bold text-label mt-6 mb-3">Finalizados</h2>
                        <div className="flex flex-col gap-3">
                            {finishedBookings.map((booking) => (
                                <BookingItemAdm key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
                {confirmedBookings.length === 0 && finishedBookings.length === 0 && (
                    <EmptyState icon={CalendarIcon} title="Nenhum agendamento por enquanto." />
                )}
            </div>
        </>
    );
};

export default BookingsPageAdm;
