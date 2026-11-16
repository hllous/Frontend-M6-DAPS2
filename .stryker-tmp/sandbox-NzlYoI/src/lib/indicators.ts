// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { z } from "zod";
import { todayInArgentina } from "./argentina-date";
import { CONTAINER_STATUS_LABELS } from "./containers";
import { ENVIRONMENTAL_REPORT_STATUS_LABELS, ENVIRONMENTAL_REPORT_TYPE_LABELS } from "./environmental-reports";
import { WASTE_TYPE_LABELS } from "./green-points";
import { NOT_SERVICED_REASON_LABEL } from "./services";
import { RISK_LEVEL_LABELS } from "./tree-surveys";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
const calendarDateSchema = z.string().regex(stryMutAct_9fa48("9601") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("9600") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("9599") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("9598") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("9597") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("9596") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("9595") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("9594") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("9594", "9595", "9596", "9597", "9598", "9599", "9600", "9601"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("9602") ? "" : (stryCov_9fa48("9602"), "Use una fecha con formato AAAA-MM-DD."));
const dateTimeSchema = z.string().datetime(stryMutAct_9fa48("9603") ? {} : (stryCov_9fa48("9603"), {
  offset: stryMutAct_9fa48("9604") ? false : (stryCov_9fa48("9604"), true)
}));
export const INVERTED_RANGE_MESSAGE = stryMutAct_9fa48("9605") ? "" : (stryCov_9fa48("9605"), "La fecha «Desde» no puede ser posterior a «Hasta».");
export const indicatorQuerySchema = z.object(stryMutAct_9fa48("9606") ? {} : (stryCov_9fa48("9606"), {
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  zoneId: stryMutAct_9fa48("9608") ? z.string().min(1).optional() : stryMutAct_9fa48("9607") ? z.string().trim().max(1).optional() : (stryCov_9fa48("9607", "9608"), z.string().trim().min(1).optional()),
  serviceTypeId: stryMutAct_9fa48("9610") ? z.string().min(1).optional() : stryMutAct_9fa48("9609") ? z.string().trim().max(1).optional() : (stryCov_9fa48("9609", "9610"), z.string().trim().min(1).optional())
})).strict().refine(stryMutAct_9fa48("9611") ? () => undefined : (stryCov_9fa48("9611"), query => stryMutAct_9fa48("9614") ? (!query.from || !query.to) && query.from <= query.to : stryMutAct_9fa48("9613") ? false : stryMutAct_9fa48("9612") ? true : (stryCov_9fa48("9612", "9613", "9614"), (stryMutAct_9fa48("9616") ? !query.from && !query.to : stryMutAct_9fa48("9615") ? false : (stryCov_9fa48("9615", "9616"), (stryMutAct_9fa48("9617") ? query.from : (stryCov_9fa48("9617"), !query.from)) || (stryMutAct_9fa48("9618") ? query.to : (stryCov_9fa48("9618"), !query.to)))) || (stryMutAct_9fa48("9621") ? query.from > query.to : stryMutAct_9fa48("9620") ? query.from < query.to : stryMutAct_9fa48("9619") ? false : (stryCov_9fa48("9619", "9620", "9621"), query.from <= query.to)))), stryMutAct_9fa48("9622") ? {} : (stryCov_9fa48("9622"), {
  path: stryMutAct_9fa48("9623") ? [] : (stryCov_9fa48("9623"), [stryMutAct_9fa48("9624") ? "" : (stryCov_9fa48("9624"), "to")]),
  message: INVERTED_RANGE_MESSAGE
}));
export type IndicatorQuery = z.infer<typeof indicatorQuerySchema>;

/** Mensaje de rango invertido si el error lo incluye; si no, el genérico de formato. */
export function indicatorQueryErrorMessage(error: {
  issues: Array<{
    message: string;
  }>;
}) {
  if (stryMutAct_9fa48("9625")) {
    {}
  } else {
    stryCov_9fa48("9625");
    return (stryMutAct_9fa48("9626") ? error.issues.every(issue => issue.message === INVERTED_RANGE_MESSAGE) : (stryCov_9fa48("9626"), error.issues.some(stryMutAct_9fa48("9627") ? () => undefined : (stryCov_9fa48("9627"), issue => stryMutAct_9fa48("9630") ? issue.message !== INVERTED_RANGE_MESSAGE : stryMutAct_9fa48("9629") ? false : stryMutAct_9fa48("9628") ? true : (stryCov_9fa48("9628", "9629", "9630"), issue.message === INVERTED_RANGE_MESSAGE))))) ? INVERTED_RANGE_MESSAGE : stryMutAct_9fa48("9631") ? "" : (stryCov_9fa48("9631"), "Los filtros de indicadores no respetan el formato esperado.");
  }
}
export type ResolvedIndicatorQuery = Required<Pick<IndicatorQuery, "from" | "to">> & Omit<IndicatorQuery, "from" | "to">;
const periodSchema = z.object(stryMutAct_9fa48("9632") ? {} : (stryCov_9fa48("9632"), {
  from: calendarDateSchema,
  to: calendarDateSchema
}));
const count = z.number().finite().nonnegative();
const percent = stryMutAct_9fa48("9634") ? z.number().finite().max(0).max(100) : stryMutAct_9fa48("9633") ? z.number().finite().min(0).min(100) : (stryCov_9fa48("9633", "9634"), z.number().finite().min(0).max(100));
const targetSchema = z.object(stryMutAct_9fa48("9635") ? {} : (stryCov_9fa48("9635"), {
  value: z.number().finite().nullable(),
  direction: z.string()
})).nullable();
const coverageTotalsSchema = z.object(stryMutAct_9fa48("9636") ? {} : (stryCov_9fa48("9636"), {
  scheduled: count,
  served: count,
  partial: count,
  notServiced: count,
  pending: count,
  upcoming: count.optional(),
  coveragePct: percent
}));
const finishedSchema = z.object(stryMutAct_9fa48("9637") ? {} : (stryCov_9fa48("9637"), {
  total: count,
  onTime: count,
  late: count,
  onTimePct: percent
}));
const deviationSchema = z.object(stryMutAct_9fa48("9638") ? {} : (stryCov_9fa48("9638"), {
  total: count,
  deviated: count,
  deviatedPct: percent
}));
const historyTotalsSchema = z.object(stryMutAct_9fa48("9639") ? {} : (stryCov_9fa48("9639"), {
  overflowIncidents: count,
  damageIncidents: count,
  pendingDamage: count.nullable()
}));
const deadlineSchema = z.object(stryMutAct_9fa48("9640") ? {} : (stryCov_9fa48("9640"), {
  resolved: count,
  withinDeadline: count,
  pct: percent.nullable()
}));
const incidentTotalsSchema = z.object(stryMutAct_9fa48("9641") ? {} : (stryCov_9fa48("9641"), {
  total: count,
  avgResolutionDays: count.nullable(),
  avgResolutionBusinessDays: count.nullable().optional(),
  withinDeadline: deadlineSchema.optional(),
  containers: historyTotalsSchema.optional()
}));
const wasteTotalsSchema = z.object(stryMutAct_9fa48("9642") ? {} : (stryCov_9fa48("9642"), {
  weightKg: count,
  volumeM3: count,
  divertedKg: count,
  divertedPct: percent
}));
const deltaNumber = z.number().finite().nullable();
const blocks = stryMutAct_9fa48("9643") ? () => undefined : (stryCov_9fa48("9643"), (() => {
  const blocks = <T extends z.ZodTypeAny, D extends z.ZodTypeAny, G extends z.ZodTypeAny>(totals: T, delta: D, targets: G) => stryMutAct_9fa48("9644") ? {} : (stryCov_9fa48("9644"), {
    targets: targets.optional(),
    series: z.array(totals.and(periodSchema)).optional(),
    previous: z.object(stryMutAct_9fa48("9645") ? {} : (stryCov_9fa48("9645"), {
      period: periodSchema,
      totals
    })).optional(),
    delta: delta.optional()
  });
  return blocks;
})());

// Los enums viajan como string, no como z.enum: un valor nuevo del backend debe
// mostrarse crudo en una etiqueta, no dejar el tablero entero en error.
function labelFor(labels: Record<string, string>, value: string) {
  if (stryMutAct_9fa48("9646")) {
    {}
  } else {
    stryCov_9fa48("9646");
    return stryMutAct_9fa48("9647") ? labels[value] && value : (stryCov_9fa48("9647"), labels[value] ?? value);
  }
}
const coverageRowSchema = z.object(stryMutAct_9fa48("9648") ? {} : (stryCov_9fa48("9648"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  scheduled: count,
  served: count,
  partial: count,
  notServiced: count,
  pending: count,
  coveragePct: percent,
  upcoming: count.optional(),
  lowSample: z.boolean().optional()
}));
export const coverageWireSchema = z.object(stryMutAct_9fa48("9649") ? {} : (stryCov_9fa48("9649"), {
  period: periodSchema,
  totals: coverageTotalsSchema,
  ...blocks(coverageTotalsSchema, z.object(stryMutAct_9fa48("9650") ? {} : (stryCov_9fa48("9650"), {
    coveragePct: deltaNumber
  })), z.object(stryMutAct_9fa48("9651") ? {} : (stryCov_9fa48("9651"), {
    coveragePct: targetSchema
  }))),
  byZone: z.array(coverageRowSchema),
  byServiceType: z.array(coverageRowSchema)
}));
export type CoverageWire = z.infer<typeof coverageWireSchema>;
export const complianceWireSchema = z.object(stryMutAct_9fa48("9652") ? {} : (stryCov_9fa48("9652"), {
  period: periodSchema,
  finished: finishedSchema,
  schedulingDeviation: deviationSchema.optional(),
  ...blocks(z.object(stryMutAct_9fa48("9653") ? {} : (stryCov_9fa48("9653"), {
    finished: finishedSchema,
    schedulingDeviation: deviationSchema.optional()
  })), z.object(stryMutAct_9fa48("9654") ? {} : (stryCov_9fa48("9654"), {
    onTimePct: deltaNumber,
    deviatedPct: deltaNumber.optional()
  })), z.object(stryMutAct_9fa48("9655") ? {} : (stryCov_9fa48("9655"), {
    compliancePct: targetSchema,
    schedulingDeviationPct: targetSchema.optional()
  }))),
  notServicedRanking: z.array(z.object(stryMutAct_9fa48("9656") ? {} : (stryCov_9fa48("9656"), {
    zoneId: z.string(),
    code: z.string(),
    name: z.string(),
    count,
    reasons: z.array(z.object(stryMutAct_9fa48("9657") ? {} : (stryCov_9fa48("9657"), {
      reason: z.string().nullable(),
      count
    })))
  })))
}));
export type ComplianceWire = z.infer<typeof complianceWireSchema>;
export const incidentsWireSchema = z.object(stryMutAct_9fa48("9658") ? {} : (stryCov_9fa48("9658"), {
  period: periodSchema,
  ...blocks(incidentTotalsSchema, z.object(stryMutAct_9fa48("9659") ? {} : (stryCov_9fa48("9659"), {
    withinDeadlinePct: deltaNumber.optional(),
    overflowIncidents: deltaNumber.optional(),
    pendingDamage: deltaNumber.optional(),
    avgResolutionDays: deltaNumber,
    avgResolutionBusinessDays: deltaNumber.optional()
  })), z.object(stryMutAct_9fa48("9660") ? {} : (stryCov_9fa48("9660"), {
    resolutionBusinessDays: targetSchema,
    reportsWithinDeadlinePct: targetSchema.optional(),
    reportsOverduePct: targetSchema.optional(),
    overflowTrend: targetSchema.optional(),
    pendingDamageTrend: targetSchema.optional()
  }))),
  containers: z.object(stryMutAct_9fa48("9661") ? {} : (stryCov_9fa48("9661"), {
    history: historyTotalsSchema.extend(stryMutAct_9fa48("9662") ? {} : (stryCov_9fa48("9662"), {
      trackingSince: dateTimeSchema.nullable()
    })).optional(),
    byStatus: z.array(z.object(stryMutAct_9fa48("9663") ? {} : (stryCov_9fa48("9663"), {
      status: z.string(),
      count
    }))),
    byZone: z.array(z.object(stryMutAct_9fa48("9664") ? {} : (stryCov_9fa48("9664"), {
      zoneId: z.string(),
      code: z.string(),
      name: z.string(),
      overflowed: count,
      damaged: count,
      total: count
    })))
  })),
  trees: z.object(stryMutAct_9fa48("9665") ? {} : (stryCov_9fa48("9665"), {
    byRiskLevel: z.array(z.object(stryMutAct_9fa48("9666") ? {} : (stryCov_9fa48("9666"), {
      riskLevel: z.string(),
      count
    })))
  })),
  reports: z.object(stryMutAct_9fa48("9667") ? {} : (stryCov_9fa48("9667"), {
    total: count,
    byType: z.array(z.object(stryMutAct_9fa48("9668") ? {} : (stryCov_9fa48("9668"), {
      reportType: z.string(),
      count
    }))),
    byStatus: z.array(z.object(stryMutAct_9fa48("9669") ? {} : (stryCov_9fa48("9669"), {
      status: z.string(),
      count
    }))),
    // null cuando no se cerró ningún reporte en el período.
    avgResolutionDays: z.number().finite().nonnegative().nullable(),
    avgResolutionBusinessDays: count.nullable().optional(),
    deadlineBusinessDays: count.optional(),
    withinDeadline: deadlineSchema.optional(),
    overdue: z.object(stryMutAct_9fa48("9670") ? {} : (stryCov_9fa48("9670"), {
      open: count,
      overdue: count,
      pct: percent.nullable()
    })).optional()
  }))
}));
export type IncidentsWire = z.infer<typeof incidentsWireSchema>;
export const wasteWireSchema = z.object(stryMutAct_9fa48("9671") ? {} : (stryCov_9fa48("9671"), {
  period: periodSchema,
  totals: wasteTotalsSchema,
  ...blocks(wasteTotalsSchema, z.object(stryMutAct_9fa48("9672") ? {} : (stryCov_9fa48("9672"), {
    divertedPct: deltaNumber
  })), z.object(stryMutAct_9fa48("9673") ? {} : (stryCov_9fa48("9673"), {
    landfillDiversionPct: targetSchema
  }))),
  byWasteType: z.array(z.object(stryMutAct_9fa48("9674") ? {} : (stryCov_9fa48("9674"), {
    wasteType: z.string(),
    weightKg: count,
    volumeM3: count
  }))),
  byDisposalSite: z.array(z.object(stryMutAct_9fa48("9675") ? {} : (stryCov_9fa48("9675"), {
    disposalSiteId: z.string(),
    code: z.string(),
    name: z.string(),
    siteType: z.string(),
    weightKg: count,
    volumeM3: count
  }))),
  records: count
}));
export type WasteWire = z.infer<typeof wasteWireSchema>;

/** `value: null` = no hay base para calcular la métrica (p. ej. ningún reporte cerrado). */
export type IndicatorMetric = {
  value: number | null;
  label: string;
  unit: string;
};
export type IndicatorPointDetail = {
  label: string;
  value: number | null;
  unit: string;
};
export type IndicatorPoint = {
  id: string;
  label: string;
  value: number;
  unit: string;
  note?: string;
  details?: IndicatorPointDetail[];
  tone?: "primary" | "success" | "warning" | "danger";
  lowSample?: boolean;
};
export type IndicatorTarget = {
  value: number | null;
  direction: string;
} | null;
export type IndicatorBreakdown = {
  target?: IndicatorTarget;
  id: string;
  title: string;
  description: string;
  points: IndicatorPoint[];
};
export type IndicatorPeriod = {
  from: string;
  to: string;
};
export type IndicatorFreshness = {
  updatedAt: string;
};
export type CoverageIndicator = Pick<CoverageWire, "totals" | "targets" | "series" | "previous" | "delta"> & {
  family: "coverage";
  seriesBucket?: "week" | "month";
  /** Mensaje del backend cuando rechazó el intervalo de la serie; el resto de la familia sí llegó. */
  seriesError?: string;
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};
export type ComplianceIndicator = Pick<ComplianceWire, "finished" | "targets" | "series" | "previous" | "delta" | "schedulingDeviation"> & {
  family: "compliance";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};
export type IncidentsIndicator = Pick<IncidentsWire, "targets" | "series" | "previous" | "delta" | "containers" | "reports"> & {
  family: "incidents";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  breakdowns: IndicatorBreakdown[];
};
export type WasteIndicator = Pick<WasteWire, "targets" | "series" | "previous" | "delta"> & {
  family: "waste";
  period: IndicatorPeriod;
  freshness: IndicatorFreshness;
  primary: IndicatorMetric;
  summaryMetrics: IndicatorMetric[];
  breakdowns: IndicatorBreakdown[];
};
export class IndicatorContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9676")) {
      {}
    } else {
      stryCov_9fa48("9676");
      super(message, options);
      this.name = stryMutAct_9fa48("9677") ? "" : (stryCov_9fa48("9677"), "IndicatorContractError");
    }
  }
}
export class IndicatorRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9678")) {
      {}
    } else {
      stryCov_9fa48("9678");
      super(message, options);
      this.name = stryMutAct_9fa48("9679") ? "" : (stryCov_9fa48("9679"), "IndicatorRequestError");
      this.status = status;
    }
  }
}
function formatCalendarDate(date: Date) {
  if (stryMutAct_9fa48("9680")) {
    {}
  } else {
    stryCov_9fa48("9680");
    return stryMutAct_9fa48("9681") ? date.toISOString() : (stryCov_9fa48("9681"), date.toISOString().slice(0, 10));
  }
}
export function defaultIndicatorQuery(now = new Date()): ResolvedIndicatorQuery {
  if (stryMutAct_9fa48("9682")) {
    {}
  } else {
    stryCov_9fa48("9682");
    const to = todayInArgentina(now);
    const from = new Date(stryMutAct_9fa48("9683") ? `` : (stryCov_9fa48("9683"), `${to}T00:00:00.000Z`));
    stryMutAct_9fa48("9685") ? from.setTime(from.getUTCDate() - 29) : (stryCov_9fa48("9685"), from.setUTCDate(stryMutAct_9fa48("9686") ? from.getUTCDate() + 29 : (stryCov_9fa48("9686"), from.getUTCDate() - 29)));
    return stryMutAct_9fa48("9687") ? {} : (stryCov_9fa48("9687"), {
      from: formatCalendarDate(from),
      to
    });
  }
}
export function resolveIndicatorQuery(query: IndicatorQuery = {}, now = new Date()): ResolvedIndicatorQuery {
  if (stryMutAct_9fa48("9688")) {
    {}
  } else {
    stryCov_9fa48("9688");
    const parsed = indicatorQuerySchema.safeParse(query);
    if (stryMutAct_9fa48("9691") ? false : stryMutAct_9fa48("9690") ? true : stryMutAct_9fa48("9689") ? parsed.success : (stryCov_9fa48("9689", "9690", "9691"), !parsed.success)) throw new IndicatorContractError(indicatorQueryErrorMessage(parsed.error), stryMutAct_9fa48("9693") ? {} : (stryCov_9fa48("9693"), {
      cause: parsed.error
    }));
    const defaults = defaultIndicatorQuery(now);
    return stryMutAct_9fa48("9694") ? {} : (stryCov_9fa48("9694"), {
      ...defaults,
      ...parsed.data
    });
  }
}
export const INDICATOR_FAMILIES = ["coverage", "compliance", "incidents", "waste"] as const;
export type IndicatorFamily = typeof INDICATOR_FAMILIES[number];
export const indicatorBucketSchema = z.enum(stryMutAct_9fa48("9695") ? [] : (stryCov_9fa48("9695"), [stryMutAct_9fa48("9696") ? "" : (stryCov_9fa48("9696"), "day"), stryMutAct_9fa48("9697") ? "" : (stryCov_9fa48("9697"), "week"), stryMutAct_9fa48("9698") ? "" : (stryCov_9fa48("9698"), "month")]));
export type IndicatorBucket = z.infer<typeof indicatorBucketSchema>;

