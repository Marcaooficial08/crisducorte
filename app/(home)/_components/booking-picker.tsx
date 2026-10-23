"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { fromZonedTime } from "date-fns-tz";
import Link from "next/link";
import { CalendarCheckIcon, CalendarXIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DayChip from "@/app/_components/day-chip";
import TimeSlot from "@/app/_components/time-slot";
import BookingCTA from "@/app/_components/booking-cta";
import EmptyState from "@/app/_components/empty-state";
import WhatsAppButton from "@/app/_components/whatsapp-button";
import AddToCalendar from "@/app/_components/add-to-calendar";
import SuccessCheck from "@/app/_components/success-check";
import { useMotion } from "@/app/_providers/motion";
import { Button } from "@/app/_components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { saveBooking } from "@/app/barbershop/[id]/_actions/save-booking";
import { BOOKING_ERROR_MESSAGES, clientBookingErrorCode, shouldReloadSlots } from "@/app/_lib/booking-errors";
import { DaySlots, TIME_ZONE } from "@/app/_lib/schedule";
import { track } from "@/app/_lib/track";
import { BOOKING_SUCCESS_EVENT } from "@/app/_lib/pwa/install-hint";
import {
  RESUME_CALLBACK_URL,
  RESUME_PARAM,
  RESUME_UNAVAILABLE_MESSAGE,
  saveBookingResume,
  takeBookingResume,
} from "@/app/_lib/booking-resume";
import { cn } from "@/app/_lib/utils";

export interface PickerService {
  id: string;
  name: string;
  price: number;
}

interface BookingPickerProps {
  barbershop: { id: string; name: string };
  services: PickerService[];
  days: DaySlots[]; // calculados no servidor; não vazio
  isAuthenticated: boolean;
  // WhatsAppButton (MEL-022): só com a flag NOTIFICACOES e telefone cadastrado na barbearia.
  whatsapp?: { phone: string; address: string } | null;
  // Notificações ligadas para este usuário (flag NOTIFICACOES): avisa que a confirmação foi por e-mail.
  emailConfirmation?: boolean;
  // "Adicionar ao calendário" (flag CALENDARIO): endereço da barbearia e link "Ver ou cancelar".
  calendar?: { address: string; bookingsUrl: string } | null;
}

interface BookingSuccess {
  date: string;
  dayLabel: string;
  time: string;
  serviceId: string;
  serviceName: string;
}

const WEEKDAY_NAMES: Record<string, string> = { Sex: "sexta", Sáb: "sábado" };

const formatPrice = (price: number) => Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

// Primeiro dia com horário livre (ou o primeiro, se todos lotados).
const firstFreeDay = (days: DaySlots[]) => (days.find((day) => day.freeCount > 0) ?? days[0]).date;

const weekdayName = (day: DaySlots) => WEEKDAY_NAMES[day.label.split(" ")[0]] ?? day.label;

// Escolha de dia e horário da home nova + Sheet de serviço e confirmação (spec §4.1).
const BookingPicker = ({
  barbershop,
  services,
  days,
  isAuthenticated,
  whatsapp,
  emailConfirmation = false,
  calendar,
}: BookingPickerProps) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => firstFreeDay(days));
  const [time, setTime] = useState<string>();
  const [serviceId, setServiceId] = useState(services[0]?.id);
  const [sheetIsOpen, setSheetIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<BookingSuccess>();
  // MOTION: a grade só anima depois de trocar de dia (nunca no primeiro carregamento, para não mexer no LCP).
  const [daySwitched, setDaySwitched] = useState(false);
  const resumeChecked = useRef(false);
  const motion = useMotion();

  const day = days.find((d) => d.date === selectedDate);
  // Cartão de sucesso só quando há algo nele além do "Reservado!" (sem isso, só o toast, como antes).
  const hasSuccessCard = !!whatsapp || emailConfirmation || !!calendar;
  const service = services.find((s) => s.id === serviceId);

  // Grade recarregada (router.refresh): o dia pode ter saído da lista e o horário pode ter sido tomado.
  useEffect(() => {
    const current = days.find((d) => d.date === selectedDate);
    if (!current) {
      setSelectedDate(firstFreeDay(days));
      setTime(undefined);
      return;
    }
    if (time && !current.slots.some((slot) => slot.time === time && !slot.booked)) {
      setTime(undefined);
    }
  }, [days, selectedDate, time]);

  // Volta do login (?resume=1, MEL-009): retoma a seleção salva antes do signIn, se o horário ainda estiver
  // livre na grade do servidor (que já segue a regra da agenda). Roda uma vez, só no navegador.
  useEffect(() => {
    if (resumeChecked.current) {
      return;
    }
    resumeChecked.current = true;
    if (new URLSearchParams(window.location.search).get(RESUME_PARAM) !== "1") {
      return;
    }
    const resume = takeBookingResume();
    router.replace("/", { scroll: false });
    if (!resume) {
      return;
    }

    const resumedDay = days.find((d) => d.date === resume.date);
    const stillFree = resumedDay?.slots.some((slot) => slot.time === resume.time && !slot.booked) ?? false;
    if (!resumedDay || !stillFree) {
      if (resumedDay) {
        setSelectedDate(resumedDay.date);
      }
      toast(RESUME_UNAVAILABLE_MESSAGE);
      return;
    }

    const resumedService = services.some((s) => s.id === resume.serviceId) ? resume.serviceId : services[0]?.id;
    setSelectedDate(resumedDay.date);
    setTime(resume.time);
    setServiceId(resumedService);
    // Com mais de 1 serviço abre o Sheet com o serviço marcado; com 1, o CTA fica pronto. Nunca confirma sozinho.
    if (isAuthenticated && services.length > 1) {
      setSheetIsOpen(true);
    }
  }, [days, services, isAuthenticated, router]);

  const selectDay = (date: string) => {
    if (date !== selectedDate) {
      setDaySwitched(true);
    }
    setSelectedDate(date);
    setTime(undefined);
    setSuccess(undefined);
  };

  const selectTime = (value: string) => {
    setTime(value);
    setSuccess(undefined);
  };

  const submit = async () => {
    if (!day || !time || !service) {
      return;
    }
    setSubmitting(true);
    try {
      if (!navigator.onLine) {
        toast(BOOKING_ERROR_MESSAGES.NETWORK);
        return;
      }
      const result = await saveBooking({
        serviceId: service.id,
        barbershopId: barbershop.id,
        date: fromZonedTime(`${day.date}T${time}:00`, TIME_ZONE).toISOString(),
      });

      if (!result.success) {
        track("booking_failed", { service: service.name, reason: result.code });
        toast(result.error);
        if (shouldReloadSlots(result.code)) {
          setSheetIsOpen(false);
          setTime(undefined);
          router.refresh();
        }
        return;
      }

      track("booking_confirmed", { service: service.name, weekday: day.label, hour: time });
      // Dica de instalação (PWA_INSTALL): reservou = pode oferecer o app, mesmo na 1ª visita.
      window.dispatchEvent(new Event(BOOKING_SUCCESS_EVENT));
      setSheetIsOpen(false);
      setTime(undefined);
      if (hasSuccessCard) {
        setSuccess({ date: day.date, dayLabel: day.label, time, serviceId: service.id, serviceName: service.name });
      }
      toast(`Reservado! ${day.label} às ${time}.`, {
        action: { label: "Visualizar", onClick: () => router.push("/bookings") },
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      const code = clientBookingErrorCode(error, navigator.onLine);
      track("booking_failed", { service: service.name, reason: code });
      toast(BOOKING_ERROR_MESSAGES[code]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCTAClick = () => {
    // Sessão vinda do servidor. Guarda a seleção para retomar depois do login (MEL-009).
    if (!isAuthenticated) {
      if (day && time && serviceId) {
        saveBookingResume({ serviceId, date: day.date, time });
      }
      track("login_from_booking", { service: service?.name ?? "" });
      signIn("google", { callbackUrl: RESUME_CALLBACK_URL });
      return;
    }
    track("booking_started", { service: service?.name ?? "" });
    if (services.length === 1) {
      submit();
      return;
    }
    setSheetIsOpen(true);
  };

  const otherDay = day && day.freeCount === 0 ? days.find((d) => d.date !== day.date && d.freeCount > 0) : undefined;

  return (
    <>
      <section aria-labelledby="escolha-dia" className="mt-6">
        <h2 id="escolha-dia" className="mb-3 text-label font-bold uppercase text-muted-foreground">
          Escolha o dia
        </h2>
        <div className="flex gap-3">
          {days.map((d) => (
            <DayChip key={d.date} label={d.label} freeCount={d.freeCount} selected={d.date === selectedDate} onSelect={() => selectDay(d.date)} />
          ))}
        </div>
      </section>

      {day && (
        <section aria-labelledby="horarios-livres" className="mt-6">
          <h2 id="horarios-livres" className="mb-3 text-label font-bold uppercase text-muted-foreground">
            Horários livres
          </h2>
          {/* key pelo dia: a troca de dia remonta a grade e a animação de entrada roda de novo. */}
          <div key={day.date} data-testid="slots-panel" className={cn(daySwitched && "fx:motion-safe:animate-slots-in")}>
            {day.freeCount === 0 ? (
              <EmptyState
                icon={CalendarXIcon}
                title={`Todos os horários de ${weekdayName(day)} já foram reservados.`}
                description={otherDay ? `Que tal ${weekdayName(otherDay)}?` : undefined}
                action={
                  otherDay && (
                    <Button variant="secondary" onClick={() => selectDay(otherDay.date)}>
                      Ver {weekdayName(otherDay)}
                    </Button>
                  )
                }
              />
            ) : (
              <div role="group" aria-label={`Horários de ${day.label}`} className="grid grid-cols-4 gap-2">
                {day.slots.map((slot) => (
                  <TimeSlot key={slot.time} time={slot.time} booked={slot.booked} selected={slot.time === time} onSelect={() => selectTime(slot.time)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-6">
        <BookingCTA dayLabel={time ? day?.label : undefined} time={time} loading={submitting && !sheetIsOpen} onClick={handleCTAClick} />
      </div>

      {/* Área de aviso sempre montada: leitores de tela anunciam o cartão que entra nela
          (uma área que já nasce preenchida costuma não ser anunciada). */}
      <div aria-live="polite" data-testid="booking-success-live">
        {success && hasSuccessCard && (
          <section
            aria-labelledby="reserva-sucesso"
            className="mt-4 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-accent/60 bg-accent/[0.08] p-4 fx:motion-safe:animate-card-in"
          >
            <p id="reserva-sucesso" className="flex items-center gap-2 font-bold">
              {motion ? <SuccessCheck /> : <CalendarCheckIcon className="h-5 w-5 text-accent" aria-hidden="true" />}
              Reservado! {success.dayLabel} às {success.time}.
            </p>
            {emailConfirmation && (
              <p className="text-body text-muted-foreground">
                Enviamos a confirmação para o seu e-mail. Se não encontrar, olhe no Spam e marque &apos;Não é spam&apos;.
              </p>
            )}
            {calendar && (
              <AddToCalendar
                date={success.date}
                time={success.time}
                serviceId={success.serviceId}
                serviceName={success.serviceName}
                address={calendar.address}
                bookingsUrl={calendar.bookingsUrl}
              />
            )}
            {whatsapp && (
              <WhatsAppButton
                phone={whatsapp.phone}
                address={whatsapp.address}
                serviceName={success.serviceName}
                date={success.date}
                time={success.time}
              />
            )}
            <Link href="/bookings" className="inline-flex min-h-11 items-center justify-center text-body font-bold text-accent-soft underline underline-offset-4">
              Ver meus agendamentos
            </Link>
          </section>
        )}
      </div>

      <Sheet open={sheetIsOpen} onOpenChange={setSheetIsOpen}>
        <SheetContent className="w-full overflow-auto p-0" aria-describedby={undefined}>
          <SheetHeader className="border-b border-solid border-secondary px-page py-6 text-left">
            <SheetTitle>Confirmar reserva</SheetTitle>
          </SheetHeader>

          <fieldset className="px-page py-6">
            <legend className="float-left mb-3 w-full text-label font-bold uppercase text-muted-foreground">Serviço</legend>
            <div className="clear-both flex flex-col gap-2">
              {services.map((s) => (
                <label key={s.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="servico"
                    value={s.id}
                    checked={s.id === serviceId}
                    onChange={() => setServiceId(s.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-4 py-2 transition-colors",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                      s.id === serviceId ? "border-accent bg-accent/[0.18]" : "border-border hover:bg-secondary",
                    )}
                  >
                    <span className="font-bold">{s.name}</span>
                    <span className="text-body text-accent-soft">{formatPrice(s.price)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {day && time && service && (
            <dl className="mx-page mb-6 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border p-4 text-body">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dia</dt>
                <dd>{day.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Horário</dt>
                <dd>{time}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Barbearia</dt>
                <dd>{barbershop.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valor</dt>
                <dd>{formatPrice(service.price)}</dd>
              </div>
            </dl>
          )}

          <SheetFooter className="px-page pb-6">
            <Button className="w-full" onClick={submit} disabled={!time || !service || submitting} aria-busy={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {submitting && motion ? "Reservando…" : "Confirmar reserva"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BookingPicker;
