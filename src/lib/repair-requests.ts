import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const repairDamageTypeSchema = z.enum([
  "BROKEN_PAVEMENT",
  "BROKEN_SIDEWALK",
  "BROKEN_STREETLIGHT",
  "BLOCKED_DRAIN",
  "DAMAGED_STRUCTURE",
]);
export type RepairDamageType = z.infer<typeof repairDamageTypeSchema>;

export const repairSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RepairSeverity = z.infer<typeof repairSeveritySchema>;

export const repairRequestStatusSchema = z.enum(["REQUESTED", "IN_PROGRESS", "CLOSED"]);
export type RepairRequestStatus = z.infer<typeof repairRequestStatusSchema>;

export const detectedInTypeSchema = z.enum(["SERVICE", "INSPECTION"]);
export type DetectedInType = z.infer<typeof detectedInTypeSchema>;

export const referralContextSchema = z.object({
  type: detectedInTypeSchema,
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
});
export type ReferralContext = z.infer<typeof referralContextSchema>;

export const createRepairRequestInputSchema = z.object({
  damageType: repairDamageTypeSchema,
  // Hypothesis pending the Backend source-DTO confirmation: the documented
  // `address` field is sent directly alongside the polymorphic source pair.
  address: z.string().trim().min(1, "Debe indicar la ubicación del daño."),
  severity: repairSeveritySchema,
  publicSafetyRisk: z.boolean(),
  detectedInType: detectedInTypeSchema,
  detectedInId: z.string().trim().min(1, "Debe indicar el origen de la derivación."),
});
export type CreateRepairRequestInput = z.infer<typeof createRepairRequestInputSchema>;

export const repairRequestRecoveryInputSchema = z.object({
  workOrderId: z.string().trim().min(1, "Debe indicar el identificador de la orden de trabajo.").optional(),
});
export type RepairRequestRecoveryInput = z.infer<typeof repairRequestRecoveryInputSchema>;

export const repairRequestSchema = z.object({
  id: z.string(),
  damageType: repairDamageTypeSchema,
  address: z.string().min(1),
  severity: repairSeveritySchema,
  publicSafetyRisk: z.boolean(),
  detectedInType: detectedInTypeSchema,
  detectedInId: z.string(),
  sourceContext: referralContextSchema.optional(),
  status: repairRequestStatusSchema,
  workOrderId: z.string().nullable().optional(),
  requestedAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type RepairRequest = z.infer<typeof repairRequestSchema>;

export type RepairRequestQuery = {
  status?: RepairRequestStatus;
  damageType?: RepairDamageType;
  severity?: RepairSeverity;
  detectedInId?: string;
  page?: number;
  pageSize?: number;
};

export type RepairRequestsPage = {
  repairRequests: RepairRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class RepairRequestContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepairRequestContractError";
  }
}

export class RepairRequestRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepairRequestRequestError";
    this.status = status;
  }
}

export const REPAIR_DAMAGE_TYPE_LABEL: Record<RepairDamageType, string> = {
  BROKEN_PAVEMENT: "Pavimento roto",
  BROKEN_SIDEWALK: "Vereda hundida o rota",
  BROKEN_STREETLIGHT: "Luminaria caída o dañada",
  BLOCKED_DRAIN: "Sumidero obstruido",
  DAMAGED_STRUCTURE: "Estructura dañada",
};

export const REPAIR_SEVERITY_LABEL: Record<RepairSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const REPAIR_REQUEST_STATUS_LABEL: Record<RepairRequestStatus, string> = {
  REQUESTED: "Pendiente",
  IN_PROGRESS: "En curso",
  CLOSED: "Cerrada",
};

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: RepairRequestQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.damageType) params.set("damageType", query.damageType);
  if (query.severity) params.set("severity", query.severity);
  if (query.detectedInId) params.set("detectedInId", query.detectedInId);
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
      recordTelemetryEvent({ name: "request_network_failure", resource: "repair-requests" });
    }
    throw cause;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "repair-requests" });
    throw new RepairRequestContractError("La respuesta de derivaciones no es JSON válido.", { cause });
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (!parsedError.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "repair-requests" });
      throw new RepairRequestContractError(
        "La respuesta de error de derivaciones no respeta el contrato documentado.",
        { cause: parsedError.error },
      );
    }
    const message = Array.isArray(parsedError.data.message)
      ? parsedError.data.message.join(" ")
      : parsedError.data.message;
    throw new RepairRequestRequestError(message, parsedError.data.statusCode);
  }

  return payload;
}

function resourcePayload(payload: unknown): unknown {
  return payload && typeof payload === "object" && "data" in payload && !("id" in payload)
    ? (payload as { data: unknown }).data
    : payload;
}

function parseResource(payload: unknown, message: string): RepairRequest {
  const parsed = repairRequestSchema.safeParse(resourcePayload(payload));
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "repair-requests" });
    throw new RepairRequestContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const repairRequestsAdapter = {
  async list(query: RepairRequestQuery = {}): Promise<RepairRequestsPage> {
    const payload = await requestJson(`/api/repair-requests${queryString(query)}`);
    const parsed = z.object({
      data: z.array(repairRequestSchema),
      meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
    }).safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "repair-requests" });
      throw new RepairRequestContractError("La lista de derivaciones no respeta el contrato esperado.", { cause: parsed.error });
    }
    return {
      repairRequests: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<RepairRequest> {
    return parseResource(
      await requestJson(`/api/repair-requests/${id}`),
      "El detalle de la derivación no respeta el contrato esperado.",
    );
  },

  async create(input: CreateRepairRequestInput): Promise<RepairRequest> {
    const parsedInput = createRepairRequestInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new RepairRequestContractError("Los datos de la derivación son inválidos.", { cause: parsedInput.error });
    }
    return parseResource(
      await requestJson("/api/repair-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de creación de la derivación no respeta el contrato esperado.",
    );
  },

  async start(id: string, input: RepairRequestRecoveryInput = {}): Promise<RepairRequest> {
    const parsedInput = repairRequestRecoveryInputSchema.safeParse(input);
    if (!parsedInput.success) throw new RepairRequestContractError("Los datos de recuperación son inválidos.", { cause: parsedInput.error });
    return parseResource(
      await requestJson(`/api/repair-requests/${id}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de inicio de la derivación no respeta el contrato esperado.",
    );
  },

  async close(id: string, input: RepairRequestRecoveryInput = {}): Promise<RepairRequest> {
    const parsedInput = repairRequestRecoveryInputSchema.safeParse(input);
    if (!parsedInput.success) throw new RepairRequestContractError("Los datos de recuperación son inválidos.", { cause: parsedInput.error });
    return parseResource(
      await requestJson(`/api/repair-requests/${id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de cierre de la derivación no respeta el contrato esperado.",
    );
  },
};
