"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { coverageRowsToCsv, INDICATOR_TARGETS, type IndicatorPeriod, type IndicatorPoint } from "@/lib/indicators";

import styles from "./coverage-breakdown-table.module.css";

const TOP = 10;
// ponytail: umbral local fijo; reemplazar por `lowSample` del backend (Backend #461) cuando llegue.
const LOW_SAMPLE_BELOW = 5;
const COVERAGE_TARGET = INDICATOR_TARGETS.coverage.target;

const STATES = [
  { key: "Atendidos", className: "served" },
  { key: "Parciales", className: "partial" },
  { key: "No atendidos", className: "missed" },
  { key: "Pendientes", className: "pending" },
] as const;

type Row = { id: string; name: string; scheduled: number; counts: Record<string, number>; pct: number };

const int = new Intl.NumberFormat("es-AR");
const pctFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function toRow(point: IndicatorPoint): Row {
  const detail = (label: string) => point.details?.find((item) => item.label === label)?.value ?? 0;
  return { id: point.id, name: point.label, scheduled: detail("Programados"), counts: Object.fromEntries(STATES.map(({ key }) => [key, detail(key)])), pct: point.value };
}

function isBelowTarget(row: Row) {
  return row.scheduled > 0 && row.pct < COVERAGE_TARGET.value;
}

const numeric = (id: string) => (a: { getValue: (id: string) => unknown }, b: { getValue: (id: string) => unknown }) => Number(a.getValue(id)) - Number(b.getValue(id));

function StackedBar({ row }: { row: Row }) {
  // Los conteos ya están en las columnas: la barra es solo apoyo visual y no se lee por separado.
  if (row.scheduled === 0) return <span className={styles.noScheduled}>Sin programados</span>;
  return <div className={styles.barCell}>
    <div aria-hidden="true" className={styles.bar}>
      {STATES.map(({ key, className }) => row.counts[key] > 0 ? <span key={key} className={styles[className]} style={{ flexGrow: row.counts[key] }} /> : null)}
      <span className={styles.targetLine} style={{ left: `${COVERAGE_TARGET.value}%` }} />
    </div>
    <span className={styles.pct}>{pctFormat.format(row.pct)} %</span>
  </div>;
}

/** Cobertura por zona o por tipo: tabla ordenable con barra apilada por fila (alto fijo) y cantidades. */
export function CoverageBreakdownTable({ points, nameHeading, noun, title, initialDirection, period, limit = TOP, selectedId, onSelect, mapHref }: { points: IndicatorPoint[]; nameHeading: string; noun: string; title: string; initialDirection: "asc" | "desc"; period: IndicatorPeriod; limit?: number; selectedId?: string; onSelect: (id: string) => void; mapHref?: string }) {
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
      cell: ({ row }) => <div className={styles.nameCell}><Button type="button" variant={selectedId === row.original.id ? "secondary" : "ghost"} size="sm" className={styles.nameButton} aria-pressed={selectedId === row.original.id} onClick={() => onSelect(row.original.id)}>{row.original.name}</Button>{row.original.scheduled > 0 && row.original.scheduled < LOW_SAMPLE_BELOW ? <span className={styles.lowSample}><span className="sr-only">. </span>Pocos programados</span> : null}</div>,
    },
    { id: "targetStatus", accessorFn: (row) => isBelowTarget(row) ? "Bajo la meta" : "", header: "Estado", enableSorting: false, meta: { label: "Estado", cellClassName: styles.statusCell, headClassName: styles.statusCell }, cell: ({ row }) => isBelowTarget(row.original) ? <Badge variant="warning"><TriangleAlert aria-hidden="true" data-icon="inline-start" />Bajo la meta</Badge> : null },
    { id: "scheduled", accessorFn: (row) => row.scheduled, header: "Programados", sortFn: numeric("scheduled"), meta: { cellClassName: styles.num, headClassName: styles.num }, cell: ({ row }) => int.format(row.original.scheduled) },
    ...STATES.map(({ key }) => ({ id: key, accessorFn: (row: Row) => row.counts[key], header: key, sortFn: numeric(key), meta: { cellClassName: styles.num, headClassName: styles.num }, cell: ({ row }: { row: { original: Row } }) => int.format(row.original.counts[key]) })),
    { id: "pct", accessorFn: (row) => row.scheduled === 0 ? undefined : row.pct, header: "Cobertura", sortFn: numeric("pct"), sortUndefined: "last", meta: { cellClassName: styles.barColumn }, cell: ({ row }) => <StackedBar row={row.original} /> },
  ], [nameHeading, onSelect, selectedId]);
  const table = useDataTable({ data, columns, getRowId: (row) => row.id, initialState: { sorting: [{ id: "pct", desc: initialDirection === "desc" }] } });

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
    })), nameHeading);
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
      <li><span aria-hidden className={styles.targetSwatch} />Meta {COVERAGE_TARGET.comparator} {int.format(COVERAGE_TARGET.value)} {COVERAGE_TARGET.unit}</li>
    </ul>
    <div className={styles.scroll}>
      <DataTable
        table={table}
        id={tableId}
        container={false}
        className={styles.table}
        renderRow={(row) => visibleIds.has(row.id) ? <TableRow key={row.id} className={isBelowTarget(row.original) ? styles.belowTargetRow : undefined}>{row.getVisibleCells().map((cell) => cell.column.id === "name" ? <TableHead key={cell.id} scope="row" className={styles.rowHeader}><table.FlexRender cell={cell} /></TableHead> : <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}><table.FlexRender cell={cell} /></TableCell>)}</TableRow> : null}
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
