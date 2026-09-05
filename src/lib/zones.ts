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

const zoneSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  neighborhoodIds: z.array(z.string()),
});

export type Zone = z.infer<typeof zoneSchema>;

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

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "zones" });
    throw new ZoneContractError("La respuesta de zonas no es JSON válido.", { cause });
  }
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
      const parsedError = errorResponseSchema.safeParse(payload);
      if (!parsedError.success) {
        recordTelemetryEvent({ name: "request_malformed_response", resource: "zones" });
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
};
