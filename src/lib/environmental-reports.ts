import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { attachmentSchema } from "./services";
import { recordTelemetryEvent } from "./telemetry";

export const environmentalReportTypeSchema = z.enum([
  "NOISE",
  "DUMPING",
  "ILLEGAL_DUMPSITE",
  "WATER_DISCHARGE",
  "AIR_EMISSION",
  "ODOR",
  "PEST_INFESTATION",
  "OTHER",
]);
export type EnvironmentalReportType = z.infer<typeof environmentalReportTypeSchema>;

export const environmentalReportStatusSchema = z.enum([
  "RECEIVED",
  "UNDER_REVIEW",
  "FORWARDED",
  "DISMISSED",
  "INSPECTION_SCHEDULED",
  "INSPECTED",
  "NO_VIOLATION",
  "VIOLATION_FOUND",
  "NOTICE_ISSUED",
  "SANCTIONED",
  "CLOSED",
  "REOPENED",
]);
export type EnvironmentalReportStatus = z.infer<typeof environmentalReportStatusSchema>;

export const environmentalReportPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type EnvironmentalReportPriority = z.infer<typeof environmentalReportPrioritySchema>;

export const sanctionDecisionSchema = z.enum([
  "FINE_ISSUED",
  "CLOSURE_ORDERED",
  "FORMAL_NOTICE_ISSUED",
  "DISMISSED",
]);
export type SanctionDecision = z.infer<typeof sanctionDecisionSchema>;

export const sanctionOutcomeSchema = z.object({
  violationNoticeId: z.string().trim().min(1),
  decision: sanctionDecisionSchema,
  decidedAt: z.string(),
  externalRef: z.string().trim().min(1),
  dismissalReason: z.string().nullable().optional(),
});
export type SanctionOutcome = z.infer<typeof sanctionOutcomeSchema>;

export const sanctionOutcomeIntegrationExceptionSchema = z.object({
  type: z.literal("UNCORRELATED_SANCTION_OUTCOME"),
  violationNoticeId: z.string(),
  externalRef: z.string(),
  receivedAt: z.string(),
  message: z.string(),
});
export type SanctionOutcomeIntegrationException = z.infer<typeof sanctionOutcomeIntegrationExceptionSchema>;

export const createEnvironmentalReportInputSchema = z.object({
  reportType: environmentalReportTypeSchema,
  address: z.string().trim().min(1, "Debe indicar la ubicación del hallazgo."),
  lat: z.number({ message: "La latitud debe ser un número válido." }),
  lng: z.number({ message: "La longitud debe ser un número válido." }),
  description: z.string().trim().min(1, "Debe describir el hallazgo."),
});
export type CreateEnvironmentalReportInput = z.infer<typeof createEnvironmentalReportInputSchema>;

const reportLocationSchema = z.object({
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
}).passthrough();

export const environmentalReportSchema = z.object({
  id: z.string(),
  reportType: environmentalReportTypeSchema,
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  location: reportLocationSchema.optional(),
  description: z.string().optional(),
  details: z.string().optional(),
  ticketId: z.string().nullable().optional(),
  reporterSnapshot: z.unknown().optional(),
  status: environmentalReportStatusSchema,
  priority: environmentalReportPrioritySchema,
  deadlineAt: z.string().nullable().optional(),
  escalated: z.boolean().optional(),
  citizenResponse: z.string().nullable().optional(),
  sanctionOutcome: sanctionOutcomeSchema.nullable().optional(),
  assignedCrewId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export type EnvironmentalReport = z.infer<typeof environmentalReportSchema>;

export function mergeEnvironmentalReportRead(
  current: EnvironmentalReport,
  incoming: EnvironmentalReport,
): EnvironmentalReport {
  const currentUpdatedAt = Date.parse(current.updatedAt);
  const incomingUpdatedAt = Date.parse(incoming.updatedAt);
  if (!Number.isNaN(currentUpdatedAt) && !Number.isNaN(incomingUpdatedAt) && incomingUpdatedAt < currentUpdatedAt) {
    return current;
  }
  if (current.sanctionOutcome && !incoming.sanctionOutcome) {
    return { ...incoming, sanctionOutcome: current.sanctionOutcome };
  }
  return incoming;
}

export const environmentalInspectionOutcomeSchema = z.enum([
  "NO_VIOLATION",
  "VIOLATION_FOUND",
  "INCONCLUSIVE",
]);
export type EnvironmentalInspectionOutcome = z.infer<typeof environmentalInspectionOutcomeSchema>;

export const environmentalInspectionNextStepSchema = z.enum([
  "NOTICE_TO_BE_ISSUED",
  "REINSPECTION",
  "CASE_CLOSED",
]);
export type EnvironmentalInspectionNextStep = z.infer<typeof environmentalInspectionNextStepSchema>;

export const environmentalInspectionViolationTypeSchema = z.enum([
  "NOISE_LIMIT",
  "ILLEGAL_DUMPING",
  "UNTREATED_DISCHARGE",
  "HAZARDOUS_WASTE",
  "AIR_EMISSION",
  "NO_WASTE_MANAGEMENT",
  "INSPECTION_OBSTRUCTION",
]);
export type EnvironmentalInspectionViolationType = z.infer<typeof environmentalInspectionViolationTypeSchema>;

export const environmentalInspectionSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type EnvironmentalInspectionSeverity = z.infer<typeof environmentalInspectionSeveritySchema>;

export const environmentalInspectionSuggestedActionSchema = z.enum([
  "WARNING",
  "FORMAL_NOTICE",
  "FINE",
  "CLOSURE",
]);
export type EnvironmentalInspectionSuggestedAction = z.infer<typeof environmentalInspectionSuggestedActionSchema>;

// Hypothesis: the backend has not published the exact checklist DTO yet.
export const environmentalInspectionChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(true),
}).passthrough();
export type EnvironmentalInspectionChecklistItem = z.infer<typeof environmentalInspectionChecklistItemSchema>;

