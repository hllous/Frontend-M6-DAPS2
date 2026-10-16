"use client";
// PROTOTYPE #529 (throwaway): long-list select variants. Values are the option ids, as sent to the BFF.
import { useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FormControl } from "@/components/ui/form-control";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { usePattern } from "./use-pattern";

export type ListOption = { value: string; label: string };

type ListSelectProps = {
  id: string;
  value: string;
  options: ListOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  busy?: boolean;
  required?: boolean;
};

const LONG_LIST = 8;

export function ListSelect(props: ListSelectProps) {
  const variant = usePattern("list");
  if (variant === "a") return <SearchableSelect {...props} />;
  if (variant === "b") return <NativeListSelect {...props} />;
  if (variant === "c") return <ComboboxSelect {...props} />;
  return (
    <FormControl
      as="select"
      id={props.id}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      required={props.required}
      aria-invalid={props.invalid}
      aria-describedby={props.describedBy}
      aria-busy={props.busy}
      className="text-xs"
    >
      {props.placeholder ? <option value="">{props.placeholder}</option> : null}
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </FormControl>
  );
}

function SearchableSelect({ id, value, options, onChange, placeholder, invalid, describedBy }: ListSelectProps) {
  const [query, setQuery] = useState("");
  const isLong = options.length > LONG_LIST;
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return needle ? options.filter((option) => option.label.toLocaleLowerCase("es").includes(needle)) : options;
  }, [options, query]);
  const items = useMemo(() => options.map((option) => ({ value: option.value, label: option.label })), [options]);

  return (
    <div className="flex flex-col gap-2">
      {isLong ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar"
          aria-label="Buscar en la lista"
        />
      ) : null}
      <Select items={items} value={value || null} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid} aria-describedby={describedBy}>
          <SelectValue placeholder={placeholder ?? "Seleccione"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {visible.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function NativeListSelect({ id, value, options, onChange, placeholder, invalid, describedBy, busy, required }: ListSelectProps) {
  return (
    <NativeSelect
      id={id}
      className="w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      aria-busy={busy}
    >
      {placeholder ? <NativeSelectOption value="">{placeholder}</NativeSelectOption> : null}
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

function ComboboxSelect({ id, value, options, onChange, placeholder, invalid, describedBy }: ListSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="truncate">{selected?.label ?? placeholder ?? "Seleccione"}</span>
        <ChevronsUpDownIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Buscar" />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