// openapi.json del backend: sólo coverage y compliance reciben zoneId/serviceTypeId;
// incidents y waste aceptan únicamente from/to.
export function familyAppliesCatalogFilters(family: string) {
  if (stryMutAct_9fa48("9699")) {
    {}
  } else {
    stryCov_9fa48("9699");
    return stryMutAct_9fa48("9702") ? family === "coverage" && family === "compliance" : stryMutAct_9fa48("9701") ? false : stryMutAct_9fa48("9700") ? true : (stryCov_9fa48("9700", "9701", "9702"), (stryMutAct_9fa48("9704") ? family !== "coverage" : stryMutAct_9fa48("9703") ? false : (stryCov_9fa48("9703", "9704"), family === (stryMutAct_9fa48("9705") ? "" : (stryCov_9fa48("9705"), "coverage")))) || (stryMutAct_9fa48("9707") ? family !== "compliance" : stryMutAct_9fa48("9706") ? false : (stryCov_9fa48("9706", "9707"), family === (stryMutAct_9fa48("9708") ? "" : (stryCov_9fa48("9708"), "compliance")))));
  }
}
export type IndicatorUrlState = {
  query: ResolvedIndicatorQuery;
  family: IndicatorFamily;
  view: "bars" | "table";
  /** Señal elegida: `breakdownId:pointId`. */
  signal?: {
    breakdownId: string;
    pointId: string;
  };
};

