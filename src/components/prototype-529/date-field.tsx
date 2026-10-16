"use client";
/* eslint-disable no-restricted-syntax -- PROTOTYPE #529: the native date input is the variant under test */
// PROTOTYPE #529 (throwaway): date picker variants. The value stays YYYY-MM-DD, as sent to the BFF.
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { FormControl } from "@/components/ui/form-control";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useIsMobile, usePattern } from "./use-pattern";

type DateFieldProps = {
  id: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  onInvalid?: React.FormEventHandler<HTMLInputElement>;
};

export function DateField(props: DateFieldProps) {
  const variant = usePattern("date");
  const isMobile = useIsMobile();

  if (variant === null) {
    return (
      <FormControl
        id={props.id}
        type="date"
        value={props.value}
        min={props.min}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.invalid}
        aria-describedby={props.describedBy}
        onInvalid={props.onInvalid}
        required
        className="py-1.5 text-xs"
      />
    );
  }
  if (variant === "c" && isMobile) {
    return (
      <Input
        id={props.id}
        type="date"
        value={props.value}
        min={props.min}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.invalid}
        aria-describedby={props.describedBy}
        required
        className="h-10"
      />
    );
  }
  return <CalendarPicker {...props} asDrawer={variant === "b" && isMobile} />;
}

function CalendarPicker({ id, value, min, onChange, invalid, describedBy, asDrawer }: DateFieldProps & { asDrawer: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className="w-full justify-start font-normal"
    >
      <CalendarIcon data-icon="inline-start" />
      {selected ? format(selected, "dd/MM/yyyy") : "dd/mm/aaaa"}
    </Button>
  );
  const calendar = (
    <Calendar
      mode="single"
      locale={es}
      weekStartsOn={1}
      selected={selected}
      defaultMonth={selected}
      disabled={min ? { before: parseISO(min) } : undefined}
      onSelect={(day) => {
        if (!day) return;
        onChange(format(day, "yyyy-MM-dd"));
        setOpen(false);
      }}
    />
  );

  if (asDrawer) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger render={trigger} />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Fecha programada</DrawerTitle>
            <DrawerDescription className="sr-only">Elija el día del servicio</DrawerDescription>
          </DrawerHeader>
          <div className="flex justify-center pb-6">{calendar}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto p-0">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
