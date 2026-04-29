"use client";

import { Prisma } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { cancelBooking } from "../_actions/cancel-booking";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface BookingItemAdmProps {
  booking: Prisma.BookingGetPayload<{
    include: {
      service: true;
      barbershop: true;
      user: true;
    };
  }>;
}

const BookingItemAdm = ({ booking }: BookingItemAdmProps) => {
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const isBookingConfirmed = isFuture(booking.date);

  const handleCancelClick = async () => {
    setIsDeleteLoading(true);
    try {
      await cancelBooking(booking.id);
      toast.success("Reserva cancelada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cancelar reserva.");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Card className="min-w-full cursor-pointer hover:bg-secondary/40 transition-colors">
          <CardContent className="py-0 flex px-0">
            <div className="flex flex-col gap-2 py-5 flex-[3] pl-5 pr-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isBookingConfirmed ? "default" : "secondary"}
                  className="w-fit"
                >
                  {isBookingConfirmed ? "Confirmado" : "Finalizado"}
                </Badge>
              </div>

              <h2 className="font-bold text-sm">{booking.service.name}</h2>

              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={booking.user.image ?? ""} />
                  <AvatarFallback className="text-xs">
                    {booking.user.name?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">
                    {booking.user.name ?? "Cliente"}
                  </span>
                  <span className="text-xs text-gray-400 leading-tight truncate max-w-[160px]">
                    {booking.user.email ?? ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 border-l border-solid border-secondary px-3">
              <p className="text-sm capitalize">
                {format(booking.date, "MMMM", { locale: ptBR })}
              </p>
              <p className="text-2xl font-bold">{format(booking.date, "dd")}</p>
              <p className="text-sm text-gray-400">{format(booking.date, "HH:mm")}</p>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>

      <SheetContent className="px-0">
        <SheetHeader className="px-5 text-left pb-6 border-b border-solid border-secondary">
          <SheetTitle>Detalhes do Agendamento</SheetTitle>
        </SheetHeader>

        <div className="px-5 mt-6 flex flex-col gap-4">
          {/* Cliente */}
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={booking.user.image ?? ""} />
                <AvatarFallback>
                  {booking.user.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{booking.user.name ?? "Cliente"}</p>
                <p className="text-xs text-gray-400">{booking.user.email ?? ""}</p>
              </div>
            </CardContent>
          </Card>

          {/* Serviço e datas */}
          <Card>
            <CardContent className="p-3 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">{booking.service.name}</span>
                <Badge variant={isBookingConfirmed ? "default" : "secondary"}>
                  {isBookingConfirmed ? "Confirmado" : "Finalizado"}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Data</span>
                <span className="text-sm">
                  {format(booking.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Horário</span>
                <span className="text-sm font-medium">{format(booking.date, "HH:mm")}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Barbearia</span>
                <span className="text-sm">{booking.barbershop.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="px-5 mt-6 flex-row gap-3">
          <SheetClose asChild>
            <Button className="w-full" variant="secondary">
              Voltar
            </Button>
          </SheetClose>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!isBookingConfirmed || isDeleteLoading}
                className="w-full"
                variant="destructive"
              >
                {isDeleteLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cancelar Reserva
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90%]">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar reserva de {booking.user.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não poderá ser revertida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-3">
                <AlertDialogCancel className="w-full mt-0">Voltar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleteLoading}
                  className="w-full"
                  onClick={handleCancelClick}
                >
                  {isDeleteLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default BookingItemAdm;
