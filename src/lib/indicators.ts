import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use una fecha con formato AAAA-MM-DD.");
const dateTimeSchema = z.string().datetime({ offset: true });

export const indicatorQuerySchema = z.object({
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  zoneId: z.string().trim().min(1).optional(),
  serviceTypeId: z.string().trim().min(1).optional(),
}).strict();
export type IndicatorQuery = z.infer<typeof indicatorQuerySchema>;

export type ResolvedIndicatorQuery = Required<Pick<IndicatorQuery, "from" | "to">> &
  Omit<IndicatorQuery, "from" | "to">;

const periodSchema = z.object({ from: calendarDateSchema, to: calendarDateSchema });
const freshnessSchema = z.object({ updatedAt: dateTimeSchema });

const coverageBreakdownSchema = z.object({
  id: z.string(),
  label: z.string(),
  attended: z.number().finite().nonnegative(),
  scheduled: z.number().finite().nonnegative(),
  rate: z.number().finite().min(0).max(100),
});

export const coverageWireSchema = z.object({
  period: periodSchema,
  freshness: freshnessSchema,
  summary: z.object({ attended: z.number().finite().nonnegative(), scheduled: z.number().finite().nonnegative(), rate: z.number().finite().min(0).max(100) }),
  byZone: z.array(coverageBreakdownSchema),
  byServiceType: z.array(coverageBreakdownSchema),
});
export type CoverageWire = z.infer<typeof coverageWireSchema>;

const complianceZoneSchema = z.object({ id: z.string(), label: z.string(), unattended: z.number().finite().nonnegative(), reason: z.string() });
export const complianceWireSchema = z.object({
  period: periodSchema,
  freshness: freshnessSchema,
  summary: z.object({ completed: z.number().finite().nonnegative(), onTime: z.number().finite().nonnegative(), delayed: z.number().finite().nonnegative(), onTimeRate: z.number().finite().min(0).max(100) }),
  unattendedZones: z.array(complianceZoneSchema),
});
export type ComplianceWire = z.infer<typeof complianceWireSchema>;

const incidentPointSchema = z.object({ id: z.string(), label: z.string(), count: z.number().finite().nonnegative() });
export const incidentsWireSchema = z.object({
  period: periodSchema,
  freshness: freshnessSchema,
  containers: z.object({ byZone: z.array(z.object({ id: z.string(), label: z.string(), overflow: z.number().finite().nonnegative(), damage: z.number().finite().nonnegative() })) }),
  treeRisk: z.object({ byLevel: z.array(incidentPointSchema) }),
  reports: z.object({ byType: z.array(incidentPointSchema), byStatus: z.array(incidentPointSchema), meanResolutionHours: z.number().finite().nonnegative() }),
});
export type IncidentsWire = z.infer<typeof incidentsWireSchema>;

const wastePointSchema = z.object({ id: z.string(), label: z.string(), kilograms: z.number().finite().nonnegative(), cubicMeters: z.number().finite().nonnegative() });
export const wasteWireSchema = z.object({
  period: periodSchema,
  freshness: freshnessSchema,
  summary: z.object({ kilograms: z.number().finite().nonnegative(), cubicMeters: z.number().finite().nonnegative(), divertedRate: z.number().finite().min(0).max(100) }),
  byType: z.array(wastePointSchema),
  byDestination: z.array(wastePointSchema),
});
export type WasteWire = z.infer<typeof wasteWireSchema>;

export type IndicatorMetric = { value: number; label: string; unit: string };
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
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: formatCalendarDate(from), to: formatCalendarDate(now) };
}

