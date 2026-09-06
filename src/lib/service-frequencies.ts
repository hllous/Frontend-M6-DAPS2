import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const serviceFrequencyShiftSchema = z.enum(["MORNING", "AFTERNOON", "NIGHT"]);
export type ServiceFrequencyShift = z.infer<typeof serviceFrequencyShiftSchema>;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD");

export const serviceFrequencySchema = z.object({
  id: z.string(),
  serviceTypeId: z.string(),
  routeId: z.string(),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  shift: serviceFrequencyShiftSchema,
  validFrom: dateSchema,
  validTo: dateSchema.nullable(),
});
export type ServiceFrequency = z.infer<typeof serviceFrequencySchema>;

export const serviceFrequencyCreateInputSchema = z.object({
  serviceTypeId: z.string().trim().min(1, "El tipo de servicio es obligatorio"),
  routeId: z.string().trim().min(1, "El recorrido es obligatorio"),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Seleccione al menos un día").max(7).refine((days) => new Set(days).size === days.length, "No repita días"),
  shift: serviceFrequencyShiftSchema,
  validFrom: dateSchema,
  validTo: dateSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.validTo && value.validTo < value.validFrom) ctx.addIssue({ code: "custom", path: ["validTo"], message: "La fecha de cierre no puede ser anterior al inicio" });
});
export type ServiceFrequencyCreateInput = z.infer<typeof serviceFrequencyCreateInputSchema>;

export const serviceFrequencyUpdateInputSchema = z.object({
  weekdays: serviceFrequencyCreateInputSchema.shape.weekdays.optional(),
  shift: serviceFrequencyShiftSchema.optional(),
  validFrom: dateSchema.optional(),
  validTo: dateSchema.nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.validFrom && value.validTo && value.validTo < value.validFrom) ctx.addIssue({ code: "custom", path: ["validTo"], message: "La fecha de cierre no puede ser anterior al inicio" });
});
export type ServiceFrequencyUpdateInput = z.infer<typeof serviceFrequencyUpdateInputSchema>;

export type ServiceFrequencyQuery = {
  serviceTypeId?: string;
  routeId?: string;
  shift?: ServiceFrequencyShift;
  weekday?: number;
  validOn?: string;
  page?: number;
  pageSize?: number;
};

export type ServiceFrequenciesPage = {
  serviceFrequencies: ServiceFrequency[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ServiceFrequencyContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceFrequencyContractError";
  }
}

export class ServiceFrequencyRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceFrequencyRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(serviceFrequencySchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function queryString(query: ServiceFrequencyQuery): string {
  const params = new URLSearchParams();
  if (query.serviceTypeId) params.set("serviceTypeId", query.serviceTypeId);
  if (query.routeId) params.set("routeId", query.routeId);
  if (query.shift) params.set("shift", query.shift);
  if (query.weekday !== undefined) params.set("weekday", String(query.weekday));
  if (query.validOn) params.set("validOn", query.validOn);
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
    if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "service-frequencies" });
    throw cause;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "service-frequencies" });
    throw new ServiceFrequencyContractError("La respuesta de frecuencias no es JSON válido.", { cause });
  }
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    if (!parsed.success) throw new ServiceFrequencyContractError("La respuesta de error de frecuencias no respeta el contrato documentado.", { cause: parsed.error });
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
    throw new ServiceFrequencyRequestError(message, parsed.data.statusCode);
  }
  return payload;
}

function parseResource(payload: unknown): ServiceFrequency {
  const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload) ? (payload as { data: unknown }).data : payload;
  const parsed = serviceFrequencySchema.safeParse(raw);
  if (!parsed.success) throw new ServiceFrequencyContractError("La frecuencia no respeta el contrato esperado.", { cause: parsed.error });
  return parsed.data;
}

export const serviceFrequenciesAdapter = {
  async list(query: ServiceFrequencyQuery = {}): Promise<ServiceFrequenciesPage> {
    const parsed = pageSchema.safeParse(await requestJson(`/api/service-frequencies${queryString(query)}`));
    if (!parsed.success) throw new ServiceFrequencyContractError("La lista de frecuencias no respeta el contrato esperado.", { cause: parsed.error });
    return { serviceFrequencies: parsed.data.data, ...parsed.data.meta };
  },
  async get(id: string): Promise<ServiceFrequency> {
    return parseResource(await requestJson(`/api/service-frequencies/${id}`));
  },
  async create(input: ServiceFrequencyCreateInput): Promise<ServiceFrequency> {
    const parsed = serviceFrequencyCreateInputSchema.safeParse(input);
    if (!parsed.success) throw new ServiceFrequencyContractError("Los datos de la frecuencia son inválidos.", { cause: parsed.error });
    return parseResource(await requestJson("/api/service-frequencies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
  },
  async update(id: string, input: ServiceFrequencyUpdateInput): Promise<ServiceFrequency> {
    const parsed = serviceFrequencyUpdateInputSchema.safeParse(input);
    if (!parsed.success) throw new ServiceFrequencyContractError("Los datos editables de la frecuencia son inválidos.", { cause: parsed.error });
    return parseResource(await requestJson(`/api/service-frequencies/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
  },
  async close(id: string): Promise<ServiceFrequency> {
    return parseResource(await requestJson(`/api/service-frequencies/${id}`, { method: "DELETE" }));
  },
};
