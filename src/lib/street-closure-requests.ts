import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { treeInterventionTypeSchema } from "./tree-interventions";

export const streetClosureTypeSchema = z.enum(["TOTAL", "PARTIAL"]);
export type StreetClosureType = z.infer<typeof streetClosureTypeSchema>;

export const streetClosureRequestStatusSchema = z.enum([
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "ENDED",
]);
export type StreetClosureRequestStatus = z.infer<typeof streetClosureRequestStatusSchema>;

export const streetClosureRequestSourceTypeSchema = z.enum(["SERVICE", "TREE_INTERVENTION"]);
export type StreetClosureRequestSourceType = z.infer<
  typeof streetClosureRequestSourceTypeSchema
>;

export const affectedSectionSchema = z.object({
  streetName: z.string().trim().min(1, "Indique el nombre de la calle"),
  fromCross: z.string().trim().min(1, "Indique la calle transversal de inicio"),
  toCross: z.string().trim().min(1, "Indique la calle transversal de fin"),
});
export type AffectedSection = z.infer<typeof affectedSectionSchema>;

const serviceStreetClosureSourceContextSchema = z.object({
  sourceType: z.literal("SERVICE"),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  mode: z.enum(["ROUTE", "POINT"]),
  serviceTypeName: z.string().min(1),
  scheduledDate: z.string().min(1),
  windowFrom: z.string().nullable(),
  windowTo: z.string().nullable(),
});

const treeInterventionStreetClosureSourceContextSchema = z.object({
  sourceType: z.literal("TREE_INTERVENTION"),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  interventionType: treeInterventionTypeSchema,
  address: z.string().min(1),
});

export const streetClosureSourceContextSchema = z.discriminatedUnion("sourceType", [
  serviceStreetClosureSourceContextSchema,
  treeInterventionStreetClosureSourceContextSchema,
]);
export type StreetClosureSourceContext = z.infer<typeof streetClosureSourceContextSchema>;

export const createStreetClosureRequestInputSchema = z
  .object({
    reason: z.string().trim().min(1, "El motivo es obligatorio"),
    sourceType: streetClosureRequestSourceTypeSchema,
    sourceId: z.string().trim().min(1, "Debe indicar la fuente de origen"),
    sourceModule: z.literal("M6"),
    closureType: streetClosureTypeSchema,
    requestedFrom: z.string().trim().min(1, "Indique el inicio de la ventana solicitada"),
    requestedTo: z.string().trim().min(1, "Indique el fin de la ventana solicitada"),
    // Backend's exact collection wire name is a documented hypothesis. The adapter
    // owns this shape so the UI does not depend on that integration detail.
    affectedSections: z.array(affectedSectionSchema).min(1, "Agregue al menos un tramo afectado"),
  })
  .superRefine((data, ctx) => {
    const from = Date.parse(data.requestedFrom);
    const to = Date.parse(data.requestedTo);
    if (!Number.isNaN(from) && !Number.isNaN(to) && from >= to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedTo"],
        message: "La ventana final debe ser posterior a la inicial",
      });
    }
  });
export type CreateStreetClosureRequestInput = z.infer<
  typeof createStreetClosureRequestInputSchema
>;

export const streetClosureRequestSchema = z.object({
  id: z.string().min(1),
  reason: z.string(),
  sourceType: streetClosureRequestSourceTypeSchema,
  sourceId: z.string().min(1),
  sourceModule: z.literal("M6"),
  closureType: streetClosureTypeSchema,
  requestedFrom: z.string(),
  requestedTo: z.string(),
  affectedSections: z.array(affectedSectionSchema).min(1),
  status: streetClosureRequestStatusSchema,
  closureId: z.string().nullable(),
  sourceContext: streetClosureSourceContextSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StreetClosureRequest = z.infer<typeof streetClosureRequestSchema>;

export const approveStreetClosureRequestInputSchema = z.object({
  closureId: z.string().trim().min(1, "El identificador de M7 es obligatorio"),
});
export type ApproveStreetClosureRequestInput = z.infer<
  typeof approveStreetClosureRequestInputSchema
>;

export const streetClosureRequestQuerySchema = z.object({
  status: streetClosureRequestStatusSchema.optional(),
  sourceId: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});
export type StreetClosureRequestQuery = z.infer<typeof streetClosureRequestQuerySchema>;

export type StreetClosureRequestPage = {
  requests: StreetClosureRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StreetClosureDependencyOutcome =
  | "none"
  | "blocked"
  | "allowed"
  | "rejected"
  | "released";

export type StreetClosureDependency = {
  request: StreetClosureRequest | null;
  outcome: StreetClosureDependencyOutcome;
};

export function resolveStreetClosureDependency(
  requests: StreetClosureRequest[],
): StreetClosureDependency {
  const request = [...requests].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  )[0] ?? null;

  if (!request) return { request: null, outcome: "none" };
  if (request.status === "REQUESTED") return { request, outcome: "blocked" };
  if (request.status === "REJECTED") return { request, outcome: "rejected" };
  if (request.status === "ENDED") return { request, outcome: "released" };
  return { request, outcome: "allowed" };
}

export class StreetClosureRequestContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StreetClosureRequestContractError";
  }
}