export function resolveIndicatorQuery(query: IndicatorQuery = {}, now = new Date()): ResolvedIndicatorQuery {
  const parsed = indicatorQuerySchema.safeParse(query);
  if (!parsed.success) throw new IndicatorContractError("Los filtros de indicadores no respetan el formato esperado.", { cause: parsed.error });
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

function normalizeCoverage(wire: CoverageWire): CoverageIndicator {
  return {
    family: "coverage", period: wire.period, freshness: wire.freshness,
    primary: { value: wire.summary.rate, label: "Cobertura de objetivos", unit: "%" },
    summaryMetrics: [
      { value: wire.summary.attended, label: "Atendidos", unit: "objetivos" },
      { value: wire.summary.scheduled, label: "Programados", unit: "objetivos" },
    ],
    breakdowns: [
      { id: "zones", title: "Cobertura por zona", description: "Objetivos atendidos sobre objetivos programados.", points: wire.byZone.map((item) => ({ id: item.id, label: item.label, value: item.rate, unit: "%", note: `${item.attended} de ${item.scheduled} objetivos`, details: [{ label: "Atendidos", value: item.attended, unit: "objetivos" }, { label: "Programados", value: item.scheduled, unit: "objetivos" }] })) },
      { id: "service-types", title: "Cobertura por tipo de servicio", description: "Comparación de cobertura entre servicios.", points: wire.byServiceType.map((item) => ({ id: item.id, label: item.label, value: item.rate, unit: "%", note: `${item.attended} de ${item.scheduled} objetivos`, details: [{ label: "Atendidos", value: item.attended, unit: "objetivos" }, { label: "Programados", value: item.scheduled, unit: "objetivos" }] })) },
    ],
  };
}

function normalizeCompliance(wire: ComplianceWire): ComplianceIndicator {
  return {
    family: "compliance", period: wire.period, freshness: wire.freshness,
    primary: { value: wire.summary.onTimeRate, label: "Cumplimiento en fecha", unit: "%" },
    summaryMetrics: [
      { value: wire.summary.completed, label: "Finalizados", unit: "servicios" },
      { value: wire.summary.onTime, label: "En fecha", unit: "servicios" },
      { value: wire.summary.delayed, label: "Demorados", unit: "servicios" },
    ],
    breakdowns: [
      { id: "completion", title: "Finalización en fecha", description: `${wire.summary.completed} servicios finalizados en el período.`, points: [{ id: "on-time", label: "En fecha", value: wire.summary.onTime, unit: "servicios", tone: "success" }, { id: "delayed", label: "Demorados", value: wire.summary.delayed, unit: "servicios", tone: "warning" }] },
      { id: "unattended-zones", title: "Zonas sin atención", description: "Ranking de zonas pendientes y motivo registrado.", points: wire.unattendedZones.map((item) => ({ id: item.id, label: item.label, value: item.unattended, unit: "objetivos", note: item.reason, tone: "warning" })) },
    ],
  };
}

function normalizeIncidents(wire: IncidentsWire): IncidentsIndicator {
  return {
    family: "incidents", period: wire.period, freshness: wire.freshness,
    primary: { value: wire.reports.meanResolutionHours, label: "Resolución media de reportes", unit: "h" },
    breakdowns: [
      { id: "containers", title: "Contenedores por zona", description: "Incidentes actuales de desborde y daño.", points: wire.containers.byZone.map((item) => ({ id: item.id, label: item.label, value: item.overflow + item.damage, unit: "incidentes", note: `${item.overflow} desbordes · ${item.damage} daños`, tone: item.overflow + item.damage > 4 ? "danger" : "primary" })) },
      { id: "tree-risk", title: "Riesgo de arbolado", description: "Inventario actual por nivel de riesgo.", points: wire.treeRisk.byLevel.map((item) => ({ id: item.id, label: item.label, value: item.count, unit: "árboles", tone: item.label.toLowerCase().includes("alto") ? "danger" : "warning" })) },
      { id: "reports", title: "Reportes por tipo", description: "Reportes recibidos en el período.", points: wire.reports.byType.map((item) => ({ id: item.id, label: item.label, value: item.count, unit: "reportes" })) },
    ],
  };
}

function normalizeWaste(wire: WasteWire): WasteIndicator {
  return {
    family: "waste", period: wire.period, freshness: wire.freshness,
    primary: { value: wire.summary.divertedRate, label: "Desvío de relleno sanitario", unit: "%" },
    breakdowns: [
      { id: "types", title: "Residuos por tipo", description: "Volumen registrado por corriente de residuo.", points: wire.byType.map((item) => ({ id: item.id, label: item.label, value: item.kilograms, unit: "kg", note: `${item.cubicMeters.toLocaleString("es-AR")} m³` })) },
      { id: "destinations", title: "Residuos por destino", description: "Kilogramos enviados a cada destino.", points: wire.byDestination.map((item) => ({ id: item.id, label: item.label, value: item.kilograms, unit: "kg", note: `${item.cubicMeters.toLocaleString("es-AR")} m³` })) },
    ],
  };
}

async function get<T>(family: string, query: IndicatorQuery, schema: z.ZodType<T>, normalize: (wire: T) => T extends CoverageWire ? CoverageIndicator : T extends ComplianceWire ? ComplianceIndicator : T extends IncidentsWire ? IncidentsIndicator : WasteIndicator, message: string) {
  const parsed = schema.safeParse(await request(`/api/indicators/${family}${queryString(query, family)}`));
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "indicators" });
    throw new IndicatorContractError(message, { cause: parsed.error });
  }
  return normalize(parsed.data);
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
