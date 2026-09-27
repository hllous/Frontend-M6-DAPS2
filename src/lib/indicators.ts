import { z } from "zod";

import { todayInArgentina } from "./argentina-date";
import { CONTAINER_STATUS_LABELS } from "./containers";
import { ENVIRONMENTAL_REPORT_STATUS_LABELS, ENVIRONMENTAL_REPORT_TYPE_LABELS } from "./environmental-reports";
import { WASTE_TYPE_LABELS } from "./green-points";
import { NOT_SERVICED_REASON_LABEL } from "./services";
import { RISK_LEVEL_LABELS } from "./tree-surveys";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use una fecha con formato AAAA-MM-DD.");
const dateTimeSchema = z.string().datetime({ offset: true });

export const INVERTED_RANGE_MESSAGE = "La fecha «Desde» no puede ser posterior a «Hasta».";

export const indicatorQuerySchema = z.object({
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  zoneId: z.string().trim().min(1).optional(),
  serviceTypeId: z.string().trim().min(1).optional(),
}).strict().refine((query) => !query.from || !query.to || query.from <= query.to, {
  path: ["to"],
  message: INVERTED_RANGE_MESSAGE,
});
export type IndicatorQuery = z.infer<typeof indicatorQuerySchema>;

/** Mensaje de rango invertido si el error lo incluye; si no, el genérico de formato. */
export function indicatorQueryErrorMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues.some((issue) => issue.message === INVERTED_RANGE_MESSAGE)
    ? INVERTED_RANGE_MESSAGE
    : "Los filtros de indicadores no respetan el formato esperado.";
}

export type ResolvedIndicatorQuery = Required<Pick<IndicatorQuery, "from" | "to">> &
  Omit<IndicatorQuery, "from" | "to">;

const periodSchema = z.object({ from: calendarDateSchema, to: calendarDateSchema });
const count = z.number().finite().nonnegative();
const percent = z.number().finite().min(0).max(100);

// Los enums viajan como string, no como z.enum: un valor nuevo del backend debe
// mostrarse crudo en una etiqueta, no dejar el tablero entero en error.
function labelFor(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}

const coverageRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  scheduled: count,
  served: count,
  partial: count,
  notServiced: count,
  pending: count,
  coveragePct: percent,
});

export const coverageWireSchema = z.object({
  period: periodSchema,
  totals: z.object({ scheduled: count, served: count, partial: count, notServiced: count, pending: count, coveragePct: percent }),
  byZone: z.array(coverageRowSchema),
  byServiceType: z.array(coverageRowSchema),
});
export type CoverageWire = z.infer<typeof coverageWireSchema>;

export const complianceWireSchema = z.object({
  period: periodSchema,
  finished: z.object({ total: count, onTime: count, late: count, onTimePct: percent }),
  notServicedRanking: z.array(z.object({
    zoneId: z.string(),
    code: z.string(),
    name: z.string(),
    count,
    reasons: z.array(z.object({ reason: z.string().nullable(), count })),
  })),
});
export type ComplianceWire = z.infer<typeof complianceWireSchema>;

export const incidentsWireSchema = z.object({
  period: periodSchema,
  containers: z.object({
    byStatus: z.array(z.object({ status: z.string(), count })),
    byZone: z.array(z.object({ zoneId: z.string(), code: z.string(), name: z.string(), overflowed: count, damaged: count, total: count })),
  }),
  trees: z.object({ byRiskLevel: z.array(z.object({ riskLevel: z.string(), count })) }),
  reports: z.object({
    total: count,
    byType: z.array(z.object({ reportType: z.string(), count })),
    byStatus: z.array(z.object({ status: z.string(), count })),
    // null cuando no se cerró ningún reporte en el período.
    avgResolutionDays: z.number().finite().nonnegative().nullable(),
  }),
});
export type IncidentsWire = z.infer<typeof incidentsWireSchema>;

export const wasteWireSchema = z.object({
  period: periodSchema,
  totals: z.object({ weightKg: count, volumeM3: count, divertedKg: count, divertedPct: percent }),
  byWasteType: z.array(z.object({ wasteType: z.string(), weightKg: count, volumeM3: count })),
  byDisposalSite: z.array(z.object({ disposalSiteId: z.string(), code: z.string(), name: z.string(), siteType: z.string(), weightKg: count, volumeM3: count })),
  records: count,
});
export type WasteWire = z.infer<typeof wasteWireSchema>;

