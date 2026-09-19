import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const wasteTypeSchema = z.enum(["HOUSEHOLD", "RECYCLABLE", "BULKY", "GREEN", "MIXED"]);
export type WasteType = z.infer<typeof wasteTypeSchema>;

export const greenPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zoneId: z.string(),
  wasteTypes: z.array(wasteTypeSchema),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type GreenPoint = z.infer<typeof greenPointSchema>;

const optionalLocationInput = z.number().finite().optional();

export const greenPointCreateInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio.").max(20, "El código no puede superar los 20 caracteres."),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres."),
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria."),
  wasteTypes: z.array(wasteTypeSchema).min(1, "Seleccione al menos un tipo de residuo.").max(5).refine((items) => new Set(items).size === items.length, "No repita tipos de residuo."),
  address: z.string().trim().max(200, "La dirección no puede superar los 200 caracteres.").optional(),
  lat: optionalLocationInput,
  lng: optionalLocationInput,
  active: z.boolean().optional(),
});
export type GreenPointCreateInput = z.infer<typeof greenPointCreateInputSchema>;

export const greenPointUpdateInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres.").optional(),
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria.").optional(),
  wasteTypes: z.array(wasteTypeSchema).min(1, "Seleccione al menos un tipo de residuo.").max(5).refine((items) => new Set(items).size === items.length, "No repita tipos de residuo.").optional(),
  address: z.string().trim().max(200, "La dirección no puede superar los 200 caracteres.").optional(),
  lat: optionalLocationInput,
  lng: optionalLocationInput,
  active: z.boolean().optional(),
}).strict();
export type GreenPointUpdateInput = z.infer<typeof greenPointUpdateInputSchema>;

export type GreenPointQuery = {
  active?: boolean;
  zoneId?: string;
  wasteType?: WasteType;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type GreenPointsPage = {
  greenPoints: GreenPoint[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class GreenPointContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GreenPointContractError";
  }
}

export class GreenPointRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GreenPointRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(greenPointSchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: GreenPointQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.wasteType) params.set("wasteType", query.wasteType);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "green-points" });
    throw new GreenPointContractError("La respuesta de puntos verdes no es JSON válido.", { cause });
  }
}

async function request(path: string, init?: RequestInit): Promise<{ response: Response; payload: unknown }> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "green-points" });
    }
    throw cause;
  }

  if (response.status === 204) return { response, payload: undefined };
  const payload = await readJson(response);
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new GreenPointContractError("La respuesta de error de puntos verdes no respeta el contrato documentado.", { cause: parsed.error });
    }
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
    throw new GreenPointRequestError(message, parsed.data.statusCode);
  }
  return { response, payload };
}

function parseResource(payload: unknown, message: string): GreenPoint {
  const parsed = greenPointSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "green-points" });
    throw new GreenPointContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const greenPointsAdapter = {
  async list(query: GreenPointQuery = {}): Promise<GreenPointsPage> {
    const { payload } = await request(`/api/green-points${queryString(query)}`);
    const parsed = pageSchema.safeParse(payload);
    if (!parsed.success) throw new GreenPointContractError("La lista de puntos verdes no respeta el contrato esperado.", { cause: parsed.error });
    return { greenPoints: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages };
  },

  async get(id: string): Promise<GreenPoint> {
    const { payload } = await request(`/api/green-points/${id}`);
    return parseResource(payload, "El detalle del punto verde no respeta el contrato esperado.");
  },

  async create(input: GreenPointCreateInput): Promise<GreenPoint> {
    const parsedInput = greenPointCreateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new GreenPointContractError("Los datos para registrar el punto verde son inválidos.", { cause: parsedInput.error });
    const { payload } = await request("/api/green-points", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) });
    return parseResource(payload, "La respuesta de creación del punto verde no respeta el contrato esperado.");
  },

  async update(id: string, input: GreenPointUpdateInput): Promise<GreenPoint> {
    const parsedInput = greenPointUpdateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new GreenPointContractError("Los datos editables del punto verde son inválidos.", { cause: parsedInput.error });
    const { payload } = await request(`/api/green-points/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) });
    return parseResource(payload, "La respuesta de actualización del punto verde no respeta el contrato esperado.");
  },

  async remove(id: string): Promise<void> {
    await request(`/api/green-points/${id}`, { method: "DELETE" });
  },
};
