import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { treeSchema, type Tree } from "./trees";

export const treeInterventionTypeSchema = z.enum(["FORMATION_PRUNING", "SAFETY_PRUNING", "REMOVAL", "PLANTING", "TREATMENT"]);
export type TreeInterventionType = z.infer<typeof treeInterventionTypeSchema>;

export const treeInterventionStatusSchema = z.enum(["REQUESTED", "PENDING_AUTHORIZATION", "AUTHORIZED", "REJECTED"]);
export type TreeInterventionStatus = z.infer<typeof treeInterventionStatusSchema>;

export const treeInterventionPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type TreeInterventionPriority = z.infer<typeof treeInterventionPrioritySchema>;

export const treeInterventionSchema = z.object({
  id: z.string(),
  interventionType: treeInterventionTypeSchema,
  treeIds: z.array(z.string()).min(1),
  address: z.string(),
  requiresStreetClosure: z.boolean(),
  priority: treeInterventionPrioritySchema,
  status: treeInterventionStatusSchema,
  serviceId: z.string().nullable(),
  justification: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TreeIntervention = z.infer<typeof treeInterventionSchema> & { trees?: Tree[] };

const treeInterventionResponseSchema = treeInterventionSchema.extend({ trees: z.array(treeSchema).optional() });
export type TreeInterventionDetail = z.infer<typeof treeInterventionResponseSchema>;

export const treeInterventionCreateInputSchema = z.object({
  interventionType: treeInterventionTypeSchema,
  treeIds: z.array(z.string().trim().min(1)).min(1, "Seleccione al menos un árbol."),
  address: z.string().trim().min(1, "La dirección es obligatoria.").max(200, "La dirección no puede superar los 200 caracteres."),
  requiresStreetClosure: z.boolean(),
  priority: treeInterventionPrioritySchema,
  justification: z.string().trim().max(2000, "La justificación no puede superar los 2000 caracteres.").optional(),
}).refine((input) => input.interventionType !== "REMOVAL" || Boolean(input.justification), {
  path: ["justification"],
  message: "La justificación es obligatoria para solicitar una extracción.",
});
export type TreeInterventionCreateInput = z.infer<typeof treeInterventionCreateInputSchema>;

export type TreeInterventionQuery = {
  interventionType?: TreeInterventionType;
  status?: TreeInterventionStatus;
  page?: number;
  pageSize?: number;
};

export type TreeInterventionsPage = {
  interventions: TreeIntervention[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class TreeInterventionContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeInterventionContractError";
  }
}

export class TreeInterventionRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeInterventionRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(treeInterventionResponseSchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});
const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: TreeInterventionQuery) {
  const params = new URLSearchParams();
  if (query.interventionType) params.set("interventionType", query.interventionType);
  if (query.status) params.set("status", query.status);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "tree-interventions" });
    throw cause;
  }

  let payload: unknown;
  try {
    payload = response.status === 204 ? undefined : await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "tree-interventions" });
    throw new TreeInterventionContractError("La respuesta de intervenciones de arbolado no es JSON válido.", { cause });
  }
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (!parsedError.success) throw new TreeInterventionContractError("La respuesta de error de intervenciones no respeta el contrato documentado.", { cause: parsedError.error });
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(" ") : parsedError.data.message;
    throw new TreeInterventionRequestError(message, parsedError.data.statusCode);
  }
  return payload;
}

function parseIntervention(payload: unknown, message: string): TreeInterventionDetail {
  const parsed = treeInterventionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "tree-interventions" });
    throw new TreeInterventionContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const treeInterventionsAdapter = {
  async list(query: TreeInterventionQuery = {}): Promise<TreeInterventionsPage> {
    const parsed = pageSchema.safeParse(await request(`/api/tree-interventions${queryString(query)}`));
    if (!parsed.success) throw new TreeInterventionContractError("La lista de intervenciones no respeta el contrato esperado.", { cause: parsed.error });
    return { interventions: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages };
  },

  async get(id: string): Promise<TreeInterventionDetail> {
    return parseIntervention(await request(`/api/tree-interventions/${encodeURIComponent(id)}`), "El detalle de la intervención no respeta el contrato esperado.");
  },

  async create(input: TreeInterventionCreateInput): Promise<TreeInterventionDetail> {
    const parsedInput = treeInterventionCreateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new TreeInterventionContractError("Los datos de la intervención son inválidos.", { cause: parsedInput.error });
    return parseIntervention(await request("/api/tree-interventions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) }), "La respuesta de creación de la intervención no respeta el contrato esperado.");
  },
};
