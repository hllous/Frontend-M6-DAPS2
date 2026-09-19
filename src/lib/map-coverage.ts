import type { CoverageIndicator } from "./indicators";
import type { OperationalZone, OperationalZoneGeometry } from "./operational-zones";

export type CoverageBand = "no-data" | "low" | "partial" | "good" | "high";

export const COVERAGE_BAND_LABELS: Record<CoverageBand, string> = {
  "no-data": "Sin datos",
  low: "Cobertura baja",
  partial: "Cobertura parcial",
  good: "Cobertura buena",
  high: "Cobertura alta",
};

export const COVERAGE_BAND_CLASSES: Record<CoverageBand, string> = {
  "no-data": "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]",
  low: "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]",
  partial: "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  good: "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)]",
  high: "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-success-fill)] text-[var(--color-success)] border-[var(--color-success-line)]",
};

export const COVERAGE_BAND_PATH_OPTIONS: Record<CoverageBand, { color: string; fillColor: string; fillOpacity: number }> = {
  "no-data": { color: "var(--color-border-strong)", fillColor: "var(--color-surface-subtle)", fillOpacity: 0.45 },
  low: { color: "var(--color-danger)", fillColor: "var(--color-danger-fill)", fillOpacity: 0.72 },
  partial: { color: "var(--color-warning)", fillColor: "var(--color-warning-fill)", fillOpacity: 0.72 },
  good: { color: "var(--color-info)", fillColor: "var(--color-info-fill)", fillOpacity: 0.72 },
  high: { color: "var(--color-success)", fillColor: "var(--color-success-fill)", fillOpacity: 0.72 },
};

export type CoverageZoneOverlay = {
  zoneId: string | null;
  zoneCode: string;
  zoneName: string;
  geometry: OperationalZoneGeometry;
  rate: number | null;
  note: string;
  band: CoverageBand;
};

export function coverageBandForRate(rate: number | null): CoverageBand {
  if (rate === null || !Number.isFinite(rate)) return "no-data";
  if (rate < 60) return "low";
  if (rate < 80) return "partial";
  if (rate < 90) return "good";
  return "high";
}

export function buildCoverageZoneOverlays(
  zones: OperationalZone[],
  coverage: CoverageIndicator | null,
): CoverageZoneOverlay[] {
  const zonePoints = coverage?.breakdowns.find((breakdown) => breakdown.id === "zones")?.points ?? [];
  const pointByZoneId = new Map(zonePoints.map((point) => [point.id, point]));

  return zones.map((zone) => {
    const zoneId = zone.zone?.id ?? null;
    const point = zoneId ? pointByZoneId.get(zoneId) : undefined;
    const rate = point?.value ?? null;

    return {
      zoneId,
      zoneCode: zone.code,
      zoneName: zone.name,
      geometry: zone,
      rate,
      note: point?.note ?? "Sin datos para el período",
      band: coverageBandForRate(rate),
    };
  });
}