export class StreetClosureRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StreetClosureRequestError";
    this.status = status;
  }
}

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

const requestPageSchema = z.object({
  data: z.array(streetClosureRequestSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

function buildQueryString(query: StreetClosureRequestQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.sourceId) params.set("sourceId", query.sourceId);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "street-closure-requests" });
    throw new StreetClosureRequestContractError("La respuesta de cortes de calle no es JSON válido.", {
      cause,
    });
  }
}

async function requestError(payload: unknown, response: Response): Promise<never> {
  const parsedError = errorResponseSchema.safeParse(payload);
  if (!parsedError.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "street-closure-requests" });
    throw new StreetClosureRequestContractError(
      "La respuesta de error de cortes de calle no respeta el contrato documentado.",
      { cause: parsedError.error },
    );
  }
  const message = Array.isArray(parsedError.data.message)
    ? parsedError.data.message.join(" ")
    : parsedError.data.message;
  throw new StreetClosureRequestError(message, response.status);
}

async function sendRequest(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "street-closure-requests" });
    }
    throw cause;
  }
  const payload = await readJsonBody(response);
  if (!response.ok) return requestError(payload, response);
  return payload;
}

function parseRequest(payload: unknown, message: string): StreetClosureRequest {
  const parsed = streetClosureRequestSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "street-closure-requests" });
    throw new StreetClosureRequestContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const streetClosureRequestsAdapter = {
  async list(query: StreetClosureRequestQuery = {}): Promise<StreetClosureRequestPage> {
    const payload = await sendRequest(
      `/api/street-closure-requests${buildQueryString(query)}`,
    );
    const parsed = requestPageSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "street-closure-requests" });
      throw new StreetClosureRequestContractError(
        "La lista de cortes de calle no respeta el contrato esperado.",
        { cause: parsed.error },
      );
    }
    return {
      requests: parsed.data.data,
      ...parsed.data.meta,
    };
  },

  async getForService(serviceId: string): Promise<StreetClosureDependency> {
    const page = await this.list({ sourceId: serviceId, pageSize: 100 });
    return resolveStreetClosureDependency(page.requests);
  },

  async get(id: string): Promise<StreetClosureRequest> {
    return parseRequest(
      await sendRequest(`/api/street-closure-requests/${id}`),
      "El detalle de corte de calle no respeta el contrato esperado.",
    );
  },

  async create(input: CreateStreetClosureRequestInput): Promise<StreetClosureRequest> {
    const parsedInput = createStreetClosureRequestInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new StreetClosureRequestContractError("Los datos del corte de calle son inválidos.", {
        cause: parsedInput.error,
      });
    }
    return parseRequest(
      await sendRequest("/api/street-closure-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de creación del corte de calle no respeta el contrato esperado.",
    );
  },

  async approve(id: string, input: ApproveStreetClosureRequestInput): Promise<StreetClosureRequest> {
    const parsedInput = approveStreetClosureRequestInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new StreetClosureRequestContractError("El identificador de M7 es inválido.", {
        cause: parsedInput.error,
      });
    }
    return parseRequest(
      await sendRequest(`/api/street-closure-requests/${id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de aprobación del corte de calle no respeta el contrato esperado.",
    );
  },

  async reject(id: string): Promise<StreetClosureRequest> {
    return parseRequest(
      await sendRequest(`/api/street-closure-requests/${id}/reject`, { method: "POST" }),
      "La respuesta de rechazo del corte de calle no respeta el contrato esperado.",
    );
  },

  async end(id: string): Promise<StreetClosureRequest> {
    return parseRequest(
      await sendRequest(`/api/street-closure-requests/${id}/end`, { method: "POST" }),
      "La respuesta de finalización del corte de calle no respeta el contrato esperado.",
    );
  },
};