export const environmentalInspectionChecklistResultSchema = z.object({
  id: z.string().min(1),
  completed: z.boolean(),
});
export type EnvironmentalInspectionChecklistResult = z.infer<typeof environmentalInspectionChecklistResultSchema>;

export const environmentalInspectionCompleteInputSchema = z
  .object({
    outcome: environmentalInspectionOutcomeSchema,
    checklist: z.array(environmentalInspectionChecklistResultSchema).min(1, "Debe completar el checklist de inspección."),
    conclusion: z.string().trim().optional(),
    findings: z.string().trim().optional(),
    violationType: environmentalInspectionViolationTypeSchema.optional(),
    severity: environmentalInspectionSeveritySchema.optional(),
    suggestedAction: environmentalInspectionSuggestedActionSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.checklist.some((item) => !item.completed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checklist"], message: "Debe completar todos los controles del checklist." });
    }
    if (data.outcome === "NO_VIOLATION" && !data.conclusion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conclusion"], message: "La conclusión es obligatoria para un resultado sin infracción." });
    }
    if (data.outcome === "VIOLATION_FOUND") {
      if (!data.findings) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["findings"], message: "Los hallazgos son obligatorios cuando se constata una infracción." });
      if (!data.violationType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["violationType"], message: "Debe indicar el tipo de infracción constatada." });
      if (!data.severity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["severity"], message: "Debe indicar la gravedad de la infracción constatada." });
      if (!data.suggestedAction) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["suggestedAction"], message: "Debe indicar la acción sugerida." });
    }
    if (data.outcome === "INCONCLUSIVE" && !data.conclusion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conclusion"], message: "Debe explicar por qué la inspección resulta inconclusa." });
    }
  });
export type EnvironmentalInspectionCompleteInput = z.infer<typeof environmentalInspectionCompleteInputSchema>;

// Hypothesis: schedule fields are kept explicit at this adapter seam until OpenAPI
// exposes the authoritative request and response nesting.
export const environmentalInspectionScheduleInputSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD"),
  timeWindow: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio inválida (HH:MM)"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin inválida (HH:MM)"),
  }),
  checklistVersion: z.string().trim().min(1, "Debe seleccionar una versión de checklist"),
  checklist: z.array(environmentalInspectionChecklistItemSchema).min(1, "El checklist debe tener al menos un control"),
  zoneId: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});
export type EnvironmentalInspectionScheduleInput = z.infer<typeof environmentalInspectionScheduleInputSchema>;

export const environmentalInspectionSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  serviceId: z.string().nullable().optional(),
  inspectedAt: z.string().nullable().optional(),
  scheduledDate: z.string(),
  timeWindow: z.object({ start: z.string(), end: z.string() }),
  checklistVersion: z.string(),
  checklist: z.array(environmentalInspectionChecklistItemSchema),
  attachments: z.array(attachmentSchema).optional(),
  findings: z.string().nullable().optional(),
  violationType: environmentalInspectionViolationTypeSchema.nullable().optional(),
  severity: environmentalInspectionSeveritySchema.nullable().optional(),
  suggestedAction: environmentalInspectionSuggestedActionSchema.nullable().optional(),
  outcome: environmentalInspectionOutcomeSchema.nullable().optional(),
  nextStep: environmentalInspectionNextStepSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export type EnvironmentalInspection = z.infer<typeof environmentalInspectionSchema>;