/** Estado del tablero desde la URL; lo inválido cae al valor por defecto, sin lanzar. */
export function parseIndicatorUrlState(params: {
  get(name: string): string | null;
}, now = new Date()): IndicatorUrlState {
  if (stryMutAct_9fa48("9709")) {
    {}
  } else {
    stryCov_9fa48("9709");
    const raw = Object.fromEntries((stryMutAct_9fa48("9710") ? [] : (stryCov_9fa48("9710"), [stryMutAct_9fa48("9711") ? "" : (stryCov_9fa48("9711"), "from"), stryMutAct_9fa48("9712") ? "" : (stryCov_9fa48("9712"), "to"), stryMutAct_9fa48("9713") ? "" : (stryCov_9fa48("9713"), "zoneId"), stryMutAct_9fa48("9714") ? "" : (stryCov_9fa48("9714"), "serviceTypeId")])).flatMap(stryMutAct_9fa48("9715") ? () => undefined : (stryCov_9fa48("9715"), key => params.get(key) ? stryMutAct_9fa48("9716") ? [] : (stryCov_9fa48("9716"), [stryMutAct_9fa48("9717") ? [] : (stryCov_9fa48("9717"), [key, params.get(key)])]) : stryMutAct_9fa48("9718") ? ["Stryker was here"] : (stryCov_9fa48("9718"), []))));
    const parsed = indicatorQuerySchema.safeParse(raw);
    const query = stryMutAct_9fa48("9719") ? {} : (stryCov_9fa48("9719"), {
      ...defaultIndicatorQuery(now),
      ...(parsed.success ? parsed.data : {})
    });
    const family = params.get(stryMutAct_9fa48("9720") ? "" : (stryCov_9fa48("9720"), "family"));
    const separator = stryMutAct_9fa48("9721") ? params.get("signal")?.indexOf(":") && -1 : (stryCov_9fa48("9721"), (stryMutAct_9fa48("9722") ? params.get("signal").indexOf(":") : (stryCov_9fa48("9722"), params.get(stryMutAct_9fa48("9723") ? "" : (stryCov_9fa48("9723"), "signal"))?.indexOf(stryMutAct_9fa48("9724") ? "" : (stryCov_9fa48("9724"), ":")))) ?? (stryMutAct_9fa48("9725") ? +1 : (stryCov_9fa48("9725"), -1)));
    const signal = params.get(stryMutAct_9fa48("9726") ? "" : (stryCov_9fa48("9726"), "signal"));
    return stryMutAct_9fa48("9727") ? {} : (stryCov_9fa48("9727"), {
      query,
      family: stryMutAct_9fa48("9728") ? INDICATOR_FAMILIES.find(item => item === family) && "coverage" : (stryCov_9fa48("9728"), INDICATOR_FAMILIES.find(stryMutAct_9fa48("9729") ? () => undefined : (stryCov_9fa48("9729"), item => stryMutAct_9fa48("9732") ? item !== family : stryMutAct_9fa48("9731") ? false : stryMutAct_9fa48("9730") ? true : (stryCov_9fa48("9730", "9731", "9732"), item === family))) ?? (stryMutAct_9fa48("9733") ? "" : (stryCov_9fa48("9733"), "coverage"))),
      view: (stryMutAct_9fa48("9736") ? params.get("view") !== "table" : stryMutAct_9fa48("9735") ? false : stryMutAct_9fa48("9734") ? true : (stryCov_9fa48("9734", "9735", "9736"), params.get(stryMutAct_9fa48("9737") ? "" : (stryCov_9fa48("9737"), "view")) === (stryMutAct_9fa48("9738") ? "" : (stryCov_9fa48("9738"), "table")))) ? stryMutAct_9fa48("9739") ? "" : (stryCov_9fa48("9739"), "table") : stryMutAct_9fa48("9740") ? "" : (stryCov_9fa48("9740"), "bars"),
      signal: (stryMutAct_9fa48("9743") ? signal || separator > 0 : stryMutAct_9fa48("9742") ? false : stryMutAct_9fa48("9741") ? true : (stryCov_9fa48("9741", "9742", "9743"), signal && (stryMutAct_9fa48("9746") ? separator <= 0 : stryMutAct_9fa48("9745") ? separator >= 0 : stryMutAct_9fa48("9744") ? true : (stryCov_9fa48("9744", "9745", "9746"), separator > 0)))) ? stryMutAct_9fa48("9747") ? {} : (stryCov_9fa48("9747"), {
        breakdownId: stryMutAct_9fa48("9748") ? signal : (stryCov_9fa48("9748"), signal.slice(0, separator)),
        pointId: stryMutAct_9fa48("9749") ? signal : (stryCov_9fa48("9749"), signal.slice(stryMutAct_9fa48("9750") ? separator - 1 : (stryCov_9fa48("9750"), separator + 1)))
      }) : undefined
    });
  }
}

