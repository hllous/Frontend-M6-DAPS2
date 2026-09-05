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

export const createServiceInputSchema = z
  .object({
    title: z.string().optional(),
    serviceTypeId: z.string().min(1, "Debe seleccionar un tipo de servicio"),
    origin: serviceOriginSchema,
    ticketId: z.string().optional(),
    inspectionId: z.string().optional(),
    weatherAlertId: z.string().optional(),
    routeId: z.string().optional(),
    zoneIds: z.array(z.string()).min(1, "Debe incluir al menos una zona"),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    targetRef: z.string().optional(),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD"),
    timeWindow: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio inválida (HH:MM)"),
      end: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin inválida (HH:MM)"),
    }),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.origin === "TICKET" && (!data.ticketId || !data.ticketId.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ticketId"],
        message: "El ticketId es obligatorio para origen TICKET",
      });
    }
    if (data.origin !== "TICKET" && data.ticketId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ticketId"],
        message: "ticketId solo está permitido para origen TICKET",
      });
    }
    if (data.origin === "INSPECTION" && (!data.inspectionId || !data.inspectionId.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inspectionId"],
        message: "El inspectionId es obligatorio para origen INSPECTION",
      });
    }
    if (data.origin === "WEATHER_ALERT" && (!data.weatherAlertId || !data.weatherAlertId.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weatherAlertId"],
        message: "El weatherAlertId es obligatorio para origen WEATHER_ALERT",
      });
    }
  });

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

export type ServiceTypeCatalogItem = {
  id: string;
  code: string;
  name: string;
  mode: ServiceMode;
  category: string;
  requiresVehicle?: boolean;
};

export const SERVICE_TYPE_CATALOG: ServiceTypeCatalogItem[] = [
  { id: "st-waste-route", code: "ST-REC", name: "Recolección de residuos", mode: "ROUTE", category: "WASTE", requiresVehicle: true },
  { id: "st-street-cleaning", code: "ST-BAR", name: "Barrido mecánico", mode: "ROUTE", category: "CLEANING", requiresVehicle: true },
  { id: "st-tree-pruning", code: "ST-POD", name: "Poda y arbolado", mode: "POINT", category: "GREEN_SPACES", requiresVehicle: false },
  { id: "st-container-repair", code: "ST-CON-REP", name: "Mantenimiento de contenedores", mode: "POINT", category: "CONTAINERS", requiresVehicle: true },
  { id: "st-container-survey", code: "ST-CON-SRV", name: "Relevamiento de contenedores", mode: "POINT", category: "CONTAINERS", requiresVehicle: false },
  { id: "st-dump-clearing", code: "ST-BAS", name: "Limpieza de microbasural", mode: "POINT", category: "CLEANING", requiresVehicle: true },
  { id: "st-green-inspection", code: "ST-PV-INS", name: "Inspección de puntos verdes", mode: "POINT", category: "GREEN_SPACES", requiresVehicle: false },
  { id: "st-env-inspection", code: "ST-AMB-INS", name: "Inspección ambiental", mode: "POINT", category: "ENVIRONMENT", requiresVehicle: false },
];

export type RouteCatalogItem = {
  id: string;
  code: string;
  name: string;
  zoneIds: string[];
  zoneNames: string[];
};

export const ROUTE_CATALOG: RouteCatalogItem[] = [
  { id: "route-1", code: "R-01", name: "Recorrido 1 Centro", zoneIds: ["zone-3"], zoneNames: ["Zona Centro"] },
  { id: "route-2", code: "R-02", name: "Recorrido 2 Sur", zoneIds: ["zone-2"], zoneNames: ["Zona Sur"] },
  { id: "route-3", code: "R-03", name: "Recorrido 3 Norte", zoneIds: ["zone-1"], zoneNames: ["Zona Norte"] },
  { id: "route-4", code: "R-04", name: "Recorrido 4 Norte", zoneIds: ["zone-1"], zoneNames: ["Zona Norte"] },
];

export type CrewCatalogItem = {
  id: string;
  name: string;
  crewType: string;
  defaultShift: string;
  leaderName?: string;
};

export const CREW_CATALOG: CrewCatalogItem[] = [
  { id: "crew-a", name: "Cuadrilla A · López", crewType: "URBAN_SERVICE", defaultShift: "Turno mañana", leaderName: "Carlos López" },
  { id: "crew-b", name: "Cuadrilla B · Fernández", crewType: "URBAN_SERVICE", defaultShift: "Turno mañana", leaderName: "María Fernández" },
  { id: "crew-c", name: "Cuadrilla C · Ibáñez", crewType: "TREE_CARE", defaultShift: "Turno tarde", leaderName: "Jorge Ibáñez" },
  { id: "crew-d", name: "Cuadrilla D · Gómez", crewType: "CLEANING", defaultShift: "Turno noche", leaderName: "Lucía Gómez" },
];

export type VehicleCatalogItem = {
  id: string;
  plate: string;
  vehicleType: string;
  model?: string;
};

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  { id: "veh-101", plate: "AF 123 CD", vehicleType: "COMPACTOR", model: "Camión compactador 16m³" },
  { id: "veh-102", plate: "AE 456 FG", vehicleType: "SWEEPER", model: "Barredora mecánica vial" },
  { id: "veh-103", plate: "AD 789 GH", vehicleType: "CRANE", model: "Grúa hidráulica para contenedores" },
  { id: "veh-104", plate: "AC 321 JK", vehicleType: "OPEN_BED", model: "Camión volcador 10m³" },
  { id: "veh-105", plate: "AB 654 LM", vehicleType: "UTILITY", model: "Camioneta utilitaria de inspección" },
];

export const assignCrewInputSchema = z.object({
  crewId: z.string().min(1, "Debe seleccionar una cuadrilla"),
  vehicleId: z.string().nullable().optional(),
});

