import { HttpResponse, http } from "msw";

import { getScenario, scenarios, type ScenarioId } from "@/lib/scenarios";
import {
  addServiceFixture,
  filterServiceFixtures,
  paginateServiceFixtures,
  serviceFixtures,
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
import { filterZoneFixtures, paginateZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import type { ZoneQuery } from "@/lib/zones";

const scenarioIds = new Set(Object.values(scenarios).map((scenario) => scenario.id));

function zoneQueryFromUrl(url: string): ZoneQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function serviceQueryFromUrl(url: string): ServiceQuery {
  const params = new URL(url).searchParams;
  const statuses = params.getAll("status");
  return {
    status: statuses.length > 1
      ? (statuses as ServiceStatus[])
      : statuses.length === 1
      ? (statuses[0] as ServiceStatus)
      : undefined,
    mode: (params.get("mode") as ServiceMode) ?? undefined,
    origin: (params.get("origin") as ServiceOrigin) ?? undefined,
    zoneId: params.get("zoneId") ?? undefined,
    crewId: params.get("crewId") ?? undefined,
    search: params.get("search") ?? undefined,
    timeFrom: params.get("timeFrom") ?? undefined,
    timeTo: params.get("timeTo") ?? undefined,
    scheduledFrom: params.get("scheduledFrom") ?? undefined,
    scheduledTo: params.get("scheduledTo") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

export const handlers = [
  http.get("*/api/mock/scenarios", () => HttpResponse.json(Object.values(scenarios))),
  http.get("*/api/mock/scenarios/:scenarioId", ({ params }) => {
    const scenarioId = params.scenarioId;

    if (typeof scenarioId !== "string" || !scenarioIds.has(scenarioId as ScenarioId)) {
      return HttpResponse.json({ message: "Escenario no encontrado." }, { status: 404 });
    }

    return HttpResponse.json(getScenario(scenarioId as ScenarioId));
  }),
  http.get("*/api/zones", ({ request }) => {
    const query = zoneQueryFromUrl(request.url);
    return HttpResponse.json(paginateZoneFixtures(filterZoneFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/services", ({ request }) => {
    const query = serviceQueryFromUrl(request.url);
    return HttpResponse.json(paginateServiceFixtures(filterServiceFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/services/:serviceId", ({ params }) => {
    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Servicio no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/services/${params.serviceId}`,
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(service);
  }),
  http.post("*/api/services", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El cuerpo de la solicitud no es un JSON válido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/services",
        },
        { status: 400 },
      );
    }

    const parsed = createServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/services",
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
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
      flag: null,
      coordinates: { x: 50, y: 50 },
      history: [{ label: "Programado", at: new Date().toISOString().slice(0, 16).replace("T", " "), done: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addServiceFixture(newService);
    return HttpResponse.json(newService, { status: 201 });
  }),
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
