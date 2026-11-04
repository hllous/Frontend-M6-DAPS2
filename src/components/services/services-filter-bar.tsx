"use client";

import type { ReactNode } from "react";
import { ChevronDown, FilterX, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";
import { STATUS_LABEL, type ServiceStatus } from "@/lib/services";
import { cn } from "@/lib/utils";

import {
  activeFiltersLabel,
  communeSelection,
  toggleCommune,
  toggleInSet,
  type ZoneGroup,
} from "./services-filters";
import type { ColumnFilters } from "./services-table";

export type ServicesPeriod = "semana" | "mes" | "todo";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  period: ServicesPeriod;
  periodItems: Record<ServicesPeriod, string>;
  onPeriodChange: (period: ServicesPeriod) => void;
  /** Indicador de actualización junto al período. */
  periodStatus?: ReactNode;
  filters: ColumnFilters;
  onFiltersChange: (filters: ColumnFilters) => void;
  zoneGroups: ZoneGroup[];
  crewOptions: string[];
  activeCount: number;
  onClear: () => void;
  isNarrow: boolean;
  hidden?: boolean;
  /** Controles propios de la pantalla (p. ej. el editor de columnas) al final de la barra. */
  trailing?: ReactNode;
};

const STATUSES = Object.keys(STATUS_LABEL) as ServiceStatus[];

function Option({ label, checked, onChange, strong }: { label: string; checked: boolean; onChange: () => void; strong?: boolean }) {
  return (
    <Label className={cn("flex min-h-8 cursor-pointer items-center gap-2 text-sm font-normal", strong && "font-semibold")}>
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </Label>
  );
}

function Checklist({ legend, hideLegend, children, className }: { legend: string; hideLegend?: boolean; children: ReactNode; className?: string }) {
  return (
    <FieldSet className={cn("flex flex-col gap-0.5", className)}>
      <FieldLegend variant="label" className={cn(hideLegend && "sr-only")}>{legend}</FieldLegend>
      {children}
    </FieldSet>
  );
}

function StatusOptions({ filters, onFiltersChange, hideLegend }: Pick<FilterBarProps, "filters" | "onFiltersChange"> & { hideLegend?: boolean }) {
  return (
    <Checklist legend="Estado" hideLegend={hideLegend}>
      {STATUSES.map((status) => (
        <Option
          key={status}
          label={STATUS_LABEL[status]}
          checked={filters.statuses.has(status)}
          onChange={() => onFiltersChange({ ...filters, statuses: toggleInSet(filters.statuses, status) })}
        />
      ))}
    </Checklist>
  );
}

function ZoneOptions({ filters, onFiltersChange, zoneGroups, hideLegend }: Pick<FilterBarProps, "filters" | "onFiltersChange" | "zoneGroups"> & { hideLegend?: boolean }) {
  return (
    <Checklist legend="Comuna y barrio" hideLegend={hideLegend}>
      {zoneGroups.length === 0 ? <p className="text-sm text-muted-foreground">No hay zonas para elegir.</p> : null}
      {zoneGroups.map((group) => (
        <div key={group.key} className="flex flex-col">
          <Option
            strong
            label={group.label}
            checked={communeSelection(group, filters.zones) === "all"}
            onChange={() => onFiltersChange({ ...filters, zones: toggleCommune(filters.zones, group) })}
          />
          <div className="ml-6 flex flex-col">
            {group.zones.map((zone) => (
              <Option
                key={zone.id}
                label={zone.name}
                checked={filters.zones.has(zone.id)}
                onChange={() => onFiltersChange({ ...filters, zones: toggleInSet(filters.zones, zone.id) })}
              />
            ))}
          </div>
        </div>
      ))}
    </Checklist>
  );
}

function CrewOptions({ filters, onFiltersChange, crewOptions, hideLegend }: Pick<FilterBarProps, "filters" | "onFiltersChange" | "crewOptions"> & { hideLegend?: boolean }) {
  return (
    <Checklist legend="Cuadrilla" hideLegend={hideLegend}>
      {crewOptions.map((crew) => (
        <Option
          key={crew}
          label={crew}
          checked={filters.crews.has(crew)}
          onChange={() => onFiltersChange({ ...filters, crews: toggleInSet(filters.crews, crew) })}
        />
      ))}
    </Checklist>
  );
}

