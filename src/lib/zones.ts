import { z } from "zod";

import { withFlatIds } from "./backend-shape";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { externalIdListInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";

export type ZoneQuery = {
  active?: boolean;
  search?: string;
  /** UUID de la comuna (filtro del listado). */
  communeId?: string;
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

// El listado no trae barrios y el detalle los trae como neighborhoods: [{ neighborhoodId }].
export const zoneCommuneSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), number: z.number().optional() });
// `codigo` y `nombre` faltan cuando el catálogo de M9 no está cargado en el backend.
export const zoneNeighborhoodSchema = z.object({
  id: z.string(),
  codigo: z.string().optional(),
  nombre: z.string().optional(),
});

// Una zona es un barrio: `code` es el `codigo` del barrio. Para cruzarla con el catálogo o con un GeoJSON usar
// `neighborhood.codigo` / `commune.code`, no el `code` de la zona. Ambos pueden ser null.
export const zoneSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  commune: zoneCommuneSchema.nullish(),
  neighborhood: zoneNeighborhoodSchema.nullish(),
  neighborhoodIds: z.array(z.string()).optional(),
});
const zoneWireSchema = z.preprocess(withFlatIds("neighborhoods", "neighborhoodId", "neighborhoodIds"), zoneSchema);

export type Zone = z.infer<typeof zoneSchema>;

/** Número de comuna (1 a 15); `null` si la zona no tiene comuna o no se puede leer el número. */
export function communeNumber(commune: Zone["commune"]): number | null {
  if (!commune) return null;
  if (typeof commune.number === "number") return commune.number;
  const parsed = Number(/\d+/.exec(commune.name)?.[0]);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Zonas por número de comuna (numérico: la 10 va después de la 2), alfabético por nombre dentro de cada una y
 * las zonas sin comuna al final. El backend ya lo hace (Backend #457); se repite acá para los datos que no
 * pasan por él (mocks, cachés) y es idempotente sobre una página ya ordenada.
 */
export function sortZonesByCommune(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => {
    const left = communeNumber(a.commune) ?? Infinity;
    const right = communeNumber(b.commune) ?? Infinity;
    return left === right ? a.name.localeCompare(b.name, "es") : left < right ? -1 : 1;
  });
}

/** Etiqueta de zona para tablas y detalles: nunca expone el id crudo. */
export function zoneLabel(zones: Zone[], zoneId: string, loaded: boolean): string {
  const zone = zones.find((candidate) => candidate.id === zoneId);
  if (zone) return zone.name;
  return loaded ? "Zona no disponible" : "Cargando zona…";
}

const communeIdInput = z.uuid("La comuna no es válida");

export const createZoneInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio").max(20, "El código admite hasta 20 caracteres"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres"),
  communeId: communeIdInput.optional(),
});

export type CreateZoneInput = z.infer<typeof createZoneInputSchema>;

export const updateZoneInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres").optional(),
  active: z.boolean().optional(),
  /** `null` desasigna la comuna. */
  communeId: communeIdInput.nullable().optional(),
});

export type UpdateZoneInput = z.infer<typeof updateZoneInputSchema>;

export const assignNeighborhoodsInputSchema = z.object({
  neighborhoodIds: externalIdListInput({ itemMessage: "El ID del barrio es obligatorio", emptyMessage: "Seleccione al menos un barrio." }),
});

export type AssignNeighborhoodsInput = z.infer<typeof assignNeighborhoodsInputSchema>;

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
  data: tolerantRecords(zoneWireSchema, "zones"),
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
  if (query.communeId) params.set("communeId", query.communeId);
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
  const parsed = zoneWireSchema.safeParse(payload);
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
      zones: sortZonesByCommune(parsed.data.data),
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

  async assignNeighborhoods(id: string, input: AssignNeighborhoodsInput): Promise<Zone> {
    const validated = assignNeighborhoodsInputSchema.parse(input);
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/zones/${id}/neighborhoods`, {
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
    return handleSingleZoneResponse(response, "zones");
  },

  async removeNeighborhood(id: string, neighborhoodId: string): Promise<Zone> {
    let response: Response;
    try {
      response = await authenticatedFetch(
        `/api/zones/${id}/neighborhoods/${encodeURIComponent(neighborhoodId)}`,
        { method: "DELETE" },
      );
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "zones" });
      }
      throw cause;
    }
    return handleSingleZoneResponse(response, "zones");
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
