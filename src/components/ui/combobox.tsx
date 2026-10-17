"use client";

import { useState, type ComponentProps } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ComboboxOption = { value: string; label: string };

type ComboboxProps = {
  id?: string;
  /** The chosen option's `value`; `""` when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Options are still loading. */
  busy?: boolean;
  className?: string;
} & Pick<ComponentProps<"button">, "aria-describedby" | "aria-label" | "aria-labelledby" | "onBlur">;

function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Elegí una opción",
  searchPlaceholder = "Buscar",
  emptyText = "Sin resultados",
  invalid,
  disabled,
  busy,
  className,
  ...ariaProps
}: ComboboxProps) {
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
            aria-invalid={invalid || undefined}
            aria-busy={busy || undefined}
            disabled={disabled}
            data-slot="combobox"
            data-empty={!selected || undefined}
            className={cn(
              "h-10 w-full justify-between px-3 font-normal data-[empty]:text-muted-foreground max-md:h-12 max-md:text-base",
              className,
            )}
            {...ariaProps}
          />
        }
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        {busy ? <Spinner data-icon="inline-end" /> : <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
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

export { Combobox };
export type { ComboboxOption, ComboboxProps };