/** Copia `base` (conserva p. ej. `destination`) y pisa los parámetros del tablero. */
export function serializeIndicatorUrlState(state: Omit<IndicatorUrlState, "query"> & {
  query: IndicatorQuery;
}, base = stryMutAct_9fa48("9751") ? "Stryker was here!" : (stryCov_9fa48("9751"), "")): string {
  if (stryMutAct_9fa48("9752")) {
    {}
  } else {
    stryCov_9fa48("9752");
    const params = new URLSearchParams(base);
    for (const key of stryMutAct_9fa48("9753") ? [] : (stryCov_9fa48("9753"), [stryMutAct_9fa48("9754") ? "" : (stryCov_9fa48("9754"), "from"), stryMutAct_9fa48("9755") ? "" : (stryCov_9fa48("9755"), "to"), stryMutAct_9fa48("9756") ? "" : (stryCov_9fa48("9756"), "zoneId"), stryMutAct_9fa48("9757") ? "" : (stryCov_9fa48("9757"), "serviceTypeId"), stryMutAct_9fa48("9758") ? "" : (stryCov_9fa48("9758"), "family"), stryMutAct_9fa48("9759") ? "" : (stryCov_9fa48("9759"), "view"), stryMutAct_9fa48("9760") ? "" : (stryCov_9fa48("9760"), "signal")])) if (stryMutAct_9fa48("9761")) {
      ;
    } else {
      stryCov_9fa48("9761");
      params.delete(key);
    }
    const {
      query
    } = state;
    if (stryMutAct_9fa48("9763") ? false : stryMutAct_9fa48("9762") ? true : (stryCov_9fa48("9762", "9763"), query.from)) params.set(stryMutAct_9fa48("9765") ? "" : (stryCov_9fa48("9765"), "from"), query.from);
    if (stryMutAct_9fa48("9767") ? false : stryMutAct_9fa48("9766") ? true : (stryCov_9fa48("9766", "9767"), query.to)) params.set(stryMutAct_9fa48("9769") ? "" : (stryCov_9fa48("9769"), "to"), query.to);
    if (stryMutAct_9fa48("9771") ? false : stryMutAct_9fa48("9770") ? true : (stryCov_9fa48("9770", "9771"), query.zoneId)) params.set(stryMutAct_9fa48("9773") ? "" : (stryCov_9fa48("9773"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("9775") ? false : stryMutAct_9fa48("9774") ? true : (stryCov_9fa48("9774", "9775"), query.serviceTypeId)) params.set(stryMutAct_9fa48("9777") ? "" : (stryCov_9fa48("9777"), "serviceTypeId"), query.serviceTypeId);
    params.set(stryMutAct_9fa48("9779") ? "" : (stryCov_9fa48("9779"), "family"), state.family);
    if (stryMutAct_9fa48("9782") ? state.view !== "table" : stryMutAct_9fa48("9781") ? false : stryMutAct_9fa48("9780") ? true : (stryCov_9fa48("9780", "9781", "9782"), state.view === (stryMutAct_9fa48("9783") ? "" : (stryCov_9fa48("9783"), "table")))) params.set(stryMutAct_9fa48("9785") ? "" : (stryCov_9fa48("9785"), "view"), stryMutAct_9fa48("9786") ? "" : (stryCov_9fa48("9786"), "table"));
    if (stryMutAct_9fa48("9788") ? false : stryMutAct_9fa48("9787") ? true : (stryCov_9fa48("9787", "9788"), state.signal)) params.set(stryMutAct_9fa48("9790") ? "" : (stryCov_9fa48("9790"), "signal"), stryMutAct_9fa48("9791") ? `` : (stryCov_9fa48("9791"), `${state.signal.breakdownId}:${state.signal.pointId}`));
    return params.toString();
  }
}
export function coverageBucket(query: IndicatorQuery): "week" | "month" {
  if (stryMutAct_9fa48("9792")) {
    {}
  } else {
    stryCov_9fa48("9792");
    const resolved = resolveIndicatorQuery(query);
    const start = new Date(stryMutAct_9fa48("9793") ? `` : (stryCov_9fa48("9793"), `${resolved.from}T00:00:00Z`));
    const days = stryMutAct_9fa48("9794") ? (Date.parse(`${resolved.to}T00:00:00Z`) - start.getTime()) / 86400000 - 1 : (stryCov_9fa48("9794"), (stryMutAct_9fa48("9795") ? (Date.parse(`${resolved.to}T00:00:00Z`) - start.getTime()) * 86400000 : (stryCov_9fa48("9795"), (stryMutAct_9fa48("9796") ? Date.parse(`${resolved.to}T00:00:00Z`) + start.getTime() : (stryCov_9fa48("9796"), Date.parse(stryMutAct_9fa48("9797") ? `` : (stryCov_9fa48("9797"), `${resolved.to}T00:00:00Z`)) - start.getTime())) / 86400000)) + 1);
    const weeks = Math.ceil(stryMutAct_9fa48("9798") ? (days + (start.getUTCDay() + 6) % 7) * 7 : (stryCov_9fa48("9798"), (stryMutAct_9fa48("9799") ? days - (start.getUTCDay() + 6) % 7 : (stryCov_9fa48("9799"), days + (stryMutAct_9fa48("9800") ? (start.getUTCDay() + 6) * 7 : (stryCov_9fa48("9800"), (stryMutAct_9fa48("9801") ? start.getUTCDay() - 6 : (stryCov_9fa48("9801"), start.getUTCDay() + 6)) % 7)))) / 7));
    return (stryMutAct_9fa48("9805") ? weeks <= 90 : stryMutAct_9fa48("9804") ? weeks >= 90 : stryMutAct_9fa48("9803") ? false : stryMutAct_9fa48("9802") ? true : (stryCov_9fa48("9802", "9803", "9804", "9805"), weeks > 90)) ? stryMutAct_9fa48("9806") ? "" : (stryCov_9fa48("9806"), "month") : stryMutAct_9fa48("9807") ? "" : (stryCov_9fa48("9807"), "week");
  }
}
function queryString(query: IndicatorQuery, family: string, withSeries = stryMutAct_9fa48("9808") ? false : (stryCov_9fa48("9808"), true)) {
  if (stryMutAct_9fa48("9809")) {
    {}
  } else {
    stryCov_9fa48("9809");
    const resolved = resolveIndicatorQuery(query);
    const params = new URLSearchParams(stryMutAct_9fa48("9810") ? {} : (stryCov_9fa48("9810"), {
      from: resolved.from,
      to: resolved.to,
      compare: stryMutAct_9fa48("9811") ? "" : (stryCov_9fa48("9811"), "previous")
    }));
    if (stryMutAct_9fa48("9814") ? withSeries || family !== "waste" : stryMutAct_9fa48("9813") ? false : stryMutAct_9fa48("9812") ? true : (stryCov_9fa48("9812", "9813", "9814"), withSeries && (stryMutAct_9fa48("9816") ? family === "waste" : stryMutAct_9fa48("9815") ? true : (stryCov_9fa48("9815", "9816"), family !== (stryMutAct_9fa48("9817") ? "" : (stryCov_9fa48("9817"), "waste")))))) params.set(stryMutAct_9fa48("9819") ? "" : (stryCov_9fa48("9819"), "bucket"), coverageBucket(resolved));
    if (stryMutAct_9fa48("9821") ? false : stryMutAct_9fa48("9820") ? true : (stryCov_9fa48("9820", "9821"), familyAppliesCatalogFilters(family))) {
      if (stryMutAct_9fa48("9822")) {
        {}
      } else {
        stryCov_9fa48("9822");
        if (stryMutAct_9fa48("9824") ? false : stryMutAct_9fa48("9823") ? true : (stryCov_9fa48("9823", "9824"), resolved.zoneId)) params.set(stryMutAct_9fa48("9826") ? "" : (stryCov_9fa48("9826"), "zoneId"), resolved.zoneId);
        if (stryMutAct_9fa48("9828") ? false : stryMutAct_9fa48("9827") ? true : (stryCov_9fa48("9827", "9828"), resolved.serviceTypeId)) params.set(stryMutAct_9fa48("9830") ? "" : (stryCov_9fa48("9830"), "serviceTypeId"), resolved.serviceTypeId);
      }
    }
    return stryMutAct_9fa48("9831") ? `` : (stryCov_9fa48("9831"), `?${params.toString()}`);
  }
}
async function request(path: string) {
  if (stryMutAct_9fa48("9832")) {
    {}
  } else {
    stryCov_9fa48("9832");
    let response: Response;
    try {
      if (stryMutAct_9fa48("9833")) {
        {}
      } else {
        stryCov_9fa48("9833");
        response = await authenticatedFetch(path);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9834")) {
        {}
      } else {
        stryCov_9fa48("9834");
        if (stryMutAct_9fa48("9836") ? false : stryMutAct_9fa48("9835") ? true : (stryCov_9fa48("9835", "9836"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("9838") ? {} : (stryCov_9fa48("9838"), {
          name: stryMutAct_9fa48("9839") ? "" : (stryCov_9fa48("9839"), "request_network_failure"),
          resource: stryMutAct_9fa48("9840") ? "" : (stryCov_9fa48("9840"), "indicators")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("9841")) {
        {}
      } else {
        stryCov_9fa48("9841");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9842")) {
        {}
      } else {
        stryCov_9fa48("9842");
        recordTelemetryEvent(stryMutAct_9fa48("9844") ? {} : (stryCov_9fa48("9844"), {
          name: stryMutAct_9fa48("9845") ? "" : (stryCov_9fa48("9845"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9846") ? "" : (stryCov_9fa48("9846"), "indicators")
        }));
        throw new IndicatorContractError(stryMutAct_9fa48("9848") ? "" : (stryCov_9fa48("9848"), "No se pudo obtener información válida de indicadores. Reintente en unos segundos."), stryMutAct_9fa48("9849") ? {} : (stryCov_9fa48("9849"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("9852") ? false : stryMutAct_9fa48("9851") ? true : stryMutAct_9fa48("9850") ? response.ok : (stryCov_9fa48("9850", "9851", "9852"), !response.ok)) {
      if (stryMutAct_9fa48("9853")) {
        {}
      } else {
        stryCov_9fa48("9853");
        const parsed = z.object(stryMutAct_9fa48("9854") ? {} : (stryCov_9fa48("9854"), {
          statusCode: z.number(),
          message: z.union(stryMutAct_9fa48("9855") ? [] : (stryCov_9fa48("9855"), [z.string(), z.array(z.string())]))
        })).safeParse(payload);
        if (stryMutAct_9fa48("9858") ? false : stryMutAct_9fa48("9857") ? true : stryMutAct_9fa48("9856") ? parsed.success : (stryCov_9fa48("9856", "9857", "9858"), !parsed.success)) throw new IndicatorContractError(stryMutAct_9fa48("9860") ? "" : (stryCov_9fa48("9860"), "No se pudo obtener información válida de error de indicadores. Reintente en unos segundos."), stryMutAct_9fa48("9861") ? {} : (stryCov_9fa48("9861"), {
          cause: parsed.error
        }));
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("9862") ? "" : (stryCov_9fa48("9862"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("9863")) {
          ;
        } else {
          stryCov_9fa48("9863");
          throw new IndicatorRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function isTooManySeriesPoints(error: unknown): error is IndicatorRequestError {
  if (stryMutAct_9fa48("9864")) {
    {}
  } else {
    stryCov_9fa48("9864");
    if (stryMutAct_9fa48("9867") ? !(error instanceof IndicatorRequestError) && error.status !== 400 : stryMutAct_9fa48("9866") ? false : stryMutAct_9fa48("9865") ? true : (stryCov_9fa48("9865", "9866", "9867"), (stryMutAct_9fa48("9868") ? error instanceof IndicatorRequestError : (stryCov_9fa48("9868"), !(error instanceof IndicatorRequestError))) || (stryMutAct_9fa48("9870") ? error.status === 400 : stryMutAct_9fa48("9869") ? false : (stryCov_9fa48("9869", "9870"), error.status !== 400)))) return stryMutAct_9fa48("9871") ? true : (stryCov_9fa48("9871"), false);
    const message = stryMutAct_9fa48("9872") ? error.message.toLocaleUpperCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "") : (stryCov_9fa48("9872"), error.message.toLocaleLowerCase(stryMutAct_9fa48("9873") ? "" : (stryCov_9fa48("9873"), "es-AR")).normalize(stryMutAct_9fa48("9874") ? "" : (stryCov_9fa48("9874"), "NFD")).replace(stryMutAct_9fa48("9875") ? /[^\u0300-\u036f]/g : (stryCov_9fa48("9875"), /[\u0300-\u036f]/g), stryMutAct_9fa48("9876") ? "Stryker was here!" : (stryCov_9fa48("9876"), "")));
    return stryMutAct_9fa48("9879") ? message.includes("90") && /\b(?:puntos?|intervalos?)\b/.test(message) || /\b(?:supera|excede|maximo|limite|mas de|more than|maximum|exceeds?|too many)\b/.test(message) : stryMutAct_9fa48("9878") ? false : stryMutAct_9fa48("9877") ? true : (stryCov_9fa48("9877", "9878", "9879"), (stryMutAct_9fa48("9881") ? message.includes("90") || /\b(?:puntos?|intervalos?)\b/.test(message) : stryMutAct_9fa48("9880") ? true : (stryCov_9fa48("9880", "9881"), message.includes(stryMutAct_9fa48("9882") ? "" : (stryCov_9fa48("9882"), "90")) && (stryMutAct_9fa48("9884") ? /\b(?:puntos?|intervalos)\b/ : stryMutAct_9fa48("9883") ? /\b(?:puntos|intervalos?)\b/ : (stryCov_9fa48("9883", "9884"), /\b(?:puntos?|intervalos?)\b/)).test(message))) && (stryMutAct_9fa48("9885") ? /\b(?:supera|excede|maximo|limite|mas de|more than|maximum|exceeds|too many)\b/ : (stryCov_9fa48("9885"), /\b(?:supera|excede|maximo|limite|mas de|more than|maximum|exceeds?|too many)\b/)).test(message));
  }
}
const RISK_LEVEL_ORDER = stryMutAct_9fa48("9886") ? [] : (stryCov_9fa48("9886"), [stryMutAct_9fa48("9887") ? "" : (stryCov_9fa48("9887"), "CRITICAL"), stryMutAct_9fa48("9888") ? "" : (stryCov_9fa48("9888"), "HIGH"), stryMutAct_9fa48("9889") ? "" : (stryCov_9fa48("9889"), "MEDIUM"), stryMutAct_9fa48("9890") ? "" : (stryCov_9fa48("9890"), "LOW"), stryMutAct_9fa48("9891") ? "" : (stryCov_9fa48("9891"), "NONE")]);
function coveragePoints(rows: CoverageWire["byZone"]): IndicatorPoint[] {
  if (stryMutAct_9fa48("9892")) {
    {}
  } else {
    stryCov_9fa48("9892");
    return rows.map(stryMutAct_9fa48("9893") ? () => undefined : (stryCov_9fa48("9893"), row => stryMutAct_9fa48("9894") ? {} : (stryCov_9fa48("9894"), {
      id: row.id,
      lowSample: row.lowSample,
      label: row.name,
      value: row.coveragePct,
      unit: stryMutAct_9fa48("9895") ? "" : (stryCov_9fa48("9895"), "%"),
      note: stryMutAct_9fa48("9896") ? `` : (stryCov_9fa48("9896"), `${row.served} de ${row.scheduled} objetivos`),
      details: stryMutAct_9fa48("9897") ? [] : (stryCov_9fa48("9897"), [stryMutAct_9fa48("9898") ? {} : (stryCov_9fa48("9898"), {
        label: stryMutAct_9fa48("9899") ? "" : (stryCov_9fa48("9899"), "Atendidos"),
        value: row.served,
        unit: stryMutAct_9fa48("9900") ? "" : (stryCov_9fa48("9900"), "objetivos")
      }), stryMutAct_9fa48("9901") ? {} : (stryCov_9fa48("9901"), {
        label: stryMutAct_9fa48("9902") ? "" : (stryCov_9fa48("9902"), "Parciales"),
        value: row.partial,
        unit: stryMutAct_9fa48("9903") ? "" : (stryCov_9fa48("9903"), "objetivos")
      }), stryMutAct_9fa48("9904") ? {} : (stryCov_9fa48("9904"), {
        label: stryMutAct_9fa48("9905") ? "" : (stryCov_9fa48("9905"), "No atendidos"),
        value: row.notServiced,
        unit: stryMutAct_9fa48("9906") ? "" : (stryCov_9fa48("9906"), "objetivos")
      }), stryMutAct_9fa48("9907") ? {} : (stryCov_9fa48("9907"), {
        label: stryMutAct_9fa48("9908") ? "" : (stryCov_9fa48("9908"), "Pendientes"),
        value: row.pending,
        unit: stryMutAct_9fa48("9909") ? "" : (stryCov_9fa48("9909"), "objetivos")
      }), stryMutAct_9fa48("9910") ? {} : (stryCov_9fa48("9910"), {
        label: stryMutAct_9fa48("9911") ? "" : (stryCov_9fa48("9911"), "Programado a futuro"),
        value: stryMutAct_9fa48("9912") ? row.upcoming && null : (stryCov_9fa48("9912"), row.upcoming ?? null),
        unit: stryMutAct_9fa48("9913") ? "" : (stryCov_9fa48("9913"), "objetivos")
      }), stryMutAct_9fa48("9914") ? {} : (stryCov_9fa48("9914"), {
        label: stryMutAct_9fa48("9915") ? "" : (stryCov_9fa48("9915"), "Programados"),
        value: row.scheduled,
        unit: stryMutAct_9fa48("9916") ? "" : (stryCov_9fa48("9916"), "objetivos")
      })])
    })));
  }
}
function normalizeCoverage(wire: CoverageWire, readAt: string): CoverageIndicator {
  if (stryMutAct_9fa48("9917")) {
    {}
  } else {
    stryCov_9fa48("9917");
    const coverageTarget = (stryMutAct_9fa48("9920") ? wire.targets !== undefined : stryMutAct_9fa48("9919") ? false : stryMutAct_9fa48("9918") ? true : (stryCov_9fa48("9918", "9919", "9920"), wire.targets === undefined)) ? defaultIndicatorTarget(stryMutAct_9fa48("9921") ? "" : (stryCov_9fa48("9921"), "coverage")) : stryMutAct_9fa48("9922") ? wire.targets.coveragePct && null : (stryCov_9fa48("9922"), wire.targets.coveragePct ?? null);
    return stryMutAct_9fa48("9923") ? {} : (stryCov_9fa48("9923"), {
      totals: wire.totals,
      targets: wire.targets,
      series: wire.series,
      previous: wire.previous,
      delta: wire.delta,
      family: stryMutAct_9fa48("9924") ? "" : (stryCov_9fa48("9924"), "coverage"),
      period: wire.period,
      freshness: stryMutAct_9fa48("9925") ? {} : (stryCov_9fa48("9925"), {
        updatedAt: readAt
      }),
      primary: stryMutAct_9fa48("9926") ? {} : (stryCov_9fa48("9926"), {
        value: wire.totals.coveragePct,
        label: stryMutAct_9fa48("9927") ? "" : (stryCov_9fa48("9927"), "Cobertura de objetivos"),
        unit: stryMutAct_9fa48("9928") ? "" : (stryCov_9fa48("9928"), "%")
      }),
      summaryMetrics: stryMutAct_9fa48("9929") ? [] : (stryCov_9fa48("9929"), [stryMutAct_9fa48("9930") ? {} : (stryCov_9fa48("9930"), {
        value: wire.totals.served,
        label: stryMutAct_9fa48("9931") ? "" : (stryCov_9fa48("9931"), "Atendidos"),
        unit: stryMutAct_9fa48("9932") ? "" : (stryCov_9fa48("9932"), "objetivos")
      }), stryMutAct_9fa48("9933") ? {} : (stryCov_9fa48("9933"), {
        value: wire.totals.partial,
        label: stryMutAct_9fa48("9934") ? "" : (stryCov_9fa48("9934"), "Parciales"),
        unit: stryMutAct_9fa48("9935") ? "" : (stryCov_9fa48("9935"), "objetivos")
      }), stryMutAct_9fa48("9936") ? {} : (stryCov_9fa48("9936"), {
        value: wire.totals.pending,
        label: stryMutAct_9fa48("9937") ? "" : (stryCov_9fa48("9937"), "Pendientes"),
        unit: stryMutAct_9fa48("9938") ? "" : (stryCov_9fa48("9938"), "objetivos")
      }), stryMutAct_9fa48("9939") ? {} : (stryCov_9fa48("9939"), {
        value: stryMutAct_9fa48("9940") ? wire.totals.upcoming && null : (stryCov_9fa48("9940"), wire.totals.upcoming ?? null),
        label: stryMutAct_9fa48("9941") ? "" : (stryCov_9fa48("9941"), "Programado a futuro"),
        unit: stryMutAct_9fa48("9942") ? "" : (stryCov_9fa48("9942"), "objetivos")
      }), stryMutAct_9fa48("9943") ? {} : (stryCov_9fa48("9943"), {
        value: wire.totals.scheduled,
        label: stryMutAct_9fa48("9944") ? "" : (stryCov_9fa48("9944"), "Programados"),
        unit: stryMutAct_9fa48("9945") ? "" : (stryCov_9fa48("9945"), "objetivos")
      })]),
      breakdowns: stryMutAct_9fa48("9946") ? [] : (stryCov_9fa48("9946"), [stryMutAct_9fa48("9947") ? {} : (stryCov_9fa48("9947"), {
        target: coverageTarget,
        id: stryMutAct_9fa48("9948") ? "" : (stryCov_9fa48("9948"), "zones"),
        title: stryMutAct_9fa48("9949") ? "" : (stryCov_9fa48("9949"), "Cobertura por zona"),
        description: stryMutAct_9fa48("9950") ? "" : (stryCov_9fa48("9950"), "Objetivos atendidos sobre objetivos programados."),
        points: coveragePoints(wire.byZone)
      }), stryMutAct_9fa48("9951") ? {} : (stryCov_9fa48("9951"), {
        target: coverageTarget,
        id: stryMutAct_9fa48("9952") ? "" : (stryCov_9fa48("9952"), "service-types"),
        title: stryMutAct_9fa48("9953") ? "" : (stryCov_9fa48("9953"), "Cobertura por tipo de servicio"),
        description: stryMutAct_9fa48("9954") ? "" : (stryCov_9fa48("9954"), "Comparación de cobertura entre servicios."),
        points: coveragePoints(wire.byServiceType)
      })])
    });
  }
}
function normalizeCompliance(wire: ComplianceWire, readAt: string): ComplianceIndicator {
  if (stryMutAct_9fa48("9955")) {
    {}
  } else {
    stryCov_9fa48("9955");
    const reasonLabel = stryMutAct_9fa48("9956") ? () => undefined : (stryCov_9fa48("9956"), (() => {
      const reasonLabel = (reason: string | null) => (stryMutAct_9fa48("9959") ? reason !== null : stryMutAct_9fa48("9958") ? false : stryMutAct_9fa48("9957") ? true : (stryCov_9fa48("9957", "9958", "9959"), reason === null)) ? stryMutAct_9fa48("9960") ? "" : (stryCov_9fa48("9960"), "Sin motivo registrado") : labelFor(NOT_SERVICED_REASON_LABEL, reason);
      return reasonLabel;
    })());
    return stryMutAct_9fa48("9961") ? {} : (stryCov_9fa48("9961"), {
      targets: wire.targets,
      series: wire.series,
      previous: wire.previous,
      delta: wire.delta,
      schedulingDeviation: wire.schedulingDeviation,
      finished: wire.finished,
      family: stryMutAct_9fa48("9962") ? "" : (stryCov_9fa48("9962"), "compliance"),
      period: wire.period,
      freshness: stryMutAct_9fa48("9963") ? {} : (stryCov_9fa48("9963"), {
        updatedAt: readAt
      }),
      primary: stryMutAct_9fa48("9964") ? {} : (stryCov_9fa48("9964"), {
        value: wire.finished.onTimePct,
        label: stryMutAct_9fa48("9965") ? "" : (stryCov_9fa48("9965"), "Cumplimiento en fecha"),
        unit: stryMutAct_9fa48("9966") ? "" : (stryCov_9fa48("9966"), "%")
      }),
      summaryMetrics: stryMutAct_9fa48("9967") ? [] : (stryCov_9fa48("9967"), [stryMutAct_9fa48("9968") ? {} : (stryCov_9fa48("9968"), {
        value: wire.finished.total,
        label: stryMutAct_9fa48("9969") ? "" : (stryCov_9fa48("9969"), "Finalizados"),
        unit: stryMutAct_9fa48("9970") ? "" : (stryCov_9fa48("9970"), "servicios")
      }), stryMutAct_9fa48("9971") ? {} : (stryCov_9fa48("9971"), {
        value: wire.finished.onTime,
        label: stryMutAct_9fa48("9972") ? "" : (stryCov_9fa48("9972"), "En fecha"),
        unit: stryMutAct_9fa48("9973") ? "" : (stryCov_9fa48("9973"), "servicios")
      }), stryMutAct_9fa48("9974") ? {} : (stryCov_9fa48("9974"), {
        value: wire.finished.late,
        label: stryMutAct_9fa48("9975") ? "" : (stryCov_9fa48("9975"), "Demorados"),
        unit: stryMutAct_9fa48("9976") ? "" : (stryCov_9fa48("9976"), "servicios")
      })]),
      breakdowns: stryMutAct_9fa48("9977") ? [] : (stryCov_9fa48("9977"), [stryMutAct_9fa48("9978") ? {} : (stryCov_9fa48("9978"), {
        id: stryMutAct_9fa48("9979") ? "" : (stryCov_9fa48("9979"), "completion"),
        title: stryMutAct_9fa48("9980") ? "" : (stryCov_9fa48("9980"), "Finalización en fecha"),
        description: stryMutAct_9fa48("9981") ? `` : (stryCov_9fa48("9981"), `${wire.finished.total} servicios finalizados en el período.`),
        points: stryMutAct_9fa48("9982") ? [] : (stryCov_9fa48("9982"), [stryMutAct_9fa48("9983") ? {} : (stryCov_9fa48("9983"), {
          id: stryMutAct_9fa48("9984") ? "" : (stryCov_9fa48("9984"), "on-time"),
          label: stryMutAct_9fa48("9985") ? "" : (stryCov_9fa48("9985"), "En fecha"),
          value: wire.finished.onTime,
          unit: stryMutAct_9fa48("9986") ? "" : (stryCov_9fa48("9986"), "servicios"),
          tone: stryMutAct_9fa48("9987") ? "" : (stryCov_9fa48("9987"), "success")
        }), stryMutAct_9fa48("9988") ? {} : (stryCov_9fa48("9988"), {
          id: stryMutAct_9fa48("9989") ? "" : (stryCov_9fa48("9989"), "delayed"),
          label: stryMutAct_9fa48("9990") ? "" : (stryCov_9fa48("9990"), "Demorados"),
          value: wire.finished.late,
          unit: stryMutAct_9fa48("9991") ? "" : (stryCov_9fa48("9991"), "servicios"),
          tone: stryMutAct_9fa48("9992") ? "" : (stryCov_9fa48("9992"), "warning")
        })])
      }), stryMutAct_9fa48("9993") ? {} : (stryCov_9fa48("9993"), {
        id: stryMutAct_9fa48("9994") ? "" : (stryCov_9fa48("9994"), "unattended-zones"),
        title: stryMutAct_9fa48("9995") ? "" : (stryCov_9fa48("9995"), "Zonas sin atención"),
        description: stryMutAct_9fa48("9996") ? "" : (stryCov_9fa48("9996"), "Ranking de zonas no atendidas y motivos registrados."),
        points: wire.notServicedRanking.map(stryMutAct_9fa48("9997") ? () => undefined : (stryCov_9fa48("9997"), (zone): IndicatorPoint => stryMutAct_9fa48("9998") ? {} : (stryCov_9fa48("9998"), {
          id: zone.zoneId,
          label: zone.name,
          value: zone.count,
          unit: stryMutAct_9fa48("9999") ? "" : (stryCov_9fa48("9999"), "objetivos"),
          note: stryMutAct_9fa48("10002") ? zone.reasons.map(item => reasonLabel(item.reason)).join(" · ") && "Sin motivo registrado" : stryMutAct_9fa48("10001") ? false : stryMutAct_9fa48("10000") ? true : (stryCov_9fa48("10000", "10001", "10002"), zone.reasons.map(stryMutAct_9fa48("10003") ? () => undefined : (stryCov_9fa48("10003"), item => reasonLabel(item.reason))).join(stryMutAct_9fa48("10004") ? "" : (stryCov_9fa48("10004"), " · ")) || (stryMutAct_9fa48("10005") ? "" : (stryCov_9fa48("10005"), "Sin motivo registrado"))),
          details: zone.reasons.map(stryMutAct_9fa48("10006") ? () => undefined : (stryCov_9fa48("10006"), item => stryMutAct_9fa48("10007") ? {} : (stryCov_9fa48("10007"), {
            label: reasonLabel(item.reason),
            value: item.count,
            unit: stryMutAct_9fa48("10008") ? "" : (stryCov_9fa48("10008"), "objetivos")
          }))),
          tone: stryMutAct_9fa48("10009") ? "" : (stryCov_9fa48("10009"), "warning")
        })))
      })])
    });
  }
}
function normalizeIncidents(wire: IncidentsWire, readAt: string): IncidentsIndicator {
  if (stryMutAct_9fa48("10010")) {
    {}
  } else {
    stryCov_9fa48("10010");
    const riskLevels = stryMutAct_9fa48("10011") ? [...wire.trees.byRiskLevel] : (stryCov_9fa48("10011"), (stryMutAct_9fa48("10012") ? [] : (stryCov_9fa48("10012"), [...wire.trees.byRiskLevel])).sort(stryMutAct_9fa48("10013") ? () => undefined : (stryCov_9fa48("10013"), (a, b) => stryMutAct_9fa48("10014") ? RISK_LEVEL_ORDER.indexOf(a.riskLevel) + RISK_LEVEL_ORDER.indexOf(b.riskLevel) : (stryCov_9fa48("10014"), RISK_LEVEL_ORDER.indexOf(a.riskLevel) - RISK_LEVEL_ORDER.indexOf(b.riskLevel)))));
    return stryMutAct_9fa48("10015") ? {} : (stryCov_9fa48("10015"), {
      targets: wire.targets,
      series: wire.series,
      previous: wire.previous,
      delta: wire.delta,
      containers: wire.containers,
      reports: wire.reports,
      family: stryMutAct_9fa48("10016") ? "" : (stryCov_9fa48("10016"), "incidents"),
      period: wire.period,
      freshness: stryMutAct_9fa48("10017") ? {} : (stryCov_9fa48("10017"), {
        updatedAt: readAt
      }),
      primary: (stryMutAct_9fa48("10020") ? wire.reports.avgResolutionBusinessDays !== undefined : stryMutAct_9fa48("10019") ? false : stryMutAct_9fa48("10018") ? true : (stryCov_9fa48("10018", "10019", "10020"), wire.reports.avgResolutionBusinessDays === undefined)) ? stryMutAct_9fa48("10021") ? {} : (stryCov_9fa48("10021"), {
        value: wire.reports.avgResolutionDays,
        label: stryMutAct_9fa48("10022") ? "" : (stryCov_9fa48("10022"), "Resolución media de reportes"),
        unit: stryMutAct_9fa48("10023") ? "" : (stryCov_9fa48("10023"), "días corridos")
      }) : stryMutAct_9fa48("10024") ? {} : (stryCov_9fa48("10024"), {
        value: wire.reports.avgResolutionBusinessDays,
        label: stryMutAct_9fa48("10025") ? "" : (stryCov_9fa48("10025"), "Resolución media de reportes"),
        unit: stryMutAct_9fa48("10026") ? "" : (stryCov_9fa48("10026"), "días hábiles")
      }),
      breakdowns: stryMutAct_9fa48("10027") ? [] : (stryCov_9fa48("10027"), [stryMutAct_9fa48("10028") ? {} : (stryCov_9fa48("10028"), {
        id: stryMutAct_9fa48("10029") ? "" : (stryCov_9fa48("10029"), "containers"),
        title: stryMutAct_9fa48("10030") ? "" : (stryCov_9fa48("10030"), "Contenedores por zona"),
        description: stryMutAct_9fa48("10031") ? "" : (stryCov_9fa48("10031"), "Estado actual de desbordes y daños por zona; valores en incidentes."),
        points: wire.containers.byZone.map(stryMutAct_9fa48("10032") ? () => undefined : (stryCov_9fa48("10032"), (zone): IndicatorPoint => stryMutAct_9fa48("10033") ? {} : (stryCov_9fa48("10033"), {
          id: zone.zoneId,
          label: zone.name,
          value: stryMutAct_9fa48("10034") ? zone.overflowed - zone.damaged : (stryCov_9fa48("10034"), zone.overflowed + zone.damaged),
          unit: stryMutAct_9fa48("10035") ? "" : (stryCov_9fa48("10035"), "incidentes"),
          note: stryMutAct_9fa48("10036") ? `` : (stryCov_9fa48("10036"), `${zone.overflowed} desbordes · ${zone.damaged} daños sobre ${zone.total} contenedores`),
          details: stryMutAct_9fa48("10037") ? [] : (stryCov_9fa48("10037"), [stryMutAct_9fa48("10038") ? {} : (stryCov_9fa48("10038"), {
            label: stryMutAct_9fa48("10039") ? "" : (stryCov_9fa48("10039"), "Desbordes"),
            value: zone.overflowed,
            unit: stryMutAct_9fa48("10040") ? "" : (stryCov_9fa48("10040"), "incidentes")
          }), stryMutAct_9fa48("10041") ? {} : (stryCov_9fa48("10041"), {
            label: stryMutAct_9fa48("10042") ? "" : (stryCov_9fa48("10042"), "Daños"),
            value: zone.damaged,
            unit: stryMutAct_9fa48("10043") ? "" : (stryCov_9fa48("10043"), "incidentes")
          }), stryMutAct_9fa48("10044") ? {} : (stryCov_9fa48("10044"), {
            label: stryMutAct_9fa48("10045") ? "" : (stryCov_9fa48("10045"), "Contenedores"),
            value: zone.total,
            unit: stryMutAct_9fa48("10046") ? "" : (stryCov_9fa48("10046"), "contenedores")
          })]),
          tone: (stryMutAct_9fa48("10050") ? zone.overflowed + zone.damaged <= 4 : stryMutAct_9fa48("10049") ? zone.overflowed + zone.damaged >= 4 : stryMutAct_9fa48("10048") ? false : stryMutAct_9fa48("10047") ? true : (stryCov_9fa48("10047", "10048", "10049", "10050"), (stryMutAct_9fa48("10051") ? zone.overflowed - zone.damaged : (stryCov_9fa48("10051"), zone.overflowed + zone.damaged)) > 4)) ? stryMutAct_9fa48("10052") ? "" : (stryCov_9fa48("10052"), "danger") : stryMutAct_9fa48("10053") ? "" : (stryCov_9fa48("10053"), "primary")
        })))
      }), stryMutAct_9fa48("10054") ? {} : (stryCov_9fa48("10054"), {
        id: stryMutAct_9fa48("10055") ? "" : (stryCov_9fa48("10055"), "container-status"),
        title: stryMutAct_9fa48("10056") ? "" : (stryCov_9fa48("10056"), "Contenedores por estado"),
        description: stryMutAct_9fa48("10057") ? "" : (stryCov_9fa48("10057"), "Estado actual del parque de contenedores."),
        points: wire.containers.byStatus.map(stryMutAct_9fa48("10058") ? () => undefined : (stryCov_9fa48("10058"), (item): IndicatorPoint => stryMutAct_9fa48("10059") ? {} : (stryCov_9fa48("10059"), {
          id: item.status,
          label: labelFor(CONTAINER_STATUS_LABELS, item.status),
          value: item.count,
          unit: stryMutAct_9fa48("10060") ? "" : (stryCov_9fa48("10060"), "contenedores"),
          tone: (stryMutAct_9fa48("10063") ? item.status !== "ACTIVE" : stryMutAct_9fa48("10062") ? false : stryMutAct_9fa48("10061") ? true : (stryCov_9fa48("10061", "10062", "10063"), item.status === (stryMutAct_9fa48("10064") ? "" : (stryCov_9fa48("10064"), "ACTIVE")))) ? stryMutAct_9fa48("10065") ? "" : (stryCov_9fa48("10065"), "success") : (stryMutAct_9fa48("10068") ? item.status === "OVERFLOWED" && item.status === "DAMAGED" : stryMutAct_9fa48("10067") ? false : stryMutAct_9fa48("10066") ? true : (stryCov_9fa48("10066", "10067", "10068"), (stryMutAct_9fa48("10070") ? item.status !== "OVERFLOWED" : stryMutAct_9fa48("10069") ? false : (stryCov_9fa48("10069", "10070"), item.status === (stryMutAct_9fa48("10071") ? "" : (stryCov_9fa48("10071"), "OVERFLOWED")))) || (stryMutAct_9fa48("10073") ? item.status !== "DAMAGED" : stryMutAct_9fa48("10072") ? false : (stryCov_9fa48("10072", "10073"), item.status === (stryMutAct_9fa48("10074") ? "" : (stryCov_9fa48("10074"), "DAMAGED")))))) ? stryMutAct_9fa48("10075") ? "" : (stryCov_9fa48("10075"), "danger") : stryMutAct_9fa48("10076") ? "" : (stryCov_9fa48("10076"), "warning")
        })))
      }), stryMutAct_9fa48("10077") ? {} : (stryCov_9fa48("10077"), {
        id: stryMutAct_9fa48("10078") ? "" : (stryCov_9fa48("10078"), "tree-risk"),
        title: stryMutAct_9fa48("10079") ? "" : (stryCov_9fa48("10079"), "Riesgo de arbolado"),
        description: stryMutAct_9fa48("10080") ? "" : (stryCov_9fa48("10080"), "Inventario actual por nivel de riesgo; valores en árboles."),
        points: riskLevels.map(stryMutAct_9fa48("10081") ? () => undefined : (stryCov_9fa48("10081"), (item): IndicatorPoint => stryMutAct_9fa48("10082") ? {} : (stryCov_9fa48("10082"), {
          id: item.riskLevel,
          label: labelFor(RISK_LEVEL_LABELS, item.riskLevel),
          value: item.count,
          unit: stryMutAct_9fa48("10083") ? "" : (stryCov_9fa48("10083"), "árboles"),
          tone: (stryMutAct_9fa48("10086") ? item.riskLevel === "CRITICAL" && item.riskLevel === "HIGH" : stryMutAct_9fa48("10085") ? false : stryMutAct_9fa48("10084") ? true : (stryCov_9fa48("10084", "10085", "10086"), (stryMutAct_9fa48("10088") ? item.riskLevel !== "CRITICAL" : stryMutAct_9fa48("10087") ? false : (stryCov_9fa48("10087", "10088"), item.riskLevel === (stryMutAct_9fa48("10089") ? "" : (stryCov_9fa48("10089"), "CRITICAL")))) || (stryMutAct_9fa48("10091") ? item.riskLevel !== "HIGH" : stryMutAct_9fa48("10090") ? false : (stryCov_9fa48("10090", "10091"), item.riskLevel === (stryMutAct_9fa48("10092") ? "" : (stryCov_9fa48("10092"), "HIGH")))))) ? stryMutAct_9fa48("10093") ? "" : (stryCov_9fa48("10093"), "danger") : (stryMutAct_9fa48("10096") ? item.riskLevel !== "NONE" : stryMutAct_9fa48("10095") ? false : stryMutAct_9fa48("10094") ? true : (stryCov_9fa48("10094", "10095", "10096"), item.riskLevel === (stryMutAct_9fa48("10097") ? "" : (stryCov_9fa48("10097"), "NONE")))) ? stryMutAct_9fa48("10098") ? "" : (stryCov_9fa48("10098"), "success") : stryMutAct_9fa48("10099") ? "" : (stryCov_9fa48("10099"), "warning")
        })))
      }), stryMutAct_9fa48("10100") ? {} : (stryCov_9fa48("10100"), {
        id: stryMutAct_9fa48("10101") ? "" : (stryCov_9fa48("10101"), "reports"),
        title: stryMutAct_9fa48("10102") ? "" : (stryCov_9fa48("10102"), "Reportes por tipo"),
        description: stryMutAct_9fa48("10103") ? `` : (stryCov_9fa48("10103"), `${wire.reports.total} reportes recibidos en el período; valores en reportes.`),
        points: wire.reports.byType.map(stryMutAct_9fa48("10104") ? () => undefined : (stryCov_9fa48("10104"), item => stryMutAct_9fa48("10105") ? {} : (stryCov_9fa48("10105"), {
          id: item.reportType,
          label: labelFor(ENVIRONMENTAL_REPORT_TYPE_LABELS, item.reportType),
          value: item.count,
          unit: stryMutAct_9fa48("10106") ? "" : (stryCov_9fa48("10106"), "reportes")
        })))
      }), stryMutAct_9fa48("10107") ? {} : (stryCov_9fa48("10107"), {
        id: stryMutAct_9fa48("10108") ? "" : (stryCov_9fa48("10108"), "report-status"),
        title: stryMutAct_9fa48("10109") ? "" : (stryCov_9fa48("10109"), "Reportes por estado"),
        description: stryMutAct_9fa48("10110") ? "" : (stryCov_9fa48("10110"), "Reportes recibidos en el período, distribuidos por estado."),
        points: wire.reports.byStatus.map(stryMutAct_9fa48("10111") ? () => undefined : (stryCov_9fa48("10111"), (item): IndicatorPoint => stryMutAct_9fa48("10112") ? {} : (stryCov_9fa48("10112"), {
          id: item.status,
          label: labelFor(ENVIRONMENTAL_REPORT_STATUS_LABELS, item.status),
          value: item.count,
          unit: stryMutAct_9fa48("10113") ? "" : (stryCov_9fa48("10113"), "reportes"),
          tone: (stryMutAct_9fa48("10116") ? item.status !== "CLOSED" : stryMutAct_9fa48("10115") ? false : stryMutAct_9fa48("10114") ? true : (stryCov_9fa48("10114", "10115", "10116"), item.status === (stryMutAct_9fa48("10117") ? "" : (stryCov_9fa48("10117"), "CLOSED")))) ? stryMutAct_9fa48("10118") ? "" : (stryCov_9fa48("10118"), "success") : (stryMutAct_9fa48("10121") ? item.status !== "RECEIVED" : stryMutAct_9fa48("10120") ? false : stryMutAct_9fa48("10119") ? true : (stryCov_9fa48("10119", "10120", "10121"), item.status === (stryMutAct_9fa48("10122") ? "" : (stryCov_9fa48("10122"), "RECEIVED")))) ? stryMutAct_9fa48("10123") ? "" : (stryCov_9fa48("10123"), "danger") : stryMutAct_9fa48("10124") ? "" : (stryCov_9fa48("10124"), "warning")
        })))
      })])
    });
  }
}
function normalizeWaste(wire: WasteWire, readAt: string): WasteIndicator {
  if (stryMutAct_9fa48("10125")) {
    {}
  } else {
    stryCov_9fa48("10125");
    const massPoint = stryMutAct_9fa48("10126") ? () => undefined : (stryCov_9fa48("10126"), (() => {
      const massPoint = (id: string, label: string, weightKg: number, volumeM3: number): IndicatorPoint => stryMutAct_9fa48("10127") ? {} : (stryCov_9fa48("10127"), {
        id,
        label,
        value: weightKg,
        unit: stryMutAct_9fa48("10128") ? "" : (stryCov_9fa48("10128"), "kg"),
        note: stryMutAct_9fa48("10129") ? `` : (stryCov_9fa48("10129"), `${volumeM3.toLocaleString(stryMutAct_9fa48("10130") ? "" : (stryCov_9fa48("10130"), "es-AR"))} m³`),
        details: stryMutAct_9fa48("10131") ? [] : (stryCov_9fa48("10131"), [stryMutAct_9fa48("10132") ? {} : (stryCov_9fa48("10132"), {
          label: stryMutAct_9fa48("10133") ? "" : (stryCov_9fa48("10133"), "Metros cúbicos"),
          value: volumeM3,
          unit: stryMutAct_9fa48("10134") ? "" : (stryCov_9fa48("10134"), "m³")
        })])
      });
      return massPoint;
    })());
    return stryMutAct_9fa48("10135") ? {} : (stryCov_9fa48("10135"), {
      targets: wire.targets,
      series: wire.series,
      previous: wire.previous,
      delta: wire.delta,
      family: stryMutAct_9fa48("10136") ? "" : (stryCov_9fa48("10136"), "waste"),
      period: wire.period,
      freshness: stryMutAct_9fa48("10137") ? {} : (stryCov_9fa48("10137"), {
        updatedAt: readAt
      }),
      primary: stryMutAct_9fa48("10138") ? {} : (stryCov_9fa48("10138"), {
        value: wire.totals.divertedPct,
        label: stryMutAct_9fa48("10139") ? "" : (stryCov_9fa48("10139"), "Desvío de relleno sanitario"),
        unit: stryMutAct_9fa48("10140") ? "" : (stryCov_9fa48("10140"), "%")
      }),
      summaryMetrics: stryMutAct_9fa48("10141") ? [] : (stryCov_9fa48("10141"), [stryMutAct_9fa48("10142") ? {} : (stryCov_9fa48("10142"), {
        value: wire.totals.weightKg,
        label: stryMutAct_9fa48("10143") ? "" : (stryCov_9fa48("10143"), "Peso registrado"),
        unit: stryMutAct_9fa48("10144") ? "" : (stryCov_9fa48("10144"), "kg")
      }), stryMutAct_9fa48("10145") ? {} : (stryCov_9fa48("10145"), {
        value: wire.totals.divertedKg,
        label: stryMutAct_9fa48("10146") ? "" : (stryCov_9fa48("10146"), "Desviado del relleno"),
        unit: stryMutAct_9fa48("10147") ? "" : (stryCov_9fa48("10147"), "kg")
      }), stryMutAct_9fa48("10148") ? {} : (stryCov_9fa48("10148"), {
        value: wire.totals.volumeM3,
        label: stryMutAct_9fa48("10149") ? "" : (stryCov_9fa48("10149"), "Volumen registrado"),
        unit: stryMutAct_9fa48("10150") ? "" : (stryCov_9fa48("10150"), "m³")
      })]),
      breakdowns: stryMutAct_9fa48("10151") ? [] : (stryCov_9fa48("10151"), [stryMutAct_9fa48("10152") ? {} : (stryCov_9fa48("10152"), {
        id: stryMutAct_9fa48("10153") ? "" : (stryCov_9fa48("10153"), "types"),
        title: stryMutAct_9fa48("10154") ? "" : (stryCov_9fa48("10154"), "Residuos por tipo"),
        description: stryMutAct_9fa48("10155") ? `` : (stryCov_9fa48("10155"), `${wire.records} registros de disposición en el período.`),
        points: wire.byWasteType.map(stryMutAct_9fa48("10156") ? () => undefined : (stryCov_9fa48("10156"), item => massPoint(item.wasteType, labelFor(WASTE_TYPE_LABELS, item.wasteType), item.weightKg, item.volumeM3)))
      }), stryMutAct_9fa48("10157") ? {} : (stryCov_9fa48("10157"), {
        id: stryMutAct_9fa48("10158") ? "" : (stryCov_9fa48("10158"), "destinations"),
        title: stryMutAct_9fa48("10159") ? "" : (stryCov_9fa48("10159"), "Residuos por destino"),
        description: stryMutAct_9fa48("10160") ? "" : (stryCov_9fa48("10160"), "Kilogramos y metros cúbicos enviados a cada destino."),
        points: wire.byDisposalSite.map(stryMutAct_9fa48("10161") ? () => undefined : (stryCov_9fa48("10161"), item => massPoint(item.disposalSiteId, item.name, item.weightKg, item.volumeM3)))
      })])
    });
  }
}
async function get<T>(family: string, query: IndicatorQuery, schema: z.ZodType<T>, normalize: (wire: T, readAt: string) => T extends CoverageWire ? CoverageIndicator : T extends ComplianceWire ? ComplianceIndicator : T extends IncidentsWire ? IncidentsIndicator : WasteIndicator, message: string, withSeries = stryMutAct_9fa48("10162") ? false : (stryCov_9fa48("10162"), true)) {
  if (stryMutAct_9fa48("10163")) {
    {}
  } else {
    stryCov_9fa48("10163");
    const parsed = schema.safeParse(await request(stryMutAct_9fa48("10164") ? `` : (stryCov_9fa48("10164"), `/api/indicators/${family}${queryString(query, family, withSeries)}`)));
    if (stryMutAct_9fa48("10167") ? false : stryMutAct_9fa48("10166") ? true : stryMutAct_9fa48("10165") ? parsed.success : (stryCov_9fa48("10165", "10166", "10167"), !parsed.success)) {
      if (stryMutAct_9fa48("10168")) {
        {}
      } else {
        stryCov_9fa48("10168");
        recordTelemetryEvent(stryMutAct_9fa48("10170") ? {} : (stryCov_9fa48("10170"), {
          name: stryMutAct_9fa48("10171") ? "" : (stryCov_9fa48("10171"), "request_malformed_response"),
          resource: stryMutAct_9fa48("10172") ? "" : (stryCov_9fa48("10172"), "indicators")
        }));
        throw new IndicatorContractError(message, stryMutAct_9fa48("10174") ? {} : (stryCov_9fa48("10174"), {
          cause: parsed.error
        }));
      }
    }
    // El backend calcula los indicadores en cada consulta y no devuelve una marca
    // de actualización, así que la frescura es el momento de la lectura.
    return normalize(parsed.data, new Date().toISOString());
  }
}
export const indicatorsAdapter = stryMutAct_9fa48("10175") ? {} : (stryCov_9fa48("10175"), {
  async getCoverage(query: IndicatorQuery = {}): Promise<CoverageIndicator> {
    if (stryMutAct_9fa48("10176")) {
      {}
    } else {
      stryCov_9fa48("10176");
      const contractMessage = stryMutAct_9fa48("10177") ? "" : (stryCov_9fa48("10177"), "La cobertura no respeta el contrato de indicadores.");
      const seriesBucket = coverageBucket(query);
      try {
        if (stryMutAct_9fa48("10178")) {
          {}
        } else {
          stryCov_9fa48("10178");
          return stryMutAct_9fa48("10179") ? {} : (stryCov_9fa48("10179"), {
            ...(await get(stryMutAct_9fa48("10180") ? "" : (stryCov_9fa48("10180"), "coverage"), query, coverageWireSchema, normalizeCoverage, contractMessage)),
            seriesBucket
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("10181")) {
          {}
        } else {
          stryCov_9fa48("10181");
          if (stryMutAct_9fa48("10184") ? false : stryMutAct_9fa48("10183") ? true : stryMutAct_9fa48("10182") ? isTooManySeriesPoints(error) : (stryCov_9fa48("10182", "10183", "10184"), !isTooManySeriesPoints(error))) throw error;
          // Si el rango no admite serie, el resto de la familia se muestra igual y la tendencia explica el rechazo.
          try {
            if (stryMutAct_9fa48("10185")) {
              {}
            } else {
              stryCov_9fa48("10185");
              return stryMutAct_9fa48("10186") ? {} : (stryCov_9fa48("10186"), {
                ...(await get(stryMutAct_9fa48("10187") ? "" : (stryCov_9fa48("10187"), "coverage"), query, coverageWireSchema, normalizeCoverage, contractMessage, stryMutAct_9fa48("10188") ? true : (stryCov_9fa48("10188"), false))),
                seriesBucket,
                seriesError: error.message
              });
            }
          } catch {
            if (stryMutAct_9fa48("10189")) {
              {}
            } else {
              stryCov_9fa48("10189");
              throw error;
            }
          }
        }
      }
    }
  },
  getCompliance(query: IndicatorQuery = {}) {
    if (stryMutAct_9fa48("10190")) {
      {}
    } else {
      stryCov_9fa48("10190");
      return get(stryMutAct_9fa48("10191") ? "" : (stryCov_9fa48("10191"), "compliance"), query, complianceWireSchema, normalizeCompliance, stryMutAct_9fa48("10192") ? "" : (stryCov_9fa48("10192"), "El cumplimiento no respeta el contrato de indicadores."));
    }
  },
  getIncidents(query: IndicatorQuery = {}) {
    if (stryMutAct_9fa48("10193")) {
      {}
    } else {
      stryCov_9fa48("10193");
      return get(stryMutAct_9fa48("10194") ? "" : (stryCov_9fa48("10194"), "incidents"), query, incidentsWireSchema, normalizeIncidents, stryMutAct_9fa48("10195") ? "" : (stryCov_9fa48("10195"), "Las incidencias no respetan el contrato de indicadores."));
    }
  },
  getWaste(query: IndicatorQuery = {}) {
    if (stryMutAct_9fa48("10196")) {
      {}
    } else {
      stryCov_9fa48("10196");
      return get(stryMutAct_9fa48("10197") ? "" : (stryCov_9fa48("10197"), "waste"), query, wasteWireSchema, normalizeWaste, stryMutAct_9fa48("10198") ? "" : (stryCov_9fa48("10198"), "Los residuos no respetan el contrato de indicadores."));
    }
  }
});
export const getCoverage = indicatorsAdapter.getCoverage;
export const getCompliance = indicatorsAdapter.getCompliance;
export const getIncidents = indicatorsAdapter.getIncidents;
export const getWaste = indicatorsAdapter.getWaste;
export type IndicatorTargetDefinition = {
  target: {
    comparator: "≥" | "≤";
    value: number;
    unit: "%" | "días" | "días hábiles";
  } | null;
  direction: "more-is-better" | "less-is-better";
};
export const INDICATOR_TARGETS = {
  coverage: {
    target: {
      comparator: "≥",
      value: 95,
      unit: "%"
    },
    direction: "more-is-better"
  },
  compliance: {
    target: {
      comparator: "≥",
      value: 90,
      unit: "%"
    },
    direction: "more-is-better"
  },
  incidents: {
    target: {
      comparator: "≤",
      value: 5,
      unit: "días hábiles"
    },
    direction: "less-is-better"
  },
  waste: {
    target: null,
    direction: "more-is-better"
  }
} as const satisfies Record<IndicatorFamily, IndicatorTargetDefinition>;
export function defaultIndicatorTarget(family: IndicatorFamily): IndicatorTarget {
  if (stryMutAct_9fa48("10199")) {
    {}
  } else {
    stryCov_9fa48("10199");
    const {
      target,
      direction
    } = INDICATOR_TARGETS[family];
    if (stryMutAct_9fa48("10202") ? false : stryMutAct_9fa48("10201") ? true : stryMutAct_9fa48("10200") ? target : (stryCov_9fa48("10200", "10201", "10202"), !target)) return null;
    return stryMutAct_9fa48("10203") ? {} : (stryCov_9fa48("10203"), {
      value: target.value,
      direction: (stryMutAct_9fa48("10206") ? direction !== "less-is-better" : stryMutAct_9fa48("10205") ? false : stryMutAct_9fa48("10204") ? true : (stryCov_9fa48("10204", "10205", "10206"), direction === (stryMutAct_9fa48("10207") ? "" : (stryCov_9fa48("10207"), "less-is-better")))) ? stryMutAct_9fa48("10208") ? "" : (stryCov_9fa48("10208"), "max") : stryMutAct_9fa48("10209") ? "" : (stryCov_9fa48("10209"), "min")
    });
  }
}
export function hasNumericThreshold(target: IndicatorTarget | undefined): target is {
  value: number;
  direction: "min" | "max";
} {
  if (stryMutAct_9fa48("10210")) {
    {}
  } else {
    stryCov_9fa48("10210");
    return stryMutAct_9fa48("10213") ? target !== undefined && target !== null && target.value !== null || target.direction === "min" || target.direction === "max" : stryMutAct_9fa48("10212") ? false : stryMutAct_9fa48("10211") ? true : (stryCov_9fa48("10211", "10212", "10213"), (stryMutAct_9fa48("10215") ? target !== undefined && target !== null || target.value !== null : stryMutAct_9fa48("10214") ? true : (stryCov_9fa48("10214", "10215"), (stryMutAct_9fa48("10217") ? target !== undefined || target !== null : stryMutAct_9fa48("10216") ? true : (stryCov_9fa48("10216", "10217"), (stryMutAct_9fa48("10219") ? target === undefined : stryMutAct_9fa48("10218") ? true : (stryCov_9fa48("10218", "10219"), target !== undefined)) && (stryMutAct_9fa48("10221") ? target === null : stryMutAct_9fa48("10220") ? true : (stryCov_9fa48("10220", "10221"), target !== null)))) && (stryMutAct_9fa48("10223") ? target.value === null : stryMutAct_9fa48("10222") ? true : (stryCov_9fa48("10222", "10223"), target.value !== null)))) && (stryMutAct_9fa48("10225") ? target.direction === "min" && target.direction === "max" : stryMutAct_9fa48("10224") ? true : (stryCov_9fa48("10224", "10225"), (stryMutAct_9fa48("10227") ? target.direction !== "min" : stryMutAct_9fa48("10226") ? false : (stryCov_9fa48("10226", "10227"), target.direction === (stryMutAct_9fa48("10228") ? "" : (stryCov_9fa48("10228"), "min")))) || (stryMutAct_9fa48("10230") ? target.direction !== "max" : stryMutAct_9fa48("10229") ? false : (stryCov_9fa48("10229", "10230"), target.direction === (stryMutAct_9fa48("10231") ? "" : (stryCov_9fa48("10231"), "max")))))));
  }
}
export type CoverageCsvRow = {
  name: string;
  scheduled: number;
  served: number;
  partial: number;
  notServiced: number;
  pending: number;
  coveragePct: number;
  upcoming?: number | null;
  lowSample?: boolean;
};
export function isCoverageBelowTarget(scheduled: number, coveragePct: number, target: IndicatorTarget = defaultIndicatorTarget(stryMutAct_9fa48("10232") ? "" : (stryCov_9fa48("10232"), "coverage"))) {
  if (stryMutAct_9fa48("10233")) {
    {}
  } else {
    stryCov_9fa48("10233");
    return stryMutAct_9fa48("10236") ? scheduled > 0 && hasNumericThreshold(target) || (target.direction === "min" ? coveragePct < target.value : coveragePct > target.value) : stryMutAct_9fa48("10235") ? false : stryMutAct_9fa48("10234") ? true : (stryCov_9fa48("10234", "10235", "10236"), (stryMutAct_9fa48("10238") ? scheduled > 0 || hasNumericThreshold(target) : stryMutAct_9fa48("10237") ? true : (stryCov_9fa48("10237", "10238"), (stryMutAct_9fa48("10241") ? scheduled <= 0 : stryMutAct_9fa48("10240") ? scheduled >= 0 : stryMutAct_9fa48("10239") ? true : (stryCov_9fa48("10239", "10240", "10241"), scheduled > 0)) && hasNumericThreshold(target))) && ((stryMutAct_9fa48("10244") ? target.direction !== "min" : stryMutAct_9fa48("10243") ? false : stryMutAct_9fa48("10242") ? true : (stryCov_9fa48("10242", "10243", "10244"), target.direction === (stryMutAct_9fa48("10245") ? "" : (stryCov_9fa48("10245"), "min")))) ? stryMutAct_9fa48("10249") ? coveragePct >= target.value : stryMutAct_9fa48("10248") ? coveragePct <= target.value : stryMutAct_9fa48("10247") ? false : stryMutAct_9fa48("10246") ? true : (stryCov_9fa48("10246", "10247", "10248", "10249"), coveragePct < target.value) : stryMutAct_9fa48("10253") ? coveragePct <= target.value : stryMutAct_9fa48("10252") ? coveragePct >= target.value : stryMutAct_9fa48("10251") ? false : stryMutAct_9fa48("10250") ? true : (stryCov_9fa48("10250", "10251", "10252", "10253"), coveragePct > target.value)));
  }
}
const coverageCsvIntegerFormat = new Intl.NumberFormat(stryMutAct_9fa48("10254") ? "" : (stryCov_9fa48("10254"), "es-AR"));
const coverageCsvDecimalFormat = new Intl.NumberFormat(stryMutAct_9fa48("10255") ? "" : (stryCov_9fa48("10255"), "es-AR"), stryMutAct_9fa48("10256") ? {} : (stryCov_9fa48("10256"), {
  maximumFractionDigits: 1
}));
function csvCell(value: string) {
  if (stryMutAct_9fa48("10257")) {
    {}
  } else {
    stryCov_9fa48("10257");
    return (stryMutAct_9fa48("10258") ? /[^;"\r\n]/ : (stryCov_9fa48("10258"), /[;"\r\n]/)).test(value) ? stryMutAct_9fa48("10259") ? `` : (stryCov_9fa48("10259"), `"${value.replaceAll(stryMutAct_9fa48("10260") ? "" : (stryCov_9fa48("10260"), '"'), stryMutAct_9fa48("10261") ? "" : (stryCov_9fa48("10261"), '""'))}"`) : value;
  }
}
function csvTextValue(value: string) {
  if (stryMutAct_9fa48("10262")) {
    {}
  } else {
    stryCov_9fa48("10262");
    return (stryMutAct_9fa48("10264") ? /^[^=+\-@\t\r]/ : stryMutAct_9fa48("10263") ? /[=+\-@\t\r]/ : (stryCov_9fa48("10263", "10264"), /^[=+\-@\t\r]/)).test(value) ? stryMutAct_9fa48("10265") ? `` : (stryCov_9fa48("10265"), `'${value}`) : value;
  }
}

/** Serializa las filas ordenadas de cobertura para Excel con configuración regional argentina. */
export function coverageRowsToCsv(rows: CoverageCsvRow[], nameHeading: string, target?: IndicatorTarget) {
  if (stryMutAct_9fa48("10266")) {
    {}
  } else {
    stryCov_9fa48("10266");
    const header = stryMutAct_9fa48("10267") ? [] : (stryCov_9fa48("10267"), [nameHeading, stryMutAct_9fa48("10268") ? "" : (stryCov_9fa48("10268"), "Programados"), stryMutAct_9fa48("10269") ? "" : (stryCov_9fa48("10269"), "Atendidos"), stryMutAct_9fa48("10270") ? "" : (stryCov_9fa48("10270"), "Parciales"), stryMutAct_9fa48("10271") ? "" : (stryCov_9fa48("10271"), "No atendidos"), stryMutAct_9fa48("10272") ? "" : (stryCov_9fa48("10272"), "Pendientes"), stryMutAct_9fa48("10273") ? "" : (stryCov_9fa48("10273"), "Cobertura %"), stryMutAct_9fa48("10274") ? "" : (stryCov_9fa48("10274"), "Bajo la meta"), stryMutAct_9fa48("10275") ? "" : (stryCov_9fa48("10275"), "Programado a futuro"), stryMutAct_9fa48("10276") ? "" : (stryCov_9fa48("10276"), "Muestra baja")]);
    const lines = stryMutAct_9fa48("10277") ? [] : (stryCov_9fa48("10277"), [header, ...rows.map(stryMutAct_9fa48("10278") ? () => undefined : (stryCov_9fa48("10278"), row => stryMutAct_9fa48("10279") ? [] : (stryCov_9fa48("10279"), [csvTextValue(row.name), coverageCsvIntegerFormat.format(row.scheduled), coverageCsvIntegerFormat.format(row.served), coverageCsvIntegerFormat.format(row.partial), coverageCsvIntegerFormat.format(row.notServiced), coverageCsvIntegerFormat.format(row.pending), (stryMutAct_9fa48("10282") ? row.scheduled !== 0 : stryMutAct_9fa48("10281") ? false : stryMutAct_9fa48("10280") ? true : (stryCov_9fa48("10280", "10281", "10282"), row.scheduled === 0)) ? stryMutAct_9fa48("10283") ? "" : (stryCov_9fa48("10283"), "Sin programados") : coverageCsvDecimalFormat.format(row.coveragePct), isCoverageBelowTarget(row.scheduled, row.coveragePct, target) ? stryMutAct_9fa48("10284") ? "" : (stryCov_9fa48("10284"), "Sí") : stryMutAct_9fa48("10285") ? "" : (stryCov_9fa48("10285"), "No"), (stryMutAct_9fa48("10288") ? row.upcoming != null : stryMutAct_9fa48("10287") ? false : stryMutAct_9fa48("10286") ? true : (stryCov_9fa48("10286", "10287", "10288"), row.upcoming == null)) ? stryMutAct_9fa48("10289") ? "" : (stryCov_9fa48("10289"), "Sin dato") : coverageCsvIntegerFormat.format(row.upcoming), row.lowSample ? stryMutAct_9fa48("10290") ? "" : (stryCov_9fa48("10290"), "Sí") : stryMutAct_9fa48("10291") ? "" : (stryCov_9fa48("10291"), "No")])))]);
    return stryMutAct_9fa48("10292") ? `` : (stryCov_9fa48("10292"), `\uFEFF${lines.map(stryMutAct_9fa48("10293") ? () => undefined : (stryCov_9fa48("10293"), line => line.map(csvCell).join(stryMutAct_9fa48("10294") ? "" : (stryCov_9fa48("10294"), ";")))).join(stryMutAct_9fa48("10295") ? "" : (stryCov_9fa48("10295"), "\r\n"))}`);
  }
}
export type IndicatorData = Awaited<ReturnType<typeof indicatorsAdapter.getCoverage>> | Awaited<ReturnType<typeof indicatorsAdapter.getCompliance>> | Awaited<ReturnType<typeof indicatorsAdapter.getIncidents>> | Awaited<ReturnType<typeof indicatorsAdapter.getWaste>>;