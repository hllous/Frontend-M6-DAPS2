// PROTOTIPO DESCARTABLE (#849, fase 1). Se borra al implementar la variante elegida.
// Parte de las fixtures de indicadores; lo que las fixtures no traen (series semanales,
// reparto por zona de algunas señales, valores del período anterior) es de ejemplo.
import {
  complianceIndicatorFixture as compliance,
  coverageIndicatorFixture as coverage,
  incidentsIndicatorFixture as incidents,
} from "@/lib/indicator-fixtures";

export type PeriodId = "week" | "month" | "quarter";
export const PERIODS: Array<{ id: PeriodId; label: string; long: string; factor: number }> = [
  { id: "week", label: "Semana", long: "esta semana", factor: 0.25 },
  { id: "month", label: "Mes", long: "este mes", factor: 1 },
  { id: "quarter", label: "Trimestre", long: "este trimestre", factor: 3 },
];

export type SignalSource = {
  id: string;
  label: string;
  /** Frase en lenguaje llano que dice qué significa el número. */
  meaning: string;
  value: number;
  previous: number;
  /** Qué sentido empeora el número. */
  worse: "up" | "down";
  goal?: string;
  href: string;
  linkLabel: string;
  zones: Array<{ name: string; value: number }>;
  weekly: number[];
};

const COVERAGE_META = coverage.targets?.coveragePct?.value ?? 95;
const COMPLIANCE_META = compliance.targets?.compliancePct?.value ?? 90;
const pct = (n: number) => n.toLocaleString("es-AR");
const zoneNames = coverage.byZone.map((zone) => zone.name);
const zoneValues = (values: number[]) => zoneNames.map((name, index) => ({ name, value: values[index] ?? 0 }));

export const SIGNAL_SOURCES: SignalSource[] = [
  {
    id: "not-serviced",
    label: "Servicios sin realizar",
    meaning: "Servicios programados que no se hicieron en el período.",
    value: coverage.totals.notServiced,
    previous: 20,
    worse: "up",
    goal: `Cobertura ${pct(coverage.totals.coveragePct)} % · meta ${COVERAGE_META} %`,
    href: "/app?destination=services&status=NOT_SERVICED",
    linkLabel: "Ver servicios sin realizar",
    zones: zoneValues(coverage.byZone.map((zone) => zone.notServiced)),
    weekly: [3, 4, 2, 4, 3, 3, 2, 3],
  },
  {
    id: "late",
    label: "Servicios fuera de horario",
    meaning: "Servicios terminados después del horario previsto.",
    value: compliance.finished.late,
    previous: 40,
    worse: "up",
    goal: `A tiempo ${pct(compliance.finished.onTimePct)} % · meta ${COMPLIANCE_META} %`,
    href: "/app?destination=services&status=COMPLETED&late=true",
    linkLabel: "Ver servicios fuera de horario",
    zones: zoneValues([8, 14, 18, 6]),
    weekly: [4, 5, 5, 6, 6, 7, 6, 7],
  },
  {
    id: "overflow",
    label: "Contenedores desbordados",
    meaning: "Contenedores que hoy están llenos y sin vaciar.",
    value: incidents.containers.byStatus.find((item) => item.status === "OVERFLOWED")?.count ?? 0,
    previous: 16,
    worse: "up",
    href: "/app/catalog/containers?status=OVERFLOWED",
    linkLabel: "Ver contenedores desbordados",
    zones: zoneValues(incidents.containers.byZone.map((zone) => zone.overflowed).concat(0)),
    weekly: [3, 2, 2, 1, 2, 1, 1, 2],
  },
  {
    id: "overdue-reports",
    label: "Denuncias vencidas",
    meaning: "Denuncias abiertas que ya pasaron su plazo de resolución.",
    value: (incidents.reports.overdue?.overdue ?? 0),
    previous: 3,
    worse: "up",
    goal: `Plazo de ${incidents.reports.deadlineBusinessDays} días hábiles`,
    href: "/app?destination=environment&status=RECEIVED&status=UNDER_REVIEW&overdue=true",
    linkLabel: "Ver denuncias vencidas",
    zones: zoneValues([0, 1, 1, 0]),
    weekly: [0, 1, 0, 1, 1, 0, 1, 1],
  },
  {
    id: "risk-trees",
    label: "Árboles con riesgo alto",
    meaning: "Árboles con riesgo alto o crítico que esperan una intervención.",
    value: (incidents.trees?.byRiskLevel ?? []).filter((item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL").reduce((sum, item) => sum + item.count, 0),
    previous: 12,
    worse: "up",
    href: "/app/catalog/trees?riskLevel=HIGH&riskLevel=CRITICAL",
    linkLabel: "Ver árboles con riesgo alto",
    zones: zoneValues([5, 2, 3, 2]),
    weekly: [2, 1, 2, 1, 2, 1, 2, 1],
  },
];

export type Signal = SignalSource & {
  direction: "worse" | "better" | "same";
  change: number;
  changePct: number;
};

export function buildSignals(period: PeriodId): Signal[] {
  const factor = PERIODS.find((item) => item.id === period)?.factor ?? 1;
  const scale = (n: number) => Math.round(n * factor);
  const signals = SIGNAL_SOURCES.map((source) => {
    const value = scale(source.value);
    const previous = scale(source.previous);
    const change = value - previous;
    const isWorse = source.worse === "up" ? change > 0 : change < 0;
    const direction: Signal["direction"] = change === 0 ? "same" : isWorse ? "worse" : "better";
    return {
      ...source,
      value,
      previous,
      zones: source.zones.map((zone) => ({ ...zone, value: scale(zone.value) })),
      direction,
      change,
      changePct: previous === 0 ? 0 : Math.round((change / previous) * 100),
    } satisfies Signal;
  });
  const rank = { worse: 0, same: 1, better: 2 } as const;
  return signals.sort((a, b) => rank[a.direction] - rank[b.direction] || Math.abs(b.changePct) - Math.abs(a.changePct));
}

export const WEEK_LABELS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
export const COVERAGE_TREND = [78.4, 79.9, 80.8, 80, 81.5, 82, 81.2, 82.2].map((value, index) => ({ week: WEEK_LABELS[index], value }));
export const COVERAGE_GOAL = COVERAGE_META;
export const LATE_TREND = [4, 5, 5, 6, 6, 7, 6, 7].map((value, index) => ({ week: WEEK_LABELS[index], value }));

export const ZONE_DETAIL = coverage.byZone.map((zone, index) => ({
  name: zone.name,
  coverage: zone.coveragePct,
  notServiced: zone.notServiced,
  overflowed: incidents.containers.byZone[index]?.overflowed ?? 0,
}));

export const UPDATED_AT = "Actualizado hoy a las 09:40";

export const VARIANTS = [
  { id: "a", label: "A · Lista", note: "Lista ordenada por urgencia. Inspirada en Stripe, Sentry y Linear." },
  { id: "b", label: "B · Cuadrícula y zonas", note: "Tarjetas con evolución y un panel de zonas. Inspirada en Vercel, Calgary 311 y el mapa 311 de DC." },
  { id: "c", label: "C · Informe de hoy", note: "Una columna con lo que hay que atender hoy. Inspirada en Cambridge y Toronto 311." },
] as const;
export type VariantId = (typeof VARIANTS)[number]["id"];

