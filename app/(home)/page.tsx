import Header from "../_components/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, User } from "lucide-react";

import Final from "./_components/search";
import BookingItem from "../_components/booking-item";
import BookingItemAdm from "../_components/booking-item";
import { db } from "../_lib/prisma";
import BarbershopItem from "./_components/barbershop-item";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
 
  const [barbershops, recommendedBarbershops, confirmedBookings] = await Promise.all([
    db.barbershop.findMany({}),
    db.barbershop.findMany({
      orderBy: {
        id: 'asc',
      },
    }),
    session?.user ? db.booking.findMany({
      where: {
        userId: (session.user as any).id,
        date: {
          gte: new Date(),
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
      <Header />

      <div className="px-5 pt-5">
        <h2 className="text-xl font-bold">{session?.user ? `Olá ${session.user.name?.split(" ")[0]}!` : "Olá vamos agendar um corte hoje?"}</h2>
        <p className="capitalize text-sm">
          {format(new Date(), "EEEE',' dd 'de' MMMM", {
            locale: ptBR,
          })}
        </p>
      </div>

      <div className="px-5 mt-6">
        <Final />
      </div>

      <div className="mt-6">
        {confirmedBookings.length > 0 && ( 
          <>
            <h2 className="pl-5 text-sm mb-3 uppercase text-gray-400 font-bold">Agendamentos</h2>
            <div className="px-5 flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {confirmedBookings.map(booking => (    
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          </>
        )}
      </div> 

      <div className="mt-6">
        <h2 className="pl-5 text-sm mb-3 uppercase text-gray-400 font-bold">
          Recomendados
        </h2>
        <div className="flex px-5 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {barbershops.length === 1 ? (
            <div className="w-full">
              <BarbershopItem key={barbershops[0].id} barbershop={barbershops[0]} />
            </div>
          ) : (
            barbershops.map((barbershop) => (
              <div key={barbershop.id} className="min-w-[167px] max-w-[167px]">
                <BarbershopItem key={barbershop.id} barbershop={barbershop} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 mb-[4.5rem]">
        <h2 className="pl-5 text-sm mb-3 uppercase text-gray-400 font-bold">
          Populares
        </h2>
        <div className="flex px-5 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {recommendedBarbershops.map((barbershop) => (
            <div key={barbershop.id} className={barbershops.length === 1 ? "w-full" : "min-w-[167px] max-w-[167px]"}>
              <BarbershopItem key={barbershop.id} barbershop={barbershop} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