export type AssignCrewInput = z.infer<typeof assignCrewInputSchema>;

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

  async create(input: CreateServiceInput): Promise<Service> {
    const parsedInput = createServiceInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ServiceContractError(
        "Los datos para programar el servicio son inválidos.",
        { cause: parsedInput.error },
      );
    }

    let response: Response;
    try {
      response = await authenticatedFetch("/api/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      });
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

    const raw =
      payload && typeof payload === "object" && "data" in payload && !("id" in payload)
        ? (payload as { data: unknown }).data
        : payload;

    const parsed = serviceSchema.safeParse(raw);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
      throw new ServiceContractError(
        "La respuesta de creación de servicio no respeta el contrato esperado.",
        { cause: parsed.error },
      );
    }

    return parsed.data;
  },

  async assignCrew(serviceId: string, input: AssignCrewInput): Promise<Service> {
    const parsedInput = assignCrewInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ServiceContractError(
        "Los datos para la asignación de recursos son inválidos.",
        { cause: parsedInput.error },
      );
    }

    let response: Response;
    try {
      response = await authenticatedFetch(`/api/services/${serviceId}/assign-crew`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      });
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
          "La respuesta de error de asignación de servicio no respeta el contrato documentado.",
          { cause: parsedError.error },
        );
      }

      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(" ")
        : parsedError.data.message;
      throw new ServiceRequestError(message, parsedError.data.statusCode);
    }

    const raw =
      payload && typeof payload === "object" && "data" in payload && !("id" in payload)
        ? (payload as { data: unknown }).data
        : payload;

    const parsed = serviceSchema.safeParse(raw);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
      throw new ServiceContractError(
        "La respuesta de asignación de servicio no respeta el contrato esperado.",
        { cause: parsed.error },
      );
    }

    return parsed.data;
  },

  async start(serviceId: string): Promise<Service> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/services/${serviceId}/start`, {
        method: "POST",
      });
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
          "La respuesta de error de inicio de servicio no respeta el contrato documentado.",
          { cause: parsedError.error },
        );
      }

      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(" ")
        : parsedError.data.message;
      throw new ServiceRequestError(message, parsedError.data.statusCode);
    }

    const raw =
      payload && typeof payload === "object" && "data" in payload && !("id" in payload)
        ? (payload as { data: unknown }).data
        : payload;

    const parsed = serviceSchema.safeParse(raw);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "services" });
      throw new ServiceContractError(
        "La respuesta de inicio de servicio no respeta el contrato esperado.",
        { cause: parsed.error },
      );
    }

    return parsed.data;
  },
};

function timeWindowsOverlap(
  w1Start?: string | null,
  w1End?: string | null,
  w2Start?: string | null,
  w2End?: string | null,
): boolean {
  if (!w1Start || !w1End || !w2Start || !w2End) {
    return true;
  }
  return w1Start < w2End && w2Start < w1End;
}

export function checkAssignmentConflicts({
  service,
  crewId,
  vehicleId,
  allServices,
}: {
  service: Service;
  crewId?: string | null;
  vehicleId?: string | null;
  allServices: Service[];
}): {
  crewConflict: Service | null;
  vehicleConflict: Service | null;
} {
  let crewConflict: Service | null = null;
  let vehicleConflict: Service | null = null;

  for (const other of allServices) {
    if (other.id === service.id) continue;
    if (other.status === "CANCELLED") continue;
    if (other.scheduledDate !== service.scheduledDate) continue;

    const overlaps = timeWindowsOverlap(
      service.windowFrom,
      service.windowTo,
      other.windowFrom,
      other.windowTo,
    );
    if (!overlaps) continue;

    if (!crewConflict && crewId && other.crewId === crewId) {
      crewConflict = other;
    }
    if (!vehicleConflict && vehicleId && other.vehicleId === vehicleId) {
      vehicleConflict = other;
    }

    if (crewConflict && (vehicleConflict || !vehicleId)) {
      break;
    }
  }

  return { crewConflict, vehicleConflict };
}

export type ServiceWindowTiming = {
  isOutside: boolean;
  timing: "within" | "early" | "late";
  message: string | null;
};

export function checkServiceWindowTiming(
  service: Service,
  now: Date = new Date(),
): ServiceWindowTiming {
  if (!service.windowFrom || !service.windowTo) {
    return { isOutside: false, timing: "within", message: null };
  }

  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentDay = String(now.getDate()).padStart(2, "0");
  const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`;

  const currentHours = String(now.getHours()).padStart(2, "0");
  const currentMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  if (service.scheduledDate < currentDateStr) {
    return {
      isOutside: true,
      timing: "late",
      message: `Inicio fuera de ventana horaria: la fecha programada fue el ${service.scheduledDate} (${service.windowFrom} – ${service.windowTo}).`,
    };
  }
  if (service.scheduledDate > currentDateStr) {
    return {
      isOutside: true,
      timing: "early",
      message: `Inicio fuera de ventana horaria: el servicio está programado para el ${service.scheduledDate} (${service.windowFrom} – ${service.windowTo}).`,
    };
  }

  if (currentTimeStr < service.windowFrom) {
    return {
      isOutside: true,
      timing: "early",
      message: `Inicio fuera de ventana horaria: la ventana programada inicia a las ${service.windowFrom} (actual: ${currentTimeStr}).`,
    };
  }

  if (currentTimeStr > service.windowTo) {
    return {
      isOutside: true,
      timing: "late",
      message: `Inicio fuera de ventana horaria: la ventana programada finalizó a las ${service.windowTo} (actual: ${currentTimeStr}).`,
    };
  }

  return { isOutside: false, timing: "within", message: null };
}
