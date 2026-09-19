import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";

export const serviceTypeCategorySchema = z.enum([
  "WASTE_COLLECTION",
  "STREET_CLEANING",
  "CONTAINERS",
  "TREES",
  "GREEN_SPACES",
  "ENVIRONMENTAL_CONTROL",
]);
export type ServiceTypeCategory = z.infer<typeof serviceTypeCategorySchema>;

export const serviceTypeModeSchema = z.enum(["ROUTE", "POINT"]);
export type ServiceTypeMode = z.infer<typeof serviceTypeModeSchema>;

export const serviceTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: serviceTypeCategorySchema,
  mode: serviceTypeModeSchema,
  requiresVehicle: z.boolean(),
  active: z.boolean(),
});
export type ServiceType = z.infer<typeof serviceTypeSchema>;

export const serviceTypeCreateInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  category: serviceTypeCategorySchema,
  mode: serviceTypeModeSchema,
  requiresVehicle: z.boolean(),
});
export type ServiceTypeCreateInput = z.infer<typeof serviceTypeCreateInputSchema>;

export const serviceTypeUpdateInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  requiresVehicle: z.boolean(),
  active: z.boolean(),
}).strict();
export type ServiceTypeUpdateInput = z.infer<typeof serviceTypeUpdateInputSchema>;

export type ServiceTypeQuery = {
  active?: boolean;
  category?: ServiceTypeCategory;
  mode?: ServiceTypeMode;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ServiceTypesPage = {
  serviceTypes: ServiceType[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ServiceTypeContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceTypeContractError";
  }
}

export class ServiceTypeRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceTypeRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(serviceTypeSchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: ServiceTypeQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.category) params.set("category", query.category);
  if (query.mode) params.set("mode", query.mode);
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
    if (cause instanceof NetworkFailureError) throw cause;
    throw cause;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ServiceTypeContractError("La respuesta de tipos de servicio no es JSON válido.", { cause });
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (!parsedError.success) throw new ServiceTypeContractError("La respuesta de error no respeta el contrato documentado.", { cause: parsedError.error });
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(" ") : parsedError.data.message;
    throw new ServiceTypeRequestError(message, parsedError.data.statusCode);
  }
  return payload;
}

function parseResource(payload: unknown): ServiceType {
  const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload)
    ? (payload as { data: unknown }).data
    : payload;
  const parsed = serviceTypeSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceTypeContractError("El tipo de servicio no respeta el contrato esperado.", { cause: parsed.error });
  return parsed.data;
}

export const serviceTypesAdapter = {
  async list(query: ServiceTypeQuery = {}): Promise<ServiceTypesPage> {
    const payload = await requestJson(`/api/service-types${queryString(query)}`);
    const parsed = pageSchema.safeParse(payload);
    if (!parsed.success) throw new ServiceTypeContractError("La lista de tipos de servicio no respeta el contrato esperado.", { cause: parsed.error });
    return {
      serviceTypes: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<ServiceType> {
    return parseResource(await requestJson(`/api/service-types/${id}`));
  },

  async create(input: ServiceTypeCreateInput): Promise<ServiceType> {
    const parsedInput = serviceTypeCreateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new ServiceTypeContractError("Los datos del tipo de servicio son inválidos.", { cause: parsedInput.error });
    return parseResource(await requestJson("/api/service-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    }));
  },

  async update(id: string, input: ServiceTypeUpdateInput): Promise<ServiceType> {
    const parsedInput = serviceTypeUpdateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new ServiceTypeContractError("Los datos editables del tipo de servicio son inválidos.", { cause: parsedInput.error });
    return parseResource(await requestJson(`/api/service-types/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    }));
  },

  async remove(id: string): Promise<ServiceType> {
    return parseResource(await requestJson(`/api/service-types/${id}`, { method: "DELETE" }));
  },
};
