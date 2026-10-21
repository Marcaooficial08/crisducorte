"use client";

import { cn } from "@/app/_lib/utils";

interface ChoiceGroupProps<T extends string | number> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 4;
}

// Grupo de opções (radio nativo, alvo de 44px), no visual do serviço da reserva manual.
const ChoiceGroup = <T extends string | number>({ legend, name, options, value, onChange, columns = 1 }: ChoiceGroupProps<T>) => (
  <fieldset>
    <legend className="float-left mb-3 w-full text-label font-bold uppercase text-muted-foreground">{legend}</legend>
    <div
      className={cn(
        "clear-both grid gap-2",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-2",
        columns === 4 && "grid-cols-4",
      )}
    >
      {options.map((option) => (
        <label key={option.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border px-3 py-2 text-center font-bold transition-colors",
              columns === 1 && "justify-start px-4",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              option.value === value ? "border-accent bg-accent/[0.18]" : "border-border hover:bg-secondary",
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

export default ChoiceGroup;
