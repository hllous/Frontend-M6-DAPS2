"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO_DATE = "yyyy-MM-dd";

function parseIsoDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = parse(value, ISO_DATE, new Date());
  return isValid(parsed) ? parsed : undefined;
}

/** The calendar opens with focus on the selected (or today's) day, so the arrow keys work at once. */
function FocusDayOnMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('button[data-day][tabindex="0"]')
      ?.focus();
  }, []);
  return <div ref={ref}>{children}</div>;
}

type DatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD`, the same value a native date input holds; `""` when empty. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
} & Pick<
  ComponentProps<"button">,
  "aria-describedby" | "aria-label" | "aria-labelledby" | "aria-required" | "onBlur"
>;

function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  invalid,
  disabled,
  placeholder = "dd/mm/aaaa",
  className,
  ...ariaProps
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const before = parseIsoDate(min);
  const after = parseIsoDate(max);
  const disabledDays = [
    before ? { before } : null,
    after ? { after } : null,
  ].filter((matcher) => matcher !== null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            data-slot="date-picker"
            data-empty={!selected || undefined}
            className={cn(
              "h-10 w-full justify-start px-3 font-normal data-[empty]:text-muted-foreground [@media(max-width:760px)]:h-12 [@media(max-width:760px)]:text-base",
              className,
            )}
            {...ariaProps}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selected ? format(selected, "dd/MM/yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <FocusDayOnMount>
          <Calendar
            mode="single"
          required
            locale={es}
            weekStartsOn={1}
            labels={{
              labelPrevious: () => "Mes anterior",
              labelNext: () => "Mes siguiente",
            }}
            selected={selected}
            defaultMonth={selected}
            disabled={disabledDays.length ? disabledDays : undefined}
            onSelect={(day) => {
              if (!day) return;
              onChange(format(day, ISO_DATE));
              setOpen(false);
            }}
          />
        </FocusDayOnMount>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
export type { DatePickerProps };
