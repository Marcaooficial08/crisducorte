import Header from "../_components/header";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import Final from "./_components/search";
import BookingItem from "../_components/booking-item";
import { db } from "../_lib/prisma";
import { visibleBarbershopWhere } from "../_lib/barbershops";
import BarbershopItem from "./_components/barbershop-item";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import { hairSalonJsonLd } from "../_lib/json-ld";
import EmptyState from "../_components/empty-state";
import { StoreIcon } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
 
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
      include: {
        service: true,
        barbershop: true,
        user: true,
      },
      orderBy: {
        date: 'asc',
      },
    }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hairSalonJsonLd) }}
      />
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
