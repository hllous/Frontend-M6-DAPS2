"use client";

import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicZone } from "@/lib/public-services";

type ZonePickerProps = {
  zones: readonly PublicZone[];
  /** Id de la zona elegida; `undefined` si todavía no eligió. */
  value: string | undefined;
  onChange: (zoneId: string) => void;
  disabled?: boolean;
};

/** Selector de zona de la sección pública. Lo comparten "Servicios" y "Puntos verdes". */
export function ZonePicker({ zones, value, onChange, disabled }: ZonePickerProps) {
  const id = useId();
  const items = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]));

  return (
    <Field>
      <FieldLabel htmlFor={id}>Tu zona</FieldLabel>
      <Select
        items={items}
        value={value ?? null}
        onValueChange={(next) => next && onChange(next)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Elegí tu zona" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
