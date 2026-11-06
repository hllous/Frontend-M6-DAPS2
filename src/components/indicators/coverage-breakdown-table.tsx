"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, TriangleAlert } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { todayInArgentina } from "@/lib/argentina-date";
import { coverageRowsToCsv, defaultIndicatorTarget, hasNumericThreshold, isCoverageBelowTarget, type IndicatorPeriod, type IndicatorPoint, type IndicatorTarget } from "@/lib/indicators";

import { formatIndicatorNumber } from "./number-format";
import styles from "./coverage-breakdown-table.module.css";

const TOP = 10;

// Estados de Servicios que corresponden a cada tramo. La cobertura cuenta objetivos y la lista cuenta servicios: los totales pueden no coincidir.
const STATES = [
  { key: "Atendidos", className: "served", statuses: ["COMPLETED"] },
  { key: "Parciales", className: "partial", statuses: ["PARTIALLY_COMPLETED"] },
  { key: "No atendidos", className: "missed", statuses: ["CANCELLED", "SUSPENDED"] },
  { key: "Pendientes", className: "pending", statuses: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
] as const;

type LinkDimension = "zone" | "serviceType";

/** Lista de Servicios de un tramo: mismo tipo o zona, fechas exactas del período y los estados del tramo. «Pendientes» llega hasta hoy: lo futuro es «Programado a futuro». */
function segmentHref(state: Pick<(typeof STATES)[number], "key" | "statuses">, dimension: LinkDimension, id: string, period: IndicatorPeriod) {
  const to = state.key === "Pendientes" && period.to > todayInArgentina() ? todayInArgentina() : period.to;
  const params = [...state.statuses.map((status) => `status=${status}`), `${dimension}=${encodeURIComponent(id)}`, `from=${period.from}`, `to=${to}`];
  return `/app?destination=services&${params.join("&")}`;
}

type Row = { id: string; name: string; scheduled: number; upcoming?: number; lowSample: boolean; counts: Record<string, number>; pct: number };

function toRow(point: IndicatorPoint): Row {
  const detail = (label: string) => point.details?.find((item) => item.label === label)?.value ?? 0;
  const upcoming = point.details?.find((item) => item.label === "Programado a futuro")?.value ?? undefined;
  return { id: point.id, name: point.label, scheduled: detail("Programados"), upcoming, lowSample: point.lowSample ?? false, counts: Object.fromEntries(STATES.map(({ key }) => [key, detail(key)])), pct: point.value };
}

const numeric = (id: string) => (a: { getValue: (id: string) => unknown }, b: { getValue: (id: string) => unknown }) => Number(a.getValue(id)) - Number(b.getValue(id));

const percentText = (value: number) => `${formatIndicatorNumber(value, { maximumFractionDigits: 1 })} %`;

function StackedBar({ row, target, dimension, period }: { row: Row; target: IndicatorTarget; dimension: LinkDimension; period: IndicatorPeriod }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const closedAt = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeWithEscape = (event: { key: string }) => {
    if (event.key !== "Escape") return;
    closedAt.current = Date.now();
    setOpen(false);
    triggerRef.current?.focus();
  };
  if (row.scheduled === 0) return <span className={styles.noScheduled}>Sin programados</span>;
  const total = STATES.reduce((sum, { key }) => sum + row.counts[key], 0);
  const segments = STATES.map((state) => ({ ...state, count: row.counts[state.key], pct: total === 0 ? 0 : (row.counts[state.key] / total) * 100 }));
  return <div className={styles.barCell}>
    <Popover open={open} onOpenChange={(next) => { if (!next) closedAt.current = Date.now(); setOpen(next); }}>
      <PopoverTrigger
        ref={triggerRef}
        openOnHover
        onKeyDown={closeWithEscape}
        delay={120}
        closeDelay={150}
        className={styles.barTrigger}
        aria-label={`Porcentajes de ${row.name}`}
        onFocus={(event) => {
          // Con teclado el foco abre el cuadro; con el mouse lo abre el hover o el clic.
          let keyboard = true;
          try { keyboard = event.currentTarget.matches(":focus-visible"); } catch { /* sin :focus-visible */ }
          // Si el cuadro acaba de cerrarse (Escape), el foco vuelve a la barra sin reabrirlo.
          if (keyboard && Date.now() - closedAt.current > 400) setOpen(true);
        }}
        onBlur={(event) => { if (!popupRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      >
        <span aria-hidden="true" className={styles.bar}>
          {segments.map(({ key, className, count }) => count > 0 ? <span key={key} className={styles[className]} style={{ flexGrow: count }} /> : null)}
          {hasNumericThreshold(target) ? <span className={styles.targetLine} style={{ left: `${target.value}%` }} /> : null}
        </span>
      </PopoverTrigger>
      <PopoverContent ref={popupRef} onKeyDown={closeWithEscape} initialFocus={false} align="start" className={styles.popup} aria-label={`Cobertura de ${row.name}`}>
        <PopoverTitle className={styles.popupTitle}>{row.name}</PopoverTitle>
        <div aria-hidden="true" className={styles.bigBar}>
          {segments.map((state) => state.count > 0 ? <Link key={state.key} tabIndex={-1} href={segmentHref(state, dimension, row.id, period)} className={styles[state.className]} style={{ flexGrow: state.count }} /> : null)}
          {hasNumericThreshold(target) ? <span className={styles.targetLine} style={{ left: `${target.value}%` }} /> : null}
        </div>
        <ul className={styles.popupList}>
          {segments.map((state) => <li key={state.key}>
            {state.count > 0
              ? <Link className={styles.popupRow} href={segmentHref(state, dimension, row.id, period)}><span aria-hidden className={`${styles.swatch} ${styles[state.className]}`} />{state.key}<strong>{percentText(state.pct)}</strong><span className={styles.popupAction}>Ver servicios</span></Link>
              : <span className={styles.popupRow} data-empty><span aria-hidden className={`${styles.swatch} ${styles[state.className]}`} />{state.key}<strong>{percentText(0)}</strong></span>}
          </li>)}
        </ul>
      </PopoverContent>
    </Popover>
    <span className={styles.pct}>{formatIndicatorNumber(row.pct, { maximumFractionDigits: 1 })} %</span>
  </div>;
}

/** Cobertura por zona o por tipo: tabla ordenable con barra apilada por fila (alto fijo) y cantidades. */
export function CoverageBreakdownTable({ points, nameHeading, noun, title, initialDirection, period, target = defaultIndicatorTarget("coverage"), limit = TOP, selectedId, onSelect, mapHref, linkDimension }: { points: IndicatorPoint[]; nameHeading: string; noun: string; title: string; initialDirection: "asc" | "desc"; period: IndicatorPeriod; target?: IndicatorTarget; limit?: number; selectedId?: string; onSelect: (id: string) => void; mapHref?: string; linkDimension?: LinkDimension }) {
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const data = useMemo(() => points.map(toRow), [points]);
  const columns = useMemo<DataTableColumn<Row>[]>(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: nameHeading,
      sortFn: "text",
      meta: { label: nameHeading },
      cell: ({ row }) => <div className={styles.nameCell}><Button type="button" variant={selectedId === row.original.id ? "secondary" : "ghost"} size="sm" className={styles.nameButton} aria-pressed={selectedId === row.original.id} onClick={() => onSelect(row.original.id)}>{row.original.name}</Button>{row.original.lowSample ? <span className={styles.lowSample}><span className="sr-only">. </span>Muestra baja</span> : null}</div>,
    },
    { id: "targetStatus", accessorFn: (row) => isCoverageBelowTarget(row.scheduled, row.pct, target) ? "Bajo la meta" : "", header: "Estado", enableSorting: false, meta: { label: "Estado", cellClassName: styles.statusCell, headClassName: styles.statusCell }, cell: ({ row }) => isCoverageBelowTarget(row.original.scheduled, row.original.pct, target) ? <Badge variant="warning"><TriangleAlert aria-hidden="true" data-icon="inline-start" />Bajo la meta</Badge> : null },
    { id: "scheduled", accessorFn: (row) => row.scheduled, header: "Programados", sortFn: numeric("scheduled"), meta: { label: "Programados", cellClassName: styles.num, headClassName: styles.num }, cell: ({ row }) => formatIndicatorNumber(row.original.scheduled) },
    { id: "upcoming", accessorFn: (row) => row.upcoming, header: "Programado a futuro", sortFn: numeric("upcoming"), sortUndefined: "last", meta: { label: "Programado a futuro", cellClassName: styles.num, headClassName: styles.num }, cell: ({ row }) => row.original.upcoming === undefined ? "Sin dato" : formatIndicatorNumber(row.original.upcoming) },
    ...STATES.map(({ key }) => ({ id: key, accessorFn: (row: Row) => row.counts[key], header: key, sortFn: numeric(key), meta: { label: key, cellClassName: styles.num, headClassName: styles.num }, cell: ({ row }: { row: { original: Row } }) => formatIndicatorNumber(row.original.counts[key]) })),
    { id: "pct", accessorFn: (row) => row.scheduled === 0 ? undefined : row.pct, header: "Cobertura", sortFn: numeric("pct"), sortUndefined: "last", meta: { label: "Cobertura", cellClassName: styles.barColumn }, cell: ({ row }) => <StackedBar row={row.original} target={target} dimension={linkDimension ?? (nameHeading === "Zona" ? "zone" : "serviceType")} period={period} /> },
  ], [nameHeading, onSelect, selectedId, target, linkDimension, period]);
  const table = useDataTable({ data, columns, getRowId: (row) => row.id, initialState: { sorting: [{ id: "pct", desc: initialDirection === "desc" }] } });
  const sorting = table.state.sorting[0];
  const sortOptions = [
    { value: "name", label: nameHeading },
    { value: "scheduled", label: "Programados" },
    { value: "upcoming", label: "Programado a futuro" },
    ...STATES.map(({ key }) => ({ value: key, label: key })),
    { value: "pct", label: "Cobertura" },
  ];

  const sorted = table.getRowModel().rows;
  const visibleIds = new Set((showAll ? sorted : sorted.slice(0, limit)).map((row) => row.id));
  const hidden = sorted.length - visibleIds.size;

  function exportCsv() {
    const content = coverageRowsToCsv(sorted.map(({ original }) => ({
      name: original.name,
      scheduled: original.scheduled,
      served: original.counts.Atendidos,
      partial: original.counts.Parciales,
      notServiced: original.counts["No atendidos"],
      pending: original.counts.Pendientes,
      coveragePct: original.pct,
      upcoming: original.upcoming,
      lowSample: original.lowSample,
    })), nameHeading, target);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const csvKind = nameHeading === "Zona" ? "zonas" : "tipos";
    anchor.href = url;
    anchor.download = `cobertura-${csvKind}-${period.from}_${period.to}.csv`;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <div className={styles.wrap}>
    <ul className={styles.legend}>
      {STATES.map(({ key, className }) => <li key={key}><span aria-hidden className={`${styles.swatch} ${styles[className]}`} />{key}</li>)}
      {hasNumericThreshold(target) ? <li><span aria-hidden className={styles.targetSwatch} />Meta {target.direction === "min" ? "≥" : "≤"} {formatIndicatorNumber(target.value, { maximumFractionDigits: 1 })} %</li> : null}
    </ul>
    <div className={styles.mobileSort}>
      <span className={styles.mobileSortLabel}>Ordenar por</span>
      <Select items={sortOptions} value={sorting?.id ?? "pct"} onValueChange={(value) => {
        if (!value) return;
        table.setSorting([{ id: value, desc: value === sorting?.id ? sorting.desc : false }]);
      }}>
        <SelectTrigger aria-label="Ordenar por" className={styles.mobileSortSelect}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sortOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" aria-label={sorting?.desc ? "Cambiar a orden ascendente" : "Cambiar a orden descendente"} onClick={() => table.setSorting([{ id: sorting?.id ?? "pct", desc: !sorting?.desc }])}>
        {sorting?.desc ? <ArrowDown aria-hidden="true" data-icon="inline-start" /> : <ArrowUp aria-hidden="true" data-icon="inline-start" />}
        {sorting?.desc ? "Descendente" : "Ascendente"}
      </Button>
    </div>
    <div className={styles.scroll}>
      <DataTable
        table={table}
        id={tableId}
        container={false}
        className={styles.table}
        renderRow={(row) => visibleIds.has(row.id) ? <TableRow key={row.id} className={isCoverageBelowTarget(row.original.scheduled, row.original.pct, target) ? styles.belowTargetRow : undefined}>{row.getVisibleCells().map((cell) => cell.column.id === "name" ? <TableHead key={cell.id} scope="row" className={styles.rowHeader}><table.FlexRender cell={cell} /></TableHead> : <TableCell key={cell.id} data-label={cell.column.columnDef.meta?.label} className={cell.column.columnDef.meta?.cellClassName}><table.FlexRender cell={cell} /></TableCell>)}</TableRow> : null}
      ><TableCaption>{title}: {visibleIds.size} de {sorted.length}</TableCaption></DataTable>
    </div>
    <div className={styles.footer}>
      <span role="status">Mostrando {visibleIds.size} de {sorted.length}</span>
      {sorted.length > limit ? <Button type="button" variant="outline" size="sm" aria-label={`Mostrar todas las ${noun}`} aria-expanded={showAll} aria-controls={tableId} onClick={() => setShowAll((current) => !current)}>{showAll ? `Ver solo ${limit}` : `Ver todas (${hidden} más)`}</Button> : null}
      <Button type="button" variant="outline" size="sm" className={styles.exportButton} onClick={exportCsv}>Exportar CSV</Button>
      {mapHref ? <Link className={styles.mapLink} href={mapHref}>Ver en el mapa</Link> : null}
    </div>
  </div>;
}
