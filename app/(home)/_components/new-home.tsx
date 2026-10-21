import Link from "next/link";
import { Session } from "next-auth";
import { fromZonedTime } from "date-fns-tz";
import { CalendarClockIcon, CalendarIcon, StoreIcon } from "lucide-react";
import Header from "@/app/_components/header";
import ShopCard from "@/app/_components/shop-card";
import NextBookingCard from "@/app/_components/next-booking-card";
import BookingItem from "@/app/_components/booking-item";
import EmptyState from "@/app/_components/empty-state";
import { db } from "@/app/_lib/prisma";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { AGENDA_CLOSED_MESSAGE, DaySlots, TIME_ZONE, getNextServiceDays, getNow } from "@/app/_lib/schedule";
import { getDaySlots } from "@/app/_lib/availability";
import { getNextBooking } from "@/app/_lib/next-booking";
import { isMensalistasEnabled } from "@/app/_lib/flags";
import BookingPicker from "./booking-picker";

interface NewHomeProps {
  session: Session | null;
}

// Fim (exclusivo) do último dia liberado, no fuso de São Paulo.
const endOfServiceDays = (lastDate: string) => {
  const next = new Date(`${lastDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return fromZonedTime(`${next.toISOString().slice(0, 10)}T00:00:00`, TIME_ZONE);
};

// Home nova (spec §4.1, flag NEW_HOME). Dias, horários e reservas calculados só no servidor.
const NewHome = async ({ session }: NewHomeProps) => {
  const now = getNow();
  const user = session?.user;
  const isAdmin = user?.isAdmin === true;
  const serviceDays = getNextServiceDays(now);
  const rangeEnd = serviceDays.length > 0 ? endOfServiceDays(serviceDays[serviceDays.length - 1].date) : undefined;

  const barbershop = await db.barbershop.findFirst({
    where: visibleBarbershopWhere,
    orderBy: { id: "asc" },
    include: { services: { orderBy: { id: "asc" } } },
  });

  const [daySlots, nextBooking, adminBookings] = await Promise.all([
    // Disponibilidade pelo ponto único (reservas + bloqueios).
    barbershop
      ? Promise.all(serviceDays.map((day) => getDaySlots(day.date, { barbershopId: barbershop.id, now })))
      : Promise.resolve([]),
    user ? getNextBooking(user, now, isMensalistasEnabled(session)) : Promise.resolve(null),
    isAdmin && rangeEnd
      ? db.booking.findMany({
          where: { date: { gte: now, lt: rangeEnd } },
          include: { service: true, barbershop: true, user: true },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const days = daySlots.filter((day): day is DaySlots => day !== null);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="pb-10">
      <Header />

      {/* Coluna centralizada no computador, igual ao design de celular; header e rodapé seguem largos. */}
      <div className="mx-auto w-full max-w-lg">
        <div className="px-page pt-6">
          <h1 className="text-display font-bold">{firstName ? `Olá, ${firstName}!` : "Olá, vamos agendar um corte?"}</h1>
          <p className="mt-1 text-body text-muted-foreground">Atendimento às sextas e sábados</p>

          {!barbershop ? (
            <EmptyState className="mt-6" icon={StoreIcon} title="Nenhuma barbearia disponível agora." />
          ) : (
            <>
              <div className="mt-6">
                <ShopCard name={barbershop.name} address={barbershop.address} />
              </div>

              {days.length === 0 ? (
                <EmptyState className="mt-6" icon={CalendarClockIcon} title={AGENDA_CLOSED_MESSAGE} />
              ) : (
                <BookingPicker
                  barbershop={{ id: barbershop.id, name: barbershop.name }}
                  services={barbershop.services.map((service) => ({ id: service.id, name: service.name, price: Number(service.price) }))}
                  days={days}
                  isAuthenticated={!!user}
                />
              )}
            </>
          )}

          {nextBooking && (
            <section aria-labelledby="proximo-agendamento" className="mt-8">
              <h2 id="proximo-agendamento" className="mb-3 text-label font-bold uppercase text-muted-foreground">
                Meu próximo agendamento
              </h2>
              <NextBookingCard
                date={nextBooking.date}
                serviceName={nextBooking.service.name}
                mensalista={nextBooking.source === "MENSALISTA"}
              />
            </section>
          )}
        </div>

        {isAdmin && (
          <section aria-labelledby="reservas-semana" className="mt-8">
            <h2 id="reservas-semana" className="mb-3 px-page text-label font-bold uppercase text-muted-foreground">
              Reservas da semana (admin)
            </h2>
            {adminBookings.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto px-page [&::-webkit-scrollbar]:hidden">
                {adminBookings.map((booking) => (
                  <BookingItem key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="px-page">
                <EmptyState icon={CalendarIcon} title="Nenhuma reserva nesta semana." />
              </div>
            )}
            <div className="mt-3 px-page">
              <Link href="/adm" className="inline-flex min-h-11 items-center text-body font-bold text-accent-soft underline underline-offset-4">
                Ver agenda completa
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NewHome;