export const issueViolationNoticeInputSchema = z.object({
  // null is reserved for the explicit non-forwarded path. A resolved notice
  // must always carry an establishment identifier for M4 projection.
  establishmentId: z.string().trim().min(1, "Debe indicar un establecimiento válido.").nullable(),
  violationType: environmentalInspectionViolationTypeSchema,
  severity: environmentalInspectionSeveritySchema,
  suggestedAction: environmentalInspectionSuggestedActionSchema,
});
export type IssueViolationNoticeInput = z.infer<typeof issueViolationNoticeInputSchema>;

export const violationNoticeSchema = z.object({
  id: z.string(),
  noticeNumber: z.string(),
  inspectionId: z.string(),
  issuedAt: z.string(),
  establishmentId: z.string().nullable(),
  violationType: environmentalInspectionViolationTypeSchema,
  severity: environmentalInspectionSeveritySchema,
  suggestedAction: environmentalInspectionSuggestedActionSchema,
  priorNoticeCount: z.number().int().nonnegative(),
}).passthrough();
export type ViolationNotice = z.infer<typeof violationNoticeSchema>;

export type EnvironmentalReportQuery = {
  status?: EnvironmentalReportStatus;
  reportType?: EnvironmentalReportType;
  priority?: EnvironmentalReportPriority;
  ticketId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type EnvironmentalReportsPage = {
  environmentalReports: EnvironmentalReport[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sanctionOutcomeIntegrationExceptions: SanctionOutcomeIntegrationException[];
};

export class EnvironmentalReportContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EnvironmentalReportContractError";
  }
}

export class EnvironmentalReportRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EnvironmentalReportRequestError";
    this.status = status;
  }
}

export const ENVIRONMENTAL_REPORT_TYPE_LABELS: Record<EnvironmentalReportType, string> = {
  NOISE: "Ruidos molestos",
  DUMPING: "Vertido de residuos",
  ILLEGAL_DUMPSITE: "Microbasural",
  WATER_DISCHARGE: "Descarga de efluentes",
  AIR_EMISSION: "Emisión al aire",
  ODOR: "Olores",
  PEST_INFESTATION: "Plaga o infestación",
  OTHER: "Otro hallazgo ambiental",
};

export const ENVIRONMENTAL_REPORT_STATUS_LABELS: Record<EnvironmentalReportStatus, string> = {
  RECEIVED: "Recibido",
  UNDER_REVIEW: "En revisión",
  FORWARDED: "Derivado",
  DISMISSED: "Desestimado",
  INSPECTION_SCHEDULED: "Inspección programada",
  INSPECTED: "Inspeccionado",
  NO_VIOLATION: "Sin infracción",
  VIOLATION_FOUND: "Infracción constatada",
  NOTICE_ISSUED: "Acta emitida",
  SANCTIONED: "Sancionado",
  CLOSED: "Cerrado",
  REOPENED: "Reabierto · en revisión",
};

export const ENVIRONMENTAL_REPORT_PRIORITY_LABELS: Record<EnvironmentalReportPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: EnvironmentalReportQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.reportType) params.set("reportType", query.reportType);
  if (query.priority) params.set("priority", query.priority);
  if (query.ticketId) params.set("ticketId", query.ticketId);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "environmental-reports" });
    }
    throw cause;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
    throw new EnvironmentalReportContractError("La respuesta del control ambiental no es JSON válido.", { cause });
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? (Array.isArray(parsedError.data.message) ? parsedError.data.message.join(" ") : parsedError.data.message)
      : "No se pudo completar la operación ambiental.";
    throw new EnvironmentalReportRequestError(message, response.status);
  }
  return payload;
}

function resourcePayload(payload: unknown): unknown {
  return payload && typeof payload === "object" && "data" in payload && !("id" in payload)
    ? (payload as { data: unknown }).data
    : payload;
}

