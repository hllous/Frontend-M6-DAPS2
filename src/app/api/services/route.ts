import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addServiceFixture,
  filterServiceFixtures,
  paginateServiceFixtures,
} from "@/lib/services-fixtures";
import {
  createServiceInputSchema,
  ROUTE_CATALOG,
  SERVICE_TYPE_CATALOG,
  type Service,
  type ServiceMode,
  type ServiceOrigin,
  type ServiceQuery,
  type ServiceStatus,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { zoneFixtures } from "@/lib/zones-fixtures";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

function parseServiceQuery(url: URL): ServiceQuery {
  const statuses = url.searchParams.getAll("status");
  return {
    status: statuses.length > 1
      ? (statuses as ServiceStatus[])
      : statuses.length === 1
      ? (statuses[0] as ServiceStatus)
      : undefined,
    mode: (url.searchParams.get("mode") as ServiceMode) ?? undefined,
    origin: (url.searchParams.get("origin") as ServiceOrigin) ?? undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    crewId: url.searchParams.get("crewId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    timeFrom: url.searchParams.get("timeFrom") ?? undefined,
    timeTo: url.searchParams.get("timeTo") ?? undefined,
    scheduledFrom: url.searchParams.get("scheduledFrom") ?? undefined,
    scheduledTo: url.searchParams.get("scheduledTo") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function backendQueryString(query: ServiceQuery): string {
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

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    const query = parseServiceQuery(new URL(request.url));

    // Field actors can only see services assigned to their own crew
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      query.crewId = scenario.actor.crewId;
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/services${backendQueryString(query)}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    return NextResponse.json(paginateServiceFixtures(filterServiceFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudieron cargar los servicios.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

    // Permission check: scheduling is an Office decision, not a Field action.
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede programar un servicio.", path);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = createServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(" ");
      return errorResponse(400, message, path);
    }

    const input = parsed.data;

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/services", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const serviceType = SERVICE_TYPE_CATALOG.find((t) => t.id === input.serviceTypeId);
    const mode = serviceType ? serviceType.mode : (input.routeId ? "ROUTE" : "POINT");
    const route = input.routeId ? ROUTE_CATALOG.find((r) => r.id === input.routeId) : null;
    const zoneNames = input.zoneIds.map((zid) => {
      const z = zoneFixtures.find((zone) => zone.id === zid);
      return z ? z.name : zid;
    });

    const newService: Service = {
      id: `SVC-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceTypeId: input.serviceTypeId,
      serviceTypeName: serviceType?.name ?? "Servicio urbano",
      title: input.title || `${serviceType?.name ?? "Servicio"} — ${route?.name ?? input.targetRef ?? "Programado"}`,
      mode,
      status: "SCHEDULED",
      statusReason: null,
      origin: input.origin,
      zoneIds: [...input.zoneIds],
      zoneNames,
      routeId: input.routeId ?? null,
      routeName: route?.name ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      targetRef: input.targetRef ?? null,
      scheduledDate: input.scheduledDate,
      windowFrom: input.timeWindow.start,
      windowTo: input.timeWindow.end,
      crewId: null,
      crewName: null,
      vehicleId: null,
      vehiclePlate: null,
      ticketId: input.origin === "TICKET" ? (input.ticketId ?? null) : null,
      notes: input.notes ?? null,
      coordinates: { x: 50, y: 50 },
      attachments: [],
      history: [{ label: "Programado", at: new Date().toISOString().slice(0, 16).replace("T", " "), done: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addServiceFixture(newService);
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo programar el servicio.", path);
  }
}
