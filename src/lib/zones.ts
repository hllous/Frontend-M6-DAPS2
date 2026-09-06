import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export type ZoneQuery = {
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ZonesPage = {
  zones: Zone[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ZoneContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ZoneContractError";
  }
}

export class ZoneRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ZoneRequestError";
    this.status = status;
  }
}

export const zoneSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  neighborhoodIds: z.array(z.string()),
});

export type Zone = z.infer<typeof zoneSchema>;

export const createZoneInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
});

export type CreateZoneInput = z.infer<typeof createZoneInputSchema>;

export const updateZoneInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
  active: z.boolean().optional(),
});

export type UpdateZoneInput = z.infer<typeof updateZoneInputSchema>;

export const zoneReferenceReportSchema = z.object({
  zoneId: z.string(),
  activeRoutes: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  containersCount: z.number(),
  treesCount: z.number(),
  greenSpacesCount: z.number(),
  totalReferences: z.number(),
});

export type ZoneReferenceReport = z.infer<typeof zoneReferenceReportSchema>;

const zonesEnvelopeSchema = z.object({
  data: z.array(zoneSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function buildZonesQueryString(query: ZoneQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response, resource: "zones" = "zones"): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new ZoneContractError("La respuesta de zonas no es JSON válido.", { cause });
  }
}

function handleErrorPayload(payload: unknown, resource: "zones" = "zones"): never {
  const parsedError = errorResponseSchema.safeParse(payload);
  if (!parsedError.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new ZoneContractError(
      "La respuesta de error de zonas no respeta el contrato documentado.",
      { cause: parsedError.error },
    );
  }

  const message = Array.isArray(parsedError.data.message)
    ? parsedError.data.message.join(" ")
    : parsedError.data.message;
  throw new ZoneRequestError(message, parsedError.data.statusCode);
}

async function handleSingleZoneResponse(response: Response, resource: "zones" = "zones"): Promise<Zone> {
  const payload = await readJsonBody(response, resource);
  if (!response.ok) {
    handleErrorPayload(payload, resource);
  }
  const parsed = zoneSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new ZoneContractError("La respuesta de zona no respeta el contrato esperado.", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export const zonesAdapter = {
  async list(query: ZoneQuery = {}): Promise<ZonesPage> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones${buildZonesQueryString(query)}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);

    if (!response.ok) {
      handleErrorPayload(payload);
    }

    const parsed = zonesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "zones" });
      throw new ZoneContractError("La respuesta de zonas no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }

    return {
      zones: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<Zone> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones/${id}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    return handleSingleZoneResponse(response);
  },

  async create(input: CreateZoneInput): Promise<Zone> {
    const validated = createZoneInputSchema.parse(input);
    let response: Response;
    try {
      response = await authenticatedFetch("/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    return handleSingleZoneResponse(response);
  },

  async update(id: string, input: UpdateZoneInput): Promise<Zone> {
    const validated = updateZoneInputSchema.parse(input);
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    return handleSingleZoneResponse(response);
  },

  async delete(id: string): Promise<Zone> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones/${id}`, {
        method: "DELETE",
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    return handleSingleZoneResponse(response);
  },

  async checkReferences(id: string): Promise<ZoneReferenceReport> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones/${id}/references`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);
    if (!response.ok) {
      handleErrorPayload(payload);
    }
    const parsed = zoneReferenceReportSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "zones" });
      throw new ZoneContractError("La respuesta de referencias de zona no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }
    return parsed.data;
  },
};
