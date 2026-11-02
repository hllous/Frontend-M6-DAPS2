import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";

export type IndicatorVariationDirection = "min" | "max" | "down";
export type IndicatorVariationUnitKind = "percentage-points" | "days" | "count";

/**
 * Reusable comparison shown in an indicator summary. `delta` is supplied by
 * the backend; direction only determines whether an increase or decrease is
 * better. Previous dates remain visible so the comparison needs no tooltip.
 */
export type IndicatorVariationProps = {
  id?: string;
  delta: number | null | undefined;
  unitKind: IndicatorVariationUnitKind;
  direction?: IndicatorVariationDirection;
  previousPeriod?: { from: string; to: string };
};

const unitLabels: Record<IndicatorVariationUnitKind, string> = {
  "percentage-points": "p. p.",
  days: "días",
  count: "unidades",
};

function formatDelta(value: number, unitKind: IndicatorVariationUnitKind) {
  const maximumFractionDigits = unitKind === "count" ? 0 : 1;
  const amount = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits,
    signDisplay: value === 0 ? "never" : "always",
  }).format(value);
  const unitLabel = unitKind === "count" && Math.abs(value) === 1 ? "unidad" : unitLabels[unitKind];

  return `${amount} ${unitLabel}`;
}

function comparisonLabel(delta: number, direction?: IndicatorVariationDirection) {
  if (delta === 0) return "Sin cambios";
  if (direction === undefined) return "Variación";

  const isBetter = direction === "min" ? delta > 0 : delta < 0;
  return isBetter ? "Mejor" : "Peor";
}

export function IndicatorVariation({ id, delta, unitKind, direction, previousPeriod }: IndicatorVariationProps) {
  const previousDates = previousPeriod
    ? `Período anterior: ${formatArgentinaCalendarDate(previousPeriod.from)} – ${formatArgentinaCalendarDate(previousPeriod.to)}`
    : null;

  if (delta === null || delta === undefined) {
    return <span className="flex w-full min-w-0 flex-col items-start gap-1 whitespace-normal" id={id}>
      <span className="text-xs font-semibold text-muted-foreground">Sin datos del período anterior</span>
      {previousDates ? <span className="text-xs leading-snug text-muted-foreground">{previousDates}</span> : null}
    </span>;
  }

  const isUnchanged = delta === 0;
  const label = comparisonLabel(delta, direction);
  const variant = isUnchanged || direction === undefined ? "secondary" : label === "Mejor" ? "success" : "danger";
  const Icon = isUnchanged ? Minus : delta > 0 ? ArrowUp : ArrowDown;

  return <span className="flex w-full min-w-0 flex-col items-start gap-1 whitespace-normal" id={id}>
    <Badge className="h-auto min-h-6 py-1" variant={variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {formatDelta(delta, unitKind)}
      <span>{label}</span>
    </Badge>
    {previousDates ? <span className="text-xs leading-snug text-muted-foreground">{previousDates}</span> : null}
  </span>;
}
