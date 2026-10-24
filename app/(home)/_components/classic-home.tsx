import { Session } from "next-auth";
import Header from "@/app/_components/header";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import Final from "./search";
import BookingItem from "@/app/_components/booking-item";
import { db } from "@/app/_lib/prisma";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { bookingItemSelect } from "@/app/_lib/booking-item-data";
import BarbershopItem from "./barbershop-item";
import EmptyState from "@/app/_components/empty-state";
import { StoreIcon } from "lucide-react";

interface ClassicHomeProps {
  session: Session | null;
}

// Home antiga, sem alteração: usada com a flag NEW_HOME desligada e em /classic.
export default async function ClassicHome({ session }: ClassicHomeProps) {
  const isAdmin = session?.user?.isAdmin === true;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [barbershops, recommendedBarbershops, confirmedBookings] = await Promise.all([
    db.barbershop.findMany({ where: visibleBarbershopWhere }),
    db.barbershop.findMany({
      where: visibleBarbershopWhere,
      orderBy: {
        id: 'asc',
      },
    }),
    session?.user ? db.booking.findMany({
      where: {
        ...(isAdmin ? {} : { userId: session.user.id }),
        date: {
          gte: weekStart,
        }
      },
      select: bookingItemSelect,
      orderBy: {
        date: 'asc',
      },
    }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <Header />

      <div className="px-page pt-5">
        <h2 className="text-title font-bold">{session?.user ? `Olá, ${session.user.name?.split(" ")[0]}!` : "Olá, vamos agendar um corte?"}</h2>
        <p className="capitalize text-body">
          {format(new Date(), "EEEE',' dd 'de' MMMM", {
            locale: ptBR,
          })}
        </p>
      </div>

      <div className="px-page mt-6">
        <Final />
      </div>

      <div className="mt-6">
        {confirmedBookings.length > 0 && ( 
          <>
            <h2 className="pl-page text-label mb-3 uppercase text-muted-foreground font-bold">Agendamentos</h2>
            <div className="px-page flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {confirmedBookings.map(booking => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          </>
        )}
      </div> 

      <div className="mt-6">
        <h2 className="pl-page text-label mb-3 uppercase text-muted-foreground font-bold">
          Recomendados
        </h2>
        <div className="flex px-page gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {barbershops.length === 0 ? (
            <EmptyState className="w-full" icon={StoreIcon} title="Nenhuma barbearia disponível agora." />
          ) : barbershops.length === 1 ? (
            <div className="w-full max-w-sm">
              <BarbershopItem key={barbershops[0].id} barbershop={barbershops[0]} priority />
            </div>
          ) : (
            barbershops.map((barbershop, index) => (
              <div key={barbershop.id} className="min-w-[167px] max-w-[167px]">
                <BarbershopItem key={barbershop.id} barbershop={barbershop} sizes="167px" priority={index === 0} />
              </div>
            ))
          )}
        </div>
      </div>

      {recommendedBarbershops.length > 0 && (
      <div className="mt-6 mb-[4.5rem]">
        <h2 className="pl-page text-label mb-3 uppercase text-muted-foreground font-bold">
          Populares
        </h2>
        <div className="flex px-page gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {recommendedBarbershops.map((barbershop) => (
            <div key={barbershop.id} className={barbershops.length === 1 ? "w-full max-w-sm" : "min-w-[167px] max-w-[167px]"}>
              <BarbershopItem
                key={barbershop.id}
                barbershop={barbershop}
                sizes={barbershops.length === 1 ? undefined : "167px"}
              />
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
