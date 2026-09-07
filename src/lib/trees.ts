import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const treeSchema = z.object({
  id: z.string(),
  surveyCode: z.string(),
  zoneId: z.string(),
  species: z.string(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  heightM: z.number(),
  diameterCm: z.number(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Tree = z.infer<typeof treeSchema>;

const optionalLocationInput = z.number().finite().optional();
const positiveMeasurement = z.number().finite().positive();

export const treeCreateInputSchema = z.object({
  surveyCode: z.string().trim().min(1, "El código de relevamiento es obligatorio.").max(30, "El código de relevamiento no puede superar los 30 caracteres."),
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria."),
  species: z.string().trim().min(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres."),
  address: z.string().trim().max(200, "La dirección no puede superar los 200 caracteres.").optional(),
  lat: optionalLocationInput,
  lng: optionalLocationInput,
  heightM: positiveMeasurement,
  diameterCm: positiveMeasurement,
  active: z.boolean().optional(),
});
export type TreeCreateInput = z.infer<typeof treeCreateInputSchema>;

export const treeUpdateInputSchema = z.object({
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria.").optional(),
  species: z.string().trim().min(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres.").optional(),
  address: z.string().trim().max(200, "La dirección no puede superar los 200 caracteres.").optional(),
  lat: optionalLocationInput,
  lng: optionalLocationInput,
  heightM: positiveMeasurement.optional(),
  diameterCm: positiveMeasurement.optional(),
  active: z.boolean().optional(),
}).strict();
export type TreeUpdateInput = z.infer<typeof treeUpdateInputSchema>;

export type TreeQuery = {
  active?: boolean;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type TreesPage = {
  trees: Tree[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class TreeContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeContractError";
  }
}

export class TreeRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(treeSchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: TreeQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.zoneId) params.set("zoneId", query.zoneId);
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
    recordTelemetryEvent({ name: "request_malformed_response", resource: "trees" });
    throw new TreeContractError("La respuesta de árboles no es JSON válido.", { cause });
  }
}

async function request(path: string, init?: RequestInit): Promise<{ payload: unknown }> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "trees" });
    }
    throw cause;
  }

  if (response.status === 204) return { payload: undefined };
  const payload = await readJson(response);
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new TreeContractError("La respuesta de error de árboles no respeta el contrato documentado.", { cause: parsed.error });
    }
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
    throw new TreeRequestError(message, parsed.data.statusCode);
  }
  return { payload };
}

function parseResource(payload: unknown, message: string): Tree {
  const parsed = treeSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "trees" });
    throw new TreeContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const treesAdapter = {
  async list(query: TreeQuery = {}): Promise<TreesPage> {
    const { payload } = await request(`/api/trees${queryString(query)}`);
    const parsed = pageSchema.safeParse(payload);
    if (!parsed.success) throw new TreeContractError("La lista de árboles no respeta el contrato esperado.", { cause: parsed.error });
    return { trees: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages };
  },

  async get(id: string): Promise<Tree> {
    const { payload } = await request(`/api/trees/${id}`);
    return parseResource(payload, "El detalle del árbol no respeta el contrato esperado.");
  },

  async create(input: TreeCreateInput): Promise<Tree> {
    const parsedInput = treeCreateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new TreeContractError("Los datos para registrar el árbol son inválidos.", { cause: parsedInput.error });
    const { payload } = await request("/api/trees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) });
    return parseResource(payload, "La respuesta de creación del árbol no respeta el contrato esperado.");
  },

  async update(id: string, input: TreeUpdateInput): Promise<Tree> {
    const parsedInput = treeUpdateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new TreeContractError("Los datos editables del árbol son inválidos.", { cause: parsedInput.error });
    const { payload } = await request(`/api/trees/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) });
    return parseResource(payload, "La respuesta de actualización del árbol no respeta el contrato esperado.");
  },

  async remove(id: string): Promise<void> {
    await request(`/api/trees/${id}`, { method: "DELETE" });
  },
};
