"use client";

import { useState, type ComponentProps } from "react";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

type TimePickerProps = {
  /** `HH:mm`, the same value a native time input holds; `""` until both parts are chosen. */
  value: string;
  onChange: (value: string) => void;
  /** Goes on the hour select. */
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
} & Pick<ComponentProps<"div">, "aria-describedby" | "aria-label" | "aria-labelledby">;

function splitTime(value: string) {
  const [hour = "", minute = ""] = value.split(":");
  return { hour, minute };
}

/** 24-hour time as two shadcn Selects: hours 00-23 and every minute 00-59. */
function TimePicker({ value, onChange, id, invalid, disabled, className, ...groupProps }: TimePickerProps) {
  const [parts, setParts] = useState(() => splitTime(value));
  const [formValue, setFormValue] = useState(value);

  // A value changed by the form (reset, load) replaces the parts; one we emitted ourselves does not.
  if (value !== formValue) {
    setFormValue(value);
    if (value !== (parts.hour && parts.minute ? `${parts.hour}:${parts.minute}` : "")) setParts(splitTime(value));
  }

  function choose(next: { hour: string; minute: string }) {
    setParts(next);
    const emitted = next.hour && next.minute ? `${next.hour}:${next.minute}` : "";
    setFormValue(emitted);
    if (emitted !== value) onChange(emitted);
  }

  return (
    <div role="group" data-slot="time-picker" className={cn("flex items-center gap-2", className)} {...groupProps}>
      <Select value={parts.hour || null} disabled={disabled} onValueChange={(hour) => choose({ ...parts, hour: String(hour) })}>
        <SelectTrigger id={id} aria-label="Hora" aria-invalid={invalid || undefined}>
          <SelectValue placeholder="hh" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <span aria-hidden="true">:</span>
      <Select value={parts.minute || null} disabled={disabled} onValueChange={(minute) => choose({ ...parts, minute: String(minute) })}>
        <SelectTrigger aria-label="Minutos" aria-invalid={invalid || undefined}>
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MINUTES.map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export { TimePicker };
export type { TimePickerProps };
