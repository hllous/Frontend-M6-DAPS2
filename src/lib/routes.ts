import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export type RouteQuery = {
  active?: boolean;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export class RouteContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RouteContractError";
  }
}

export class RouteRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RouteRequestError";
    this.status = status;
  }
}

export const routeStopSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  sequence: z.number().int().nonnegative(),
  zoneId: z.string(),
  estimatedDurationMin: z.number().nonnegative().optional(),
  zone: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    })
    .optional(),
});

export type RouteStop = z.infer<typeof routeStopSchema>;

export const routeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  stops: z.array(routeStopSchema).default([]),
});

export type Route = z.infer<typeof routeSchema>;

export type RoutesPage = {
  routes: Route[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const createRouteInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
});

export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;

export const updateRouteInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
  active: z.boolean().optional(),
});

export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;

export const routeReferenceReportSchema = z.object({
  routeId: z.string(),
  activeServiceFrequencies: z.array(
    z.object({
      id: z.string(),
      serviceTypeName: z.string(),
      shift: z.string(),
      weekdays: z.array(z.string()),
    }),
  ),
  totalReferences: z.number(),
});

export type RouteReferenceReport = z.infer<typeof routeReferenceReportSchema>;

const routesEnvelopeSchema = z.object({
  data: z.array(routeSchema),
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

function buildRoutesQueryString(query: RouteQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response, resource: "routes" = "routes"): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new RouteContractError("La respuesta de recorridos no es JSON válido.", { cause });
  }
}

function handleErrorPayload(payload: unknown, resource: "routes" = "routes"): never {
  const parsedError = errorResponseSchema.safeParse(payload);
  if (!parsedError.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new RouteContractError(
      "La respuesta de error de recorridos no respeta el contrato documentado.",
      { cause: parsedError.error },
    );
  }

  const message = Array.isArray(parsedError.data.message)
    ? parsedError.data.message.join(" ")
    : parsedError.data.message;
  throw new RouteRequestError(message, parsedError.data.statusCode);
}

async function handleSingleRouteResponse(
  response: Response,
  resource: "routes" = "routes",
): Promise<Route> {
  const payload = await readJsonBody(response, resource);
  if (!response.ok) {
    handleErrorPayload(payload, resource);
  }
  const parsed = routeSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource });
    throw new RouteContractError("La respuesta de recorrido no respeta el contrato esperado.", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export const routesAdapter = {
  async list(query: RouteQuery = {}): Promise<RoutesPage> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/routes${buildRoutesQueryString(query)}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);

    if (!response.ok) {
      handleErrorPayload(payload);
    }

    const parsed = routesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "routes" });
      throw new RouteContractError("La respuesta de recorridos no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }

    return {
      routes: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<Route> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/routes/${id}`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    return handleSingleRouteResponse(response);
  },

  async create(input: CreateRouteInput): Promise<Route> {
    const validated = createRouteInputSchema.parse(input);
    let response: Response;
    try {
      response = await authenticatedFetch("/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    return handleSingleRouteResponse(response);
  },

  async update(id: string, input: UpdateRouteInput): Promise<Route> {
    const validated = updateRouteInputSchema.parse(input);
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/routes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    return handleSingleRouteResponse(response);
  },

  async delete(id: string): Promise<Route> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/routes/${id}`, {
        method: "DELETE",
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    return handleSingleRouteResponse(response);
  },

  async checkReferences(id: string): Promise<RouteReferenceReport> {
    let response: Response;
    try {
      response = await authenticatedFetch(`/api/routes/${id}/references`);
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "routes" });
      }
      throw cause;
    }
    const payload = await readJsonBody(response);
    if (!response.ok) {
      handleErrorPayload(payload);
    }
    const parsed = routeReferenceReportSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "routes" });
      throw new RouteContractError(
        "La respuesta de referencias de recorrido no respeta el contrato esperado.",
        { cause: parsed.error },
      );
    }
    return parsed.data;
  },
};
