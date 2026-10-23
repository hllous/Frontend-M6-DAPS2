import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { vehicleFixtures } from "@/lib/vehicles-fixtures";
import { linkEnvironmentalInspectionService } from "@/lib/environmental-report-fixtures";
import {
  addServiceFixture,
  filterServiceFixtures,
  paginateServiceFixtures,
} from "@/lib/services-fixtures";
import {
  BackendServiceZoneSelectionError,
  createServiceInputSchema,
  ROUTE_CATALOG,
  SERVICE_TYPE_CATALOG,
  type Service,
  type ServiceQuery,
  serviceQuerySchema,
  servicesEnvelopeSchema,
  toCreateServiceBackendInput,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { droppedRecords } from "@/lib/tolerant-records";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { zoneFixtures } from "@/lib/zones-fixtures";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";





function parseServiceQuery(url: URL): ServiceQuery {
  const statuses = url.searchParams.getAll("status");
  return serviceQuerySchema.parse({
    status: statuses.length > 1
      ? statuses
      : statuses.length === 1
      ? statuses[0]
      : undefined,
    mode: url.searchParams.get("mode") ?? undefined,
    origin: url.searchParams.get("origin") ?? undefined,
    serviceTypeId: url.searchParams.get("serviceTypeId") ?? undefined,
    vehicleId: url.searchParams.get("vehicleId") ?? undefined,
    ticketId: url.searchParams.get("ticketId") ?? undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    crewId: url.searchParams.get("crewId") ?? undefined,
    search: searchParam(url.searchParams),
    timeFrom: url.searchParams.get("timeFrom") ?? undefined,
    timeTo: url.searchParams.get("timeTo") ?? undefined,
    scheduledFrom: url.searchParams.get("scheduledFrom") ?? undefined,
    scheduledTo: url.searchParams.get("scheduledTo") ?? undefined,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  });
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    const query = parseServiceQuery(new URL(request.url));

    // Field actors can only see services assigned to their own crew
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      query.crewId = scenario.actor.crewId;
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/services${backendQuery(query, ["status", "mode", "origin", "zoneId", "crewId", "serviceTypeId", "vehicleId", "ticketId", "scheduledFrom", "scheduledTo", "page", "pageSize"])}`);
      if (!backendResponse.ok) return forwardResponse(backendResponse);
      const parsed = servicesEnvelopeSchema.safeParse(await backendResponse.json().catch(() => undefined));
      if (!parsed.success) {
        return errorResponse(502, "La respuesta de servicios no respeta el contrato esperado.", path);
      }
      const dropped = droppedRecords(parsed.data.data);
      return NextResponse.json(dropped ? { ...parsed.data, meta: { ...parsed.data.meta, dropped } } : parsed.data);
    }

    return NextResponse.json(paginateServiceFixtures(filterServiceFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(400, "Los filtros de servicios son inválidos.", path);
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudieron cargar los servicios.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    // Permission check: scheduling is an Office decision, not a Field action.
    authorize(session, { office: true, officeMessage: "Solo Oficina puede programar un servicio.", capability: "service:schedule", throwOnError: true });

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

    if (backendMode(session)) {
      let backendInput;
      try {
        backendInput = toCreateServiceBackendInput(input);
      } catch (error) {
      if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
        if (error instanceof BackendServiceZoneSelectionError) {
          return errorResponse(400, error.message, path);
        }
        throw error;
      }
      const backendResponse = await fetchBackend(request, "/services", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(backendInput),
      });
            return forwardResponse(backendResponse);
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
      // Como el backend: la cuadrilla y el vehículo se pueden asignar en el mismo alta.
      crewId: input.crewId ?? null,
      crewName: crewFixtures.find((crew) => crew.id === input.crewId)?.name ?? null,
      vehicleId: input.vehicleId ?? null,
      vehiclePlate: vehicleFixtures.find((vehicle) => vehicle.id === input.vehicleId)?.plate ?? null,
      ticketId: input.origin === "TICKET" ? (input.ticketId ?? null) : null,
      inspectionId: input.origin === "INSPECTION" ? (input.inspectionId ?? null) : null,
      weatherAlertId: input.origin === "WEATHER_ALERT" ? (input.weatherAlertId ?? null) : null,
      notes: input.notes ?? null,
      coordinates: { x: 50, y: 50 },
      attachments: [],
      history: [{ label: "Programado", at: new Date().toISOString().slice(0, 16).replace("T", " "), done: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addServiceFixture(newService);
    if (input.origin === "INSPECTION" && input.inspectionId) {
      linkEnvironmentalInspectionService(input.inspectionId, newService.id);
    }
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
    return mapSessionError(error, path, "No se pudo programar el servicio.");
  }
}