function FilterPopover({ label, count, children, wide }: { label: string; count: number; children: ReactNode; wide?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm" data-active={count > 0 || undefined}>
            {label}
            {count > 0 ? ` (${count})` : ""}
            <ChevronDown data-icon="inline-end" aria-hidden />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        aria-label={label}
        className={cn("max-h-[min(24rem,var(--available-height))] overflow-y-auto", wide ? "w-72" : "w-60")}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SearchField({ search, onSearchChange, className }: Pick<FilterBarProps, "search" | "onSearchChange"> & { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden />
      <Input
        type="search"
        value={search}
        maxLength={MAX_SEARCH_LENGTH}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar servicio, zona o cuadrilla…"
        aria-label="Buscar servicios"
        className="rounded-xl pl-8 pr-8 text-xs"
      />
      {search ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onSearchChange("")}
          aria-label="Borrar búsqueda"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

function PeriodField({ period, periodItems, onPeriodChange, periodStatus, id }: Pick<FilterBarProps, "period" | "periodItems" | "onPeriodChange" | "periodStatus"> & { id: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>Período</Label>
      <Select value={period} items={periodItems} onValueChange={(value) => onPeriodChange(value as ServicesPeriod)}>
        <SelectTrigger id={id} className="w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(Object.keys(periodItems) as ServicesPeriod[]).map((key) => (
              <SelectItem key={key} value={key}>{periodItems[key]}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {periodStatus}
    </div>
  );
}

/**
 * Una sola barra de filtros para el mapa y la tabla de Servicios (#854). En escritorio es una fila; en móvil se
 * reduce al botón «Filtros (n)», que abre una hoja con los mismos filtros.
 */
export function ServicesFilterBar(props: FilterBarProps) {
  const { search, onSearchChange, filters, onFiltersChange, zoneGroups, crewOptions, activeCount, onClear, isNarrow, hidden, trailing } = props;

  if (isNarrow) {
    return (
      <div
        role="search"
        aria-label="Filtros de servicios"
        hidden={hidden}
        data-services-filter-toolbar
        className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5"
      >
        <Sheet>
          <SheetTrigger
            render={
              <Button type="button" variant="outline" size="sm">
                <SlidersHorizontal data-icon="inline-start" aria-hidden />
                {`Filtros (${activeCount})`}
              </Button>
            }
          />
          <SheetContent side="bottom" className="max-h-[88dvh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Afectan a la vez el mapa y la lista de servicios.</SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
              <SearchField search={search} onSearchChange={onSearchChange} />
              <PeriodField {...props} id="services-period-sheet" />
              <StatusOptions filters={filters} onFiltersChange={onFiltersChange} />
              <ZoneOptions filters={filters} onFiltersChange={onFiltersChange} zoneGroups={zoneGroups} />
              <CrewOptions filters={filters} onFiltersChange={onFiltersChange} crewOptions={crewOptions} />
            </div>
            <SheetFooter className="flex-row justify-between border-t border-[var(--color-border)]">
              <Button type="button" variant="ghost" onClick={onClear} disabled={activeCount === 0}>
                <FilterX data-icon="inline-start" aria-hidden />
                Limpiar filtros
              </Button>
              <p role="status" aria-live="polite" className="self-center text-sm text-muted-foreground">
                {activeCount > 0 ? activeFiltersLabel(activeCount) : ""}
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {trailing}
      </div>
    );
  }

  return (
    <div
      role="search"
      aria-label="Filtros de servicios"
      hidden={hidden}
      data-services-filter-toolbar
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
    >
      <SearchField search={search} onSearchChange={onSearchChange} className="w-64 max-w-full" />
      <PeriodField {...props} id="services-period" />
      <FilterPopover label="Estado" count={filters.statuses.size}>
        <StatusOptions filters={filters} onFiltersChange={onFiltersChange} hideLegend />
      </FilterPopover>
      <FilterPopover label="Comuna y barrio" count={filters.zones.size} wide>
        <ZoneOptions filters={filters} onFiltersChange={onFiltersChange} zoneGroups={zoneGroups} hideLegend />
      </FilterPopover>
      <FilterPopover label="Cuadrilla" count={filters.crews.size}>
        <CrewOptions filters={filters} onFiltersChange={onFiltersChange} crewOptions={crewOptions} hideLegend />
      </FilterPopover>
      {activeCount > 0 ? (
        <>
          <span role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">{activeFiltersLabel(activeCount)}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="font-semibold text-[var(--color-action)]">
            <FilterX data-icon="inline-start" aria-hidden />
            Limpiar filtros
          </Button>
        </>
      ) : null}
      <div className="ml-auto flex items-center gap-2">{trailing}</div>
    </div>
  );
}
