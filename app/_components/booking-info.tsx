import { Barbershop, Booking, Prisma, Service, User } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "./ui/card";

interface BookingInfoProps {
  booking: {
    date: Date;
    service: Pick<Service, "name" | "price">;
    barbershop: Pick<Barbershop, "name">;
    user: Pick<User, "name">;
  };
}

const BookingInfo = ({ booking }: BookingInfoProps) => {
  return (
    <Card>
      <CardContent className="p-3 gap-3 flex flex-col">
        <div className="flex justify-between">
          <h2 className="font-bold">{booking.service.name}</h2>
          <h3 className="font-bold text-sm">
            {Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(booking.service.price))}
          </h3>
        </div>

        {booking.date && (
          <>
            <div className="flex justify-between">
              <h3 className="text-gray-400 text-sm">Data</h3>
              <h4 className="text-sm">
                {format(booking.date, "dd 'de' MMMM", {
                  locale: ptBR,
                })}
              </h4>
            </div>

            <div className="flex justify-between">
              <h3 className="text-gray-400 text-sm">Horário</h3>
              <h4 className="text-sm">{format(booking.date, "HH:mm")}</h4>
            </div>
          </>
        )}

        <div className="flex justify-between">
          <h3 className="text-gray-400 text-sm">Cliente</h3>
          <h4 className="text-sm">{booking.user.name}</h4>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingInfo;


