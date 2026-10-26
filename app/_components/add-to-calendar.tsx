"use client";

import { useId, useState } from "react";
import { CalendarPlusIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "./ui/button";
import { googleCalendarUrl, icsPath } from "@/app/_lib/calendar";
import { cn } from "@/app/_lib/utils";

export interface AddToCalendarProps {
  date: string; // "yyyy-MM-dd" no fuso de São Paulo
  time: string; // "HH:mm"
  serviceId: string;
  serviceName: string;
  address: string;
  bookingsUrl: string;
}

// "Adicionar ao calendário" (Prompt 20): abre as duas opções, Google Agenda
// (link) e Apple/Outlook (arquivo .ics de /api/calendario).
const AddToCalendar = ({ date, time, serviceId, serviceName, address, bookingsUrl }: AddToCalendarProps) => {
  const [open, setOpen] = useState(false);
  const optionsId = useId();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 w-full"
        aria-expanded={open}
        aria-controls={optionsId}
        onClick={() => setOpen((value) => !value)}
      >
        <CalendarPlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
        Adicionar ao calendário
        <ChevronDownIcon className={cn("ml-2 h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </Button>
      <div id={optionsId} className={cn("grid-cols-2 gap-2", open ? "grid" : "hidden")}>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <a href={googleCalendarUrl({ date, time, serviceName, address, bookingsUrl })} target="_blank" rel="noopener noreferrer">
            Google Agenda
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <a href={icsPath(date, time, serviceId)}>Apple / Outlook</a>
        </Button>
      </div>
    </div>
  );
};

export default AddToCalendar;
