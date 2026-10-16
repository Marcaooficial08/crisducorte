"use client";


import { Button } from "@/app/_components/ui/button";
import { Calendar } from "@/app/_components/ui/calendar";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/app/_components/ui/sheet";
import { Barbershop, Booking, Service } from "@prisma/client";
import { ptBR } from "date-fns/locale";
import { format, setHours, setMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { saveBooking } from "../_actions/save-booking";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getDayBookings } from "../_actions/get-day-bookings";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/app/_lib/track";
import { AGENDA_CLOSED_MESSAGE, SLOT_UNAVAILABLE_MESSAGE, ServiceDay, TIME_GRID, TIME_ZONE } from "@/app/_lib/schedule";

interface ServiceItemProps {
  barbershop: Barbershop;
  service: Service;
  isAuthenticated: boolean;
  // Agenda nova (flag AGENDA_V2): dias liberados calculados no servidor. null = agenda antiga.
  serviceDays: ServiceDay[] | null;
}

const ServiceItem = ({ service, barbershop, isAuthenticated, serviceDays }: ServiceItemProps) => {
  const router = useRouter();
  const { data } = useSession();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState<string | undefined>();
  const [submitIsLoading, setSubmitIsLoading] = useState(false);
  const [sheetIsOpen, setSheetIsOpen] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [bookingsVersion, setBookingsVersion] = useState(0);

  // Dia selecionado no calendário ("yyyy-MM-dd").
  const selectedDay = date ? format(date, "yyyy-MM-dd") : undefined;

  useEffect(() => {
    if (!date) {
      return;
    }
    const refreshAvailableHours = async () => {
      const _dayBookings = await getDayBookings(barbershop.id, date);
      setDayBookings(_dayBookings);
    };
    refreshAvailableHours();
  }, [date, barbershop.id, bookingsVersion]);

  // Depois de recarregar a grade, o dia selecionado pode ter saído da lista.
  useEffect(() => {
    if (serviceDays && selectedDay && !serviceDays.some((day) => day.date === selectedDay)) {
      setDate(undefined);
      setHour(undefined);
    }
  }, [serviceDays, selectedDay]);

  const handleDateClick = (date: Date | undefined) => {
    setDate(date);
    setHour(undefined);
  };

  const handleHourClick = (time: string) => {
    setHour(time);
  };

  const handleBookingClick = () => {
    if (!data?.user) {
      track("login_from_booking", { service: service.name });
      return signIn("google");
    }
    track("booking_started", { service: service.name });
    setSheetIsOpen(true);
  };

  const handleBookingSubmit = async () => {
    setSubmitIsLoading(true);
    try {
      if (!hour || !date || !data?.user) {
        return;
      }
      const newDate = serviceDays
        ? fromZonedTime(`${format(date, "yyyy-MM-dd")}T${hour}:00`, TIME_ZONE)
        : setMinutes(setHours(date, Number(hour.split(":")[0])), Number(hour.split(":")[1]));

      const result = await saveBooking({
        serviceId: service.id,
        barbershopId: barbershop.id,
        date: newDate.toISOString(),
      });

      if (!result.success) {
        track("booking_failed", { service: service.name, reason: "rejected" });
        toast(result.error ?? "Erro ao criar reserva.", { description: "Escolha outro horário." });
        if (result.error === SLOT_UNAVAILABLE_MESSAGE) {
          // Recarrega dias/horários do servidor e as reservas do dia: o horário vencido some.
          setHour(undefined);
          setBookingsVersion((version) => version + 1);
          router.refresh();
        }
        return;
      }

      track("booking_confirmed", { service: service.name, weekday: format(newDate, "EEEE"), hour });

      setSheetIsOpen(false);
      setHour(undefined);
      setDate(undefined);

      toast("Reserva realizada com sucesso!", {
        description: serviceDays
          ? formatInTimeZone(newDate, TIME_ZONE, "'Para' dd 'de' MMMM 'às' HH':'mm'.'", { locale: ptBR })
          : format(newDate, "'Para' dd 'de' MMMM 'às' HH':'mm'.'", {
              locale: ptBR,
            }),
        action: {
          label: "Visualizar",
          onClick: () => router.push("/bookings"),
        },
      });
    } catch (error) {
      console.error(error);
      track("booking_failed", { service: service.name, reason: "exception" });
    } finally {
      setSubmitIsLoading(false);
    }
  };

  const tileDisabled = (date: Date) => {
    if (serviceDays) {
      const day = format(date, "yyyy-MM-dd");
      return !serviceDays.some((serviceDay) => serviceDay.date === day);
    }

    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const currentWeekMonday = new Date(currentDate);
    currentWeekMonday.setDate(currentDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1)); // Encontrar a segunda-feira da semana atual
    const endOfWeek = new Date(currentWeekMonday);
    endOfWeek.setDate(endOfWeek.getDate() + 7); // Encontrar o final da semana atual

    // Verificar se a data fornecida está dentro da semana atual
    const isCurrentWeek = date >= currentWeekMonday && date < endOfWeek;

    // Se a data fornecida estiver dentro da semana atual e for sexta-feira (5) ou sábado (6)
    if (isCurrentWeek && (date.getDay() === 5 || date.getDay() === 6)) {
      return false; // Habilitar para agendamento
    }

    // Desabilitar para agendamento
    return true;
  };

  const timeList = useMemo(() => {
    if (!date) {
      return [];
    }

    if (serviceDays) {
      const serviceDay = serviceDays.find((day) => day.date === selectedDay);
      if (!serviceDay) {
        return [];
      }
      const booked = new Set(dayBookings.map((booking) => formatInTimeZone(booking.date, TIME_ZONE, "HH:mm")));
      return serviceDay.times.filter((time) => !booked.has(time));
    }

    return TIME_GRID.filter((time) => {
      const [timeHour, timeMinutes] = time.split(":").map(Number);

      return !dayBookings.find((booking) => {
        const bookingHour = booking.date.getHours();
        const bookingMinutes = booking.date.getMinutes();

        return bookingHour === timeHour && bookingMinutes === timeMinutes;
      });
    });
  }, [date, dayBookings, serviceDays, selectedDay]);

  return (
    <Card>
      <CardContent className="p-3 w-full">
        <div className="flex gap-4 items-center w-full">
          <div className="relative min-h-[110px] min-w-[110px] max-h-[110px] max-w-[110px]">
            <Image className="rounded-lg" src={service.imageUrl} fill sizes="110px" style={{ objectFit: "contain" }} alt={service.name} />
          </div>
          <div className="flex flex-col w-full">
            <h2 className="font-bold">{service.name}</h2>
            <p className="text-body text-muted-foreground">{service.description}</p>

            <div className="flex items-center justify-between mt-3">
              <p className="text-accent-soft text-body font-bold">
                {Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(service.price))}
              </p>

              <Sheet open={sheetIsOpen} onOpenChange={setSheetIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" onClick={handleBookingClick}>
                    Reservar
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full p-0 overflow-auto"> {/* Adicionado overflow-auto */}
                  <SheetHeader className="text-left px-page py-6 border-b border-solid border-secondary">
                    <SheetTitle>Fazer Reserva</SheetTitle>
                  </SheetHeader>
                  <div className="py-6 overflow-auto"> {/* Adicionado overflow-auto */}
                    {serviceDays && serviceDays.length === 0 ? (
                      <p className="px-page text-center text-body text-muted-foreground">{AGENDA_CLOSED_MESSAGE}</p>
                    ) : (
                    <Calendar
                      mode="single"
                      defaultMonth={serviceDays?.[0] ? new Date(`${serviceDays[0].date}T00:00:00`) : undefined}
                      selected={date}
                      onSelect={handleDateClick}
                      locale={ptBR}
                      fromDate={new Date()}
                      disabled={tileDisabled}
                      styles={{
                        head_cell: {
                          width: "100%",
                          textTransform: "capitalize",
                        },
                        cell: {
                          width: "100%",
                        },
                        button: {
                          width: "100%",
                        },
                        nav_button_previous: {
                          width: "44px",
                        },
                        nav_button_next: {
                          width: "44px",
                        },
                        caption: {
                          textTransform: "capitalize",
                        },
                      }}
                    />
                    )}
                  </div>
                  {date && (
                    <div className="flex gap-3 overflow-auto py-6 px-page border-t border-solid border-secondary [&::-webkit-scrollbar]:hidden">
                      {timeList.map((time) => (
                        <Button onClick={() => handleHourClick(time)} variant={hour === time ? "default" : "outline"} className="rounded-full" key={time}>
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="py-6 px-page border-t border-solid border-secondary">
                    <Card>
                      <CardContent className="p-3 gap-3 flex flex-col">
                        <div className="flex justify-between">
                          <h2 className="font-bold">{service.name}</h2>
                          <h3 className="font-bold text-body">{" "}</h3>
                        </div>
                        {date && (
                          <div className="flex justify-between">
                            <h3 className="text-muted-foreground text-body">Data</h3>
                            <h4 className="text-body ">{format(date, "dd 'de' MMMM", { locale: ptBR })}</h4>
                          </div>
                        )}
                        {hour && (
                          <div className="flex justify-between">
                            <h3 className="text-muted-foreground text-body">Horário</h3>
                            <h4 className="text-body ">{hour}</h4>
                          </div>
                        )}
                        {hour && (
                          <div className="flex justify-between">
                            <h3 className="text-muted-foreground text-body">Barbearia</h3>
                            <h4 className="text-body ">{barbershop.name}</h4>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <SheetFooter className="px-page">
                    <Button onClick={handleBookingSubmit} disabled={!hour || !date || submitIsLoading}>
                      {submitIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar reserva
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceItem;





















































































































































































































































































































































































































































