/** `value: null` = no hay base para calcular la métrica (p. ej. ningún reporte cerrado). */
export type IndicatorMetric = { value: number | null; label: string; unit: string };
export type IndicatorPointDetail = { label: string; value: number; unit: string };
export type IndicatorPoint = { id: string; label: string; value: number; unit: string; note?: string; details?: IndicatorPointDetail[]; tone?: "primary" | "success" | "warning" | "danger" };
export type IndicatorBreakdown = { id: string; title: string; description: string; points: IndicatorPoint[] };
export type IndicatorPeriod = { from: string; to: string };
export type IndicatorFreshness = { updatedAt: string };

export type CoverageIndicator = {
  family: "coverage";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};
export type ComplianceIndicator = {
  family: "compliance";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};
export type IncidentsIndicator = {
  family: "incidents";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  breakdowns: IndicatorBreakdown[];
};
export type WasteIndicator = {
  family: "waste";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};

export class IndicatorContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IndicatorContractError";
  }
}

export class IndicatorRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IndicatorRequestError";
    this.status = status;
  }
}

function formatCalendarDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function defaultIndicatorQuery(now = new Date()): ResolvedIndicatorQuery {
  const to = todayInArgentina(now);
  const from = new Date(`${to}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: formatCalendarDate(from), to };
}

export function resolveIndicatorQuery(query: IndicatorQuery = {}, now = new Date()): ResolvedIndicatorQuery {
  const parsed = indicatorQuerySchema.safeParse(query);
  if (!parsed.success) throw new IndicatorContractError(indicatorQueryErrorMessage(parsed.error), { cause: parsed.error });
  const defaults = defaultIndicatorQuery(now);
  return { ...defaults, ...parsed.data };
}

function queryString(query: IndicatorQuery, family: string) {
  const resolved = resolveIndicatorQuery(query);
  const params = new URLSearchParams({ from: resolved.from, to: resolved.to });
  if (family === "coverage" || family === "compliance") {
    if (resolved.zoneId) params.set("zoneId", resolved.zoneId);
    if (resolved.serviceTypeId) params.set("serviceTypeId", resolved.serviceTypeId);
  }
  return `?${params.toString()}`;
}

async function request(path: string) {
  let response: Response;
  try {
    response = await authenticatedFetch(path);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "indicators" });
    throw cause;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "indicators" });
    throw new IndicatorContractError("La respuesta de indicadores no es JSON válido.", { cause });
  }
  if (!response.ok) {
    const parsed = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]) }).safeParse(payload);
    if (!parsed.success) throw new IndicatorContractError("La respuesta de error de indicadores no respeta el contrato esperado.", { cause: parsed.error });
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
    throw new IndicatorRequestError(message, parsed.data.statusCode);
  }
  return payload;
}

const RISK_LEVEL_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];

function coveragePoints(rows: CoverageWire["byZone"]): IndicatorPoint[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    value: row.coveragePct,
    unit: "%",
    note: `${row.served} de ${row.scheduled} objetivos`,
    details: [
      { label: "Atendidos", value: row.served, unit: "objetivos" },
      { label: "Parciales", value: row.partial, unit: "objetivos" },
      { label: "No atendidos", value: row.notServiced, unit: "objetivos" },
      { label: "Pendientes", value: row.pending, unit: "objetivos" },
      { label: "Programados", value: row.scheduled, unit: "objetivos" },
    ],
  }));
}

function normalizeCoverage(wire: CoverageWire, readAt: string): CoverageIndicator {
  return {
    family: "coverage", period: wire.period, freshness: { updatedAt: readAt },
    primary: { value: wire.totals.coveragePct, label: "Cobertura de objetivos", unit: "%" },
    summaryMetrics: [
      { value: wire.totals.served, label: "Atendidos", unit: "objetivos" },
      { value: wire.totals.partial, label: "Parciales", unit: "objetivos" },
      { value: wire.totals.pending, label: "Pendientes", unit: "objetivos" },
      { value: wire.totals.scheduled, label: "Programados", unit: "objetivos" },
    ],
    breakdowns: [
      { id: "zones", title: "Cobertura por zona", description: "Objetivos atendidos sobre objetivos programados.", points: coveragePoints(wire.byZone) },
      { id: "service-types", title: "Cobertura por tipo de servicio", description: "Comparación de cobertura entre servicios.", points: coveragePoints(wire.byServiceType) },
    ],
  };
}

function normalizeCompliance(wire: ComplianceWire, readAt: string): ComplianceIndicator {
  const reasonLabel = (reason: string | null) => reason === null
    ? "Sin motivo registrado"
    : labelFor(NOT_SERVICED_REASON_LABEL, reason);
  return {
    family: "compliance", period: wire.period, freshness: { updatedAt: readAt },
    primary: { value: wire.finished.onTimePct, label: "Cumplimiento en fecha", unit: "%" },
    summaryMetrics: [
      { value: wire.finished.total, label: "Finalizados", unit: "servicios" },
      { value: wire.finished.onTime, label: "En fecha", unit: "servicios" },
      { value: wire.finished.late, label: "Demorados", unit: "servicios" },
    ],
    breakdowns: [
      { id: "completion", title: "Finalización en fecha", description: `${wire.finished.total} servicios finalizados en el período.`, points: [{ id: "on-time", label: "En fecha", value: wire.finished.onTime, unit: "servicios", tone: "success" }, { id: "delayed", label: "Demorados", value: wire.finished.late, unit: "servicios", tone: "warning" }] },
      { id: "unattended-zones", title: "Zonas sin atención", description: "Ranking de zonas no atendidas y motivos registrados.", points: wire.notServicedRanking.map((zone): IndicatorPoint => ({
        id: zone.zoneId,
        label: zone.name,
        value: zone.count,
        unit: "objetivos",
        note: zone.reasons.map((item) => reasonLabel(item.reason)).join(" · ") || "Sin motivo registrado",
        details: zone.reasons.map((item) => ({ label: reasonLabel(item.reason), value: item.count, unit: "objetivos" })),
        tone: "warning",
      })) },
    ],
  };
}

function normalizeIncidents(wire: IncidentsWire, readAt: string): IncidentsIndicator {
  const riskLevels = [...wire.trees.byRiskLevel].sort((a, b) => RISK_LEVEL_ORDER.indexOf(a.riskLevel) - RISK_LEVEL_ORDER.indexOf(b.riskLevel));
  return {
    family: "incidents", period: wire.period, freshness: { updatedAt: readAt },
    primary: { value: wire.reports.avgResolutionDays, label: "Resolución media de reportes", unit: "días" },
    breakdowns: [
      { id: "containers", title: "Contenedores por zona", description: "Instantánea actual de incidentes por desborde y daño; valores en incidentes.", points: wire.containers.byZone.map((zone): IndicatorPoint => ({
        id: zone.zoneId,
        label: zone.name,
        value: zone.overflowed + zone.damaged,
        unit: "incidentes",
        note: `${zone.overflowed} desbordes · ${zone.damaged} daños sobre ${zone.total} contenedores`,
        details: [{ label: "Desbordes", value: zone.overflowed, unit: "incidentes" }, { label: "Daños", value: zone.damaged, unit: "incidentes" }, { label: "Contenedores", value: zone.total, unit: "contenedores" }],
        tone: zone.overflowed + zone.damaged > 4 ? "danger" : "primary",
      })) },
      { id: "container-status", title: "Contenedores por estado", description: "Instantánea actual del parque de contenedores.", points: wire.containers.byStatus.map((item): IndicatorPoint => ({
        id: item.status,
        label: labelFor(CONTAINER_STATUS_LABELS, item.status),
        value: item.count,
        unit: "contenedores",
        tone: item.status === "ACTIVE" ? "success" : item.status === "OVERFLOWED" || item.status === "DAMAGED" ? "danger" : "warning",
      })) },
      { id: "tree-risk", title: "Riesgo de arbolado", description: "Inventario actual por nivel de riesgo; valores en árboles.", points: riskLevels.map((item): IndicatorPoint => ({
        id: item.riskLevel,
        label: labelFor(RISK_LEVEL_LABELS, item.riskLevel),
        value: item.count,
        unit: "árboles",
        tone: item.riskLevel === "CRITICAL" || item.riskLevel === "HIGH" ? "danger" : item.riskLevel === "NONE" ? "success" : "warning",
      })) },
      { id: "reports", title: "Reportes por tipo", description: `${wire.reports.total} reportes recibidos en el período; valores en reportes.`, points: wire.reports.byType.map((item) => ({
        id: item.reportType,
        label: labelFor(ENVIRONMENTAL_REPORT_TYPE_LABELS, item.reportType),
        value: item.count,
        unit: "reportes",
      })) },
      { id: "report-status", title: "Reportes por estado", description: "Reportes recibidos en el período, distribuidos por estado.", points: wire.reports.byStatus.map((item): IndicatorPoint => ({
        id: item.status,
        label: labelFor(ENVIRONMENTAL_REPORT_STATUS_LABELS, item.status),
        value: item.count,
        unit: "reportes",
        tone: item.status === "CLOSED" ? "success" : item.status === "RECEIVED" ? "danger" : "warning",
      })) },
    ],
  };
}

function normalizeWaste(wire: WasteWire, readAt: string): WasteIndicator {
  const massPoint = (id: string, label: string, weightKg: number, volumeM3: number): IndicatorPoint => ({
    id,
    label,
    value: weightKg,
    unit: "kg",
    note: `${volumeM3.toLocaleString("es-AR")} m³`,
    details: [{ label: "Metros cúbicos", value: volumeM3, unit: "m³" }],
  });
  return {
    family: "waste", period: wire.period, freshness: { updatedAt: readAt },
    primary: { value: wire.totals.divertedPct, label: "Desvío de relleno sanitario", unit: "%" },
    summaryMetrics: [
      { value: wire.totals.weightKg, label: "Peso registrado", unit: "kg" },
      { value: wire.totals.divertedKg, label: "Desviado del relleno", unit: "kg" },
      { value: wire.totals.volumeM3, label: "Volumen registrado", unit: "m³" },
    ],
    breakdowns: [
      { id: "types", title: "Residuos por tipo", description: `${wire.records} registros de disposición en el período.`, points: wire.byWasteType.map((item) => massPoint(item.wasteType, labelFor(WASTE_TYPE_LABELS, item.wasteType), item.weightKg, item.volumeM3)) },
      { id: "destinations", title: "Residuos por destino", description: "Kilogramos y metros cúbicos enviados a cada destino.", points: wire.byDisposalSite.map((item) => massPoint(item.disposalSiteId, item.name, item.weightKg, item.volumeM3)) },
    ],
  };
}

async function get<T>(family: string, query: IndicatorQuery, schema: z.ZodType<T>, normalize: (wire: T, readAt: string) => T extends CoverageWire ? CoverageIndicator : T extends ComplianceWire ? ComplianceIndicator : T extends IncidentsWire ? IncidentsIndicator : WasteIndicator, message: string) {
  const parsed = schema.safeParse(await request(`/api/indicators/${family}${queryString(query, family)}`));
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "indicators" });
    throw new IndicatorContractError(message, { cause: parsed.error });
  }
  // El backend calcula los indicadores en cada consulta y no devuelve una marca
  // de actualización, así que la frescura es el momento de la lectura.
  return normalize(parsed.data, new Date().toISOString());
}

export const indicatorsAdapter = {
  getCoverage(query: IndicatorQuery = {}) { return get("coverage", query, coverageWireSchema, normalizeCoverage, "La cobertura no respeta el contrato de indicadores."); },
  getCompliance(query: IndicatorQuery = {}) { return get("compliance", query, complianceWireSchema, normalizeCompliance, "El cumplimiento no respeta el contrato de indicadores."); },
  getIncidents(query: IndicatorQuery = {}) { return get("incidents", query, incidentsWireSchema, normalizeIncidents, "Las incidencias no respetan el contrato de indicadores."); },
  getWaste(query: IndicatorQuery = {}) { return get("waste", query, wasteWireSchema, normalizeWaste, "Los residuos no respetan el contrato de indicadores."); },
};

export const getCoverage = indicatorsAdapter.getCoverage;
export const getCompliance = indicatorsAdapter.getCompliance;
export const getIncidents = indicatorsAdapter.getIncidents;
export const getWaste = indicatorsAdapter.getWaste;

export type IndicatorData = Awaited<ReturnType<typeof indicatorsAdapter.getCoverage>> | Awaited<ReturnType<typeof indicatorsAdapter.getCompliance>> | Awaited<ReturnType<typeof indicatorsAdapter.getIncidents>> | Awaited<ReturnType<typeof indicatorsAdapter.getWaste>>;
