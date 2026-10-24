import { Barbershop, Service, User } from "@prisma/client";
import { Card, CardContent } from "./ui/card";
import { getCustomerName } from "../_lib/customer-name";
import { formatBookingDate } from "../_lib/booking-item-data";

interface BookingInfoProps {
  booking: {
    date: Date;
    service: Pick<Service, "name" | "price">;
    barbershop: Pick<Barbershop, "name">;
    customerName: string | null;
    user: Pick<User, "name"> | null;
  };
}

const BookingInfo = ({ booking }: BookingInfoProps) => {
  return (
    <Card>
      <CardContent className="p-3 gap-3 flex flex-col">
        <div className="flex justify-between">
          <h2 className="font-bold">{booking.service.name}</h2>
          <h3 className="font-bold text-body">
            {Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(booking.service.price))}
          </h3>
        </div>

        {booking.date && (
          <>
            <div className="flex justify-between">
              <h3 className="text-muted-foreground text-body">Data</h3>
              <h4 className="text-body">
                {formatBookingDate(booking.date, "dd 'de' MMMM")}
              </h4>
            </div>

            <div className="flex justify-between">
              <h3 className="text-muted-foreground text-body">Horário</h3>
              <h4 className="text-body">{formatBookingDate(booking.date, "HH:mm")}</h4>
            </div>
          </>
        )}

        <div className="flex justify-between">
          <h3 className="text-muted-foreground text-body">Cliente</h3>
          <h4 className="text-body">{getCustomerName(booking)}</h4>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingInfo;