function parseResource(payload: unknown, message: string): EnvironmentalReport {
  const parsed = environmentalReportSchema.safeParse(resourcePayload(payload));
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
    throw new EnvironmentalReportContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

function parseInspection(payload: unknown, message: string): EnvironmentalInspection {
  const parsed = environmentalInspectionSchema.safeParse(resourcePayload(payload));
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
    throw new EnvironmentalReportContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const environmentalReportsAdapter = {
  async issueViolationNotice(id: string, input: IssueViolationNoticeInput): Promise<ViolationNotice> {
    const parsedInput = issueViolationNoticeInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new EnvironmentalReportContractError("Los datos para emitir el acta son inválidos.", { cause: parsedInput.error });
    }
    const payload = await requestJson(`/api/environmental-inspections/${encodeURIComponent(id)}/violation-notice`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    });
    const parsed = violationNoticeSchema.safeParse(resourcePayload(payload));
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
      throw new EnvironmentalReportContractError("La respuesta de emisión del acta no respeta el contrato esperado.", { cause: parsed.error });
    }
    return parsed.data;
  },

  async getViolationNotice(id: string): Promise<ViolationNotice> {
    const payload = await requestJson(`/api/environmental-inspections/${encodeURIComponent(id)}/violation-notice`);
    const parsed = violationNoticeSchema.safeParse(resourcePayload(payload));
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
      throw new EnvironmentalReportContractError("La respuesta del acta no respeta el contrato esperado.", { cause: parsed.error });
    }
    return parsed.data;
  },

  async list(query: EnvironmentalReportQuery = {}): Promise<EnvironmentalReportsPage> {
    const payload = await requestJson(`/api/environmental-reports${queryString(query)}`);
    const parsed = z.object({
      data: z.array(environmentalReportSchema),
      meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
      sanctionOutcomeIntegrationExceptions: z.array(sanctionOutcomeIntegrationExceptionSchema).optional(),
    }).safeParse(payload);
    if (!parsed.success) throw new EnvironmentalReportContractError("La lista de expedientes no respeta el contrato esperado.", { cause: parsed.error });
    return {
      environmentalReports: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
      sanctionOutcomeIntegrationExceptions: parsed.data.sanctionOutcomeIntegrationExceptions ?? [],
    };
  },

  async get(id: string): Promise<EnvironmentalReport> {
    return parseResource(await requestJson(`/api/environmental-reports/${encodeURIComponent(id)}`), "El detalle del expediente no respeta el contrato esperado.");
  },

  async create(input: CreateEnvironmentalReportInput): Promise<EnvironmentalReport> {
    const parsedInput = createEnvironmentalReportInputSchema.safeParse(input);
    if (!parsedInput.success) throw new EnvironmentalReportContractError("Los datos del hallazgo son inválidos.", { cause: parsedInput.error });
    return parseResource(await requestJson("/api/environmental-reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    }), "La respuesta de creación del expediente no respeta el contrato esperado.");
  },

  async startReview(id: string): Promise<EnvironmentalReport> {
    return transition(id, "start-review", "La respuesta de inicio de revisión no respeta el contrato esperado.");
  },
  async forward(id: string): Promise<EnvironmentalReport> {
    return transition(id, "forward", "La respuesta de derivación no respeta el contrato esperado.");
  },
  async dismiss(id: string): Promise<EnvironmentalReport> {
    return transition(id, "dismiss", "La respuesta de desestimación no respeta el contrato esperado.");
  },
  async close(id: string): Promise<EnvironmentalReport> {
    return transition(id, "close", "La respuesta de cierre no respeta el contrato esperado.");
  },

  async schedule(reportId: string, input: EnvironmentalInspectionScheduleInput): Promise<EnvironmentalInspection> {
    const parsedInput = environmentalInspectionScheduleInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new EnvironmentalReportContractError("Los datos para programar la inspección son inválidos.", { cause: parsedInput.error });
    }
    return parseInspection(await requestJson(`/api/environmental-reports/${encodeURIComponent(reportId)}/inspections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    }), "La respuesta de programación de inspección no respeta el contrato esperado.");
  },

  async listInspections(reportId: string): Promise<EnvironmentalInspection[]> {
    const payload = await requestJson(`/api/environmental-reports/${encodeURIComponent(reportId)}/inspections`);
    const raw = payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;
    const parsed = z.array(environmentalInspectionSchema).safeParse(raw);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "environmental-reports" });
      throw new EnvironmentalReportContractError("La historia de inspecciones no respeta el contrato esperado.", { cause: parsed.error });
    }
    return parsed.data;
  },

  async completeInspection(id: string, input: EnvironmentalInspectionCompleteInput): Promise<EnvironmentalInspection> {
    const parsedInput = environmentalInspectionCompleteInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new EnvironmentalReportContractError("Los datos para completar la inspecci\u00f3n son inv\u00e1lidos.", { cause: parsedInput.error });
    }
    return parseInspection(await requestJson(`/api/environmental-inspections/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    }), "La respuesta de finalizaci\u00f3n de inspecci\u00f3n no respeta el contrato esperado.");
  },

  async getInspection(id: string): Promise<EnvironmentalInspection> {
    return parseInspection(await requestJson(`/api/environmental-inspections/${encodeURIComponent(id)}`), "El detalle de inspección no respeta el contrato esperado.");
  },
};

async function transition(id: string, action: string, message: string): Promise<EnvironmentalReport> {
  return parseResource(await requestJson(`/api/environmental-reports/${encodeURIComponent(id)}/${action}`, { method: "POST" }), message);
}
