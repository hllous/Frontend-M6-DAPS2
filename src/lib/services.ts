import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const serviceModeSchema = z.enum(["ROUTE", "POINT"]);
export type ServiceMode = z.infer<typeof serviceModeSchema>;

export const serviceStatusSchema = z.enum([
  "SCHEDULED",
  "RESCHEDULED",
  "IN_PROGRESS",
  "SUSPENDED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
]);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const serviceOriginSchema = z.enum([
  "PLANNED",
  "TICKET",
  "WEATHER_ALERT",
  "INSPECTION",
  "MANUAL",
]);
export type ServiceOrigin = z.infer<typeof serviceOriginSchema>;

export const serviceFlagSchema = z.enum(["delayed", "conflict"]);
export type ServiceFlag = z.infer<typeof serviceFlagSchema>;

export const statusEventSchema = z.object({
  label: z.string(),
  at: z.string(),
  done: z.boolean(),
});
export type StatusEvent = z.infer<typeof statusEventSchema>;

export const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const serviceSchema = z.object({
  id: z.string(),
  serviceTypeId: z.string(),
  serviceTypeName: z.string().optional().default("Servicio urbano"),
  title: z.string(),
  mode: serviceModeSchema,
  status: serviceStatusSchema,
  statusReason: z.string().nullable().optional(),
  origin: serviceOriginSchema,
  zoneIds: z.array(z.string()).min(1),
  zoneNames: z.array(z.string()).optional().default([]),
  routeId: z.string().nullable().optional(),
  routeName: z.string().nullable().optional(),
  targetType: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  targetRef: z.string().nullable().optional(),
  scheduledDate: z.string(),
  windowFrom: z.string().nullable().optional(),
  windowTo: z.string().nullable().optional(),
  crewId: z.string().nullable().optional(),
  crewName: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  ticketId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  flag: serviceFlagSchema.nullable().optional(),
  coordinates: coordinatesSchema.optional().default({ x: 50, y: 50 }),
  history: z.array(statusEventSchema).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Service = z.infer<typeof serviceSchema>;

export type ServiceQuery = {
  status?: ServiceStatus | ServiceStatus[];
  mode?: ServiceMode;
  origin?: ServiceOrigin;
  zoneId?: string;
  crewId?: string;
  search?: string;
  timeFrom?: string;
  timeTo?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  pageSize?: number;
};

export type ServicesPage = {
  services: Service[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ServiceContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceContractError";
  }
}

export class ServiceRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceRequestError";
    this.status = status;
  }
}

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  SCHEDULED: "Programado",
  RESCHEDULED: "A reprogramar",
  IN_PROGRESS: "En curso",
  SUSPENDED: "Suspendido",
  COMPLETED: "Completado",
  PARTIALLY_COMPLETED: "Parcial",
  CANCELLED: "Cancelado",
};

// Lifecycle-aware order for sorting: early -> active -> suspended -> completed -> cancelled
export const STATUS_ORDER: Record<ServiceStatus, number> = {
  SCHEDULED: 0,
  RESCHEDULED: 1,
  IN_PROGRESS: 2,
  SUSPENDED: 3,
  COMPLETED: 4,
  PARTIALLY_COMPLETED: 5,
  CANCELLED: 6,
};

const servicesEnvelopeSchema = z.object({
  data: z.array(serviceSchema),
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

function buildServicesQueryString(query: ServiceQuery): string {
  const params = new URLSearchParams();
  if (query.status) {
    if (Array.isArray(query.status)) {
      query.status.forEach((st) => params.append("status", st));
    } else {
      params.set("status", query.status);
    }
  }
  if (query.mode) params.set("mode", query.mode);
  if (query.origin) params.set("origin", query.origin);
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.crewId) params.set("crewId", query.crewId);
  if (query.search) params.set("search", query.search);
  if (query.timeFrom) params.set("timeFrom", query.timeFrom);
  if (query.timeTo) params.set("timeTo", query.timeTo);
  if (query.scheduledFrom) params.set("scheduledFrom", query.scheduledFrom);
  if (query.scheduledTo) params.set("scheduledTo", query.scheduledTo);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
    throw new ServiceContractError("La respuesta de servicios no es JSON válido.", { cause });
  }
}

export const servicesAdapter = {
  async list(query: ServiceQuery = {}): Promise<ServicesPage> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/services${buildServicesQueryString(query)}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "services" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);

    if (!response.ok) {
      const parsedError = errorResponseSchema.safeParse(payload);
      if (!parsedError.success) {
        recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
        throw new ServiceContractError(
          "La respuesta de error de servicios no respeta el contrato documentado.",
          { cause: parsedError.error },
        );
      }

      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(" ")
        : parsedError.data.message;
      throw new ServiceRequestError(message, parsedError.data.statusCode);
    }

    const parsed = servicesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
      throw new ServiceContractError("La respuesta de servicios no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }

    return {
      services: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<Service> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/services/${id}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "services" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);

    if (!response.ok) {
      const parsedError = errorResponseSchema.safeParse(payload);
      if (!parsedError.success) {
        recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
        throw new ServiceContractError(
          "La respuesta de error de servicio no respeta el contrato documentado.",
          { cause: parsedError.error },
        );
      }

      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(" ")
        : parsedError.data.message;
      throw new ServiceRequestError(message, parsedError.data.statusCode);
    }

    const parsed = serviceSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
      throw new ServiceContractError("El detalle de servicio no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }

    return parsed.data;
  },
};
