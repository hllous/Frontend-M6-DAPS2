import { HttpResponse, http } from "msw";

import { getScenario, scenarios, type ScenarioId } from "@/lib/scenarios";
import {
  addAttachmentToService,
  addAttachmentToZoneResult,
  addServiceFixture,
  addZoneResultFixture,
  evidenceCache,
  filterServiceFixtures,
  getZoneResultsByServiceId,
  paginateServiceFixtures,
  sanitizeFilename,
  serviceFixtures,
  updateServiceFixture,
  zoneResultFixtures,
} from "@/lib/services-fixtures";
import {
  assignCrewInputSchema,
  cancelServiceInputSchema,
  confirmRescheduleInputSchema,
  createServiceInputSchema,
  CREW_CATALOG,
  evidenceOwnerTypeSchema,
  NOT_SERVICED_REASON_LABEL,
  recordZoneResultInputSchema,
  rescheduleServiceInputSchema,
  ROUTE_CATALOG,
  SERVICE_TYPE_CATALOG,
  suspendServiceInputSchema,
  type Attachment,
  type Service,
  type ServiceMode,
  type ServiceOrigin,
  type ServiceQuery,
  type ServiceStatus,
  type ZoneResult,
  VEHICLE_CATALOG,
} from "@/lib/services";
import {
  addZoneFixture,
  assignNeighborhoodsFixture,
  filterZoneFixtures,
  getZoneFixture,
  getZoneReferences,
  paginateZoneFixtures,
  removeNeighborhoodFixture,
  updateZoneFixture,
  zoneFixtures,
} from "@/lib/zones-fixtures";
import {
  assignNeighborhoodsInputSchema,
  createZoneInputSchema,
  updateZoneInputSchema,
  type Zone,
  type ZoneQuery,
} from "@/lib/zones";
import {
  addRouteFixture,
  filterRouteFixtures,
  getRouteFixture,
  getRouteReferences,
  paginateRouteFixtures,
  setRouteStopsFixture,
  updateRouteFixture,
  routeFixtures,
} from "@/lib/routes-fixtures";
import {
  createRouteInputSchema,
  setRouteStopsInputSchema,
  updateRouteInputSchema,
  type Route,
  type RouteQuery,
} from "@/lib/routes";
import { addDisposalSiteFixture, disposalSiteFixtures, filterDisposalSiteFixtures, paginateDisposalSiteFixtures, updateDisposalSiteFixture } from "@/lib/disposal-site-fixtures";
import { disposalSiteCreateInputSchema, disposalSiteTypeSchema, disposalSiteUpdateInputSchema, type DisposalSiteQuery } from "@/lib/disposal-sites";
import { addServiceTypeFixture, filterServiceTypeFixtures, paginateServiceTypeFixtures, serviceTypeFixtures, updateServiceTypeFixture } from "@/lib/service-type-fixtures";
import { serviceTypeCategorySchema, serviceTypeCreateInputSchema, serviceTypeModeSchema, serviceTypeUpdateInputSchema, type ServiceTypeQuery } from "@/lib/service-types";
import { addServiceFrequencyFixture, closeServiceFrequencyFixture, filterServiceFrequencyFixtures, paginateServiceFrequencyFixtures, serviceFrequencyFixtures, updateServiceFrequencyFixture } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyCreateInputSchema, serviceFrequencyShiftSchema, serviceFrequencyUpdateInputSchema, type ServiceFrequencyQuery } from "@/lib/service-frequencies";
import { createVehicleInputSchema, updateVehicleInputSchema, type VehicleQuery } from "@/lib/vehicles";
import { addVehicleFixture, filterVehicleFixtures, paginateVehicleFixtures, vehicleFixtures } from "@/lib/vehicles-fixtures";
import { addCrewFixture, filterCrewFixtures, paginateCrewFixtures, crewFixtures } from "@/lib/crew-fixtures";
import { addCrewMembersInputSchema, createCrewInputSchema, updateCrewInputSchema, type CrewQuery } from "@/lib/crews";
import {
  addGreenSpaceFixture,
  filterGreenSpaceFixtures,
  greenSpaceFixtures,
  paginateGreenSpaceFixtures,
} from "@/lib/green-space-fixtures";
import {
  createGreenSpaceInputSchema,
  greenSpaceTypeSchema,
  updateGreenSpaceInputSchema,
  type GreenSpaceQuery,
} from "@/lib/green-spaces";
import {
  addRepairRequestFixture,
  createRepairRequestFixture,
  filterRepairRequestFixtures,
  getRepairRequestFixture,
  paginateRepairRequestFixtures,
  transitionRepairRequestFixture,
} from "@/lib/repair-request-fixtures";
import {
  createRepairRequestInputSchema,
  repairDamageTypeSchema,
  repairRequestRecoveryInputSchema,
  repairRequestStatusSchema,
  repairSeveritySchema,
} from "@/lib/repair-requests";
import {
  addContainerFixture,
  filterContainerFixtures,
  containerFixtures,
  paginateContainerFixtures,
  updateContainerFixture,
} from "@/lib/containers-fixtures";
import {
  createContainerInputSchema,
  updateContainerInputSchema,
  containerStatusSchema,
  containerTypeSchema,
  type ContainerQuery,
} from "@/lib/containers";
import {
  addStreetClosureRequestFixture,
  createStreetClosureRequestFixture,
  filterStreetClosureRequestFixtures,
  getStreetClosureRequestFixture,
  paginateStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import {
  approveStreetClosureRequestInputSchema,
  createStreetClosureRequestInputSchema,
  streetClosureRequestQuerySchema,
} from "@/lib/street-closure-requests";

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

function routeQueryFromUrl(url: string): RouteQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    zoneId: params.get("zoneId") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function vehicleQueryFromUrl(url: string): VehicleQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    vehicleType: (params.get("vehicleType") as VehicleQuery["vehicleType"]) ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function crewQueryFromUrl(url: string): CrewQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    crewType: (params.get("crewType") as CrewQuery["crewType"]) ?? undefined,
    defaultShift: (params.get("defaultShift") as CrewQuery["defaultShift"]) ?? undefined,
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

function disposalSiteQueryFromUrl(url: string): DisposalSiteQuery {
  const params = new URL(url).searchParams;
  const siteType = disposalSiteTypeSchema.safeParse(params.get("siteType"));
  return { active: params.has("active") ? params.get("active") === "true" : undefined, siteType: siteType.success ? siteType.data : undefined, search: params.get("search") ?? undefined, page: params.has("page") ? Number(params.get("page")) : undefined, pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined };
}

function serviceTypeQueryFromUrl(url: string): ServiceTypeQuery {
  const params = new URL(url).searchParams;
  const category = serviceTypeCategorySchema.safeParse(params.get("category"));
  const mode = serviceTypeModeSchema.safeParse(params.get("mode"));
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    category: category.success ? category.data : undefined,
    mode: mode.success ? mode.data : undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function serviceFrequencyQueryFromUrl(url: string): ServiceFrequencyQuery {
  const params = new URL(url).searchParams;
  const shift = serviceFrequencyShiftSchema.safeParse(params.get("shift"));
  const weekday = Number(params.get("weekday"));
  return {
    serviceTypeId: params.get("serviceTypeId") ?? undefined,
    routeId: params.get("routeId") ?? undefined,
    shift: shift.success ? shift.data : undefined,
    weekday: Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : undefined,
    validOn: params.get("validOn") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function greenSpaceQueryFromUrl(url: string): GreenSpaceQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    spaceType: greenSpaceTypeSchema.safeParse(params.get("spaceType")).success
      ? (params.get("spaceType") as GreenSpaceQuery["spaceType"])
      : undefined,
    zoneId: params.get("zoneId") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function containerQueryFromUrl(url: string): ContainerQuery {
  const params = new URL(url).searchParams;
  const rawStatus = params.get("status");
  const rawType = params.get("containerType");
  return {
    status: containerStatusSchema.safeParse(rawStatus).success
      ? (rawStatus as ContainerQuery["status"])
      : undefined,
    containerType: containerTypeSchema.safeParse(rawType).success
      ? (rawType as ContainerQuery["containerType"])
      : undefined,
    zoneId: params.get("zoneId") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function streetClosureRequestQueryFromUrl(url: string) {
  const params = new URL(url).searchParams;
  return streetClosureRequestQuerySchema.parse({
    status: params.get("status") ?? undefined,
    sourceId: params.get("sourceId") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  });
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
  // StreetClosureRequest adapter contract and deterministic scenario handlers.
  http.get("*/api/street-closure-requests", ({ request }) => {
    const query = streetClosureRequestQueryFromUrl(request.url);
    return HttpResponse.json(
      paginateStreetClosureRequestFixtures(
        filterStreetClosureRequestFixtures(query),
        query.page,
        query.pageSize,
      ),
    );
  }),
  http.post("*/api/street-closure-requests", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "El cuerpo de la solicitud no es un JSON válido.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/street-closure-requests" },
        { status: 400 },
      );
    }
    const parsed = createStreetClosureRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/street-closure-requests" },
        { status: 400 },
      );
    }
    const service = serviceFixtures.find((candidate) => candidate.id === parsed.data.sourceId);
    if (!service) {
      return HttpResponse.json(
        { statusCode: 404, message: "Servicio de origen no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/street-closure-requests" },
        { status: 404 },
      );
    }
    const created = createStreetClosureRequestFixture(parsed.data, service);
    addStreetClosureRequestFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get("*/api/street-closure-requests/:requestId", ({ params }) => {
    const item = getStreetClosureRequestFixture(params.requestId as string);
    if (!item) {
      return HttpResponse.json(
        { statusCode: 404, message: "Solicitud de corte de calle no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}` },
        { status: 404 },
      );
    }
    return HttpResponse.json(item);
  }),
  http.post("*/api/street-closure-requests/:requestId/approve", async ({ params, request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "El cuerpo de la aprobación no es un JSON válido.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}/approve` },
        { status: 400 },
      );
    }
    const parsed = approveStreetClosureRequestInputSchema.safeParse(body);
    const item = getStreetClosureRequestFixture(params.requestId as string);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}/approve` },
        { status: 400 },
      );
    }
    if (!item) return HttpResponse.json({ statusCode: 404, message: "Solicitud no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}/approve` }, { status: 404 });
    const updated = updateStreetClosureRequestFixture(item.id, { status: "APPROVED", closureId: parsed.data.closureId, updatedAt: new Date().toISOString() });
    return HttpResponse.json(updated);
  }),
  http.post("*/api/street-closure-requests/:requestId/reject", ({ params }) => {
    const item = getStreetClosureRequestFixture(params.requestId as string);
    if (!item) return HttpResponse.json({ statusCode: 404, message: "Solicitud no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}/reject` }, { status: 404 });
    return HttpResponse.json(updateStreetClosureRequestFixture(item.id, { status: "REJECTED", updatedAt: new Date().toISOString() }));
  }),
  http.post("*/api/street-closure-requests/:requestId/end", ({ params }) => {
    const item = getStreetClosureRequestFixture(params.requestId as string);
    if (!item) return HttpResponse.json({ statusCode: 404, message: "Solicitud no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/street-closure-requests/${params.requestId}/end` }, { status: 404 });
    return HttpResponse.json(updateStreetClosureRequestFixture(item.id, { status: "ENDED", updatedAt: new Date().toISOString() }));
  }),
  http.get("*/api/zones", ({ request }) => {
    const query = zoneQueryFromUrl(request.url);
    return HttpResponse.json(paginateZoneFixtures(filterZoneFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/zones/:zoneId", ({ params }) => {
    const zone = getZoneFixture(params.zoneId as string);
    if (!zone) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Zona no encontrada.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/zones/${params.zoneId}`,
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(zone);
  }),
  http.post("*/api/zones", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/zones" },
        { status: 400 },
      );
    }
    const parsed = createZoneInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((i) => i.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/zones" },
        { status: 400 },
      );
    }
    const existing = zoneFixtures.find((z) => z.code.toLowerCase() === parsed.data.code.toLowerCase());
    if (existing) {
      return HttpResponse.json(
        { statusCode: 409, message: `Ya existe una zona operativa con el código ${parsed.data.code}.`, error: "Conflict", timestamp: new Date().toISOString(), path: "/api/zones" },
        { status: 409 },
      );
    }
    const created: Zone = {
      id: `zone-${Date.now()}`,
      code: parsed.data.code,
      name: parsed.data.name,
      active: true,
      neighborhoodIds: [],
    };
    addZoneFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/zones/:zoneId", async ({ params, request }) => {
    const zoneId = params.zoneId as string;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}` },
        { status: 400 },
      );
    }
    const parsed = updateZoneInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((i) => i.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}` },
        { status: 400 },
      );
    }
    const updated = updateZoneFixture(zoneId, parsed.data);
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Zona no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.delete("*/api/zones/:zoneId", ({ params }) => {
    const zoneId = params.zoneId as string;
    const updated = updateZoneFixture(zoneId, { active: false });
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Zona no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.post("*/api/zones/:zoneId/neighborhoods", async ({ params, request }) => {
    const zoneId = params.zoneId as string;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON invÃ¡lido", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}/neighborhoods` },
        { status: 400 },
      );
    }

    const parsed = assignNeighborhoodsInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}/neighborhoods` },
        { status: 400 },
      );
    }

    const updated = assignNeighborhoodsFixture(zoneId, parsed.data.neighborhoodIds);
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Zona no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}/neighborhoods` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.delete("*/api/zones/:zoneId/neighborhoods/:neighborhoodId", ({ params }) => {
    const zoneId = params.zoneId as string;
    const neighborhoodId = params.neighborhoodId as string;
    const zone = getZoneFixture(zoneId);
    if (!zone || !zone.neighborhoodIds.includes(neighborhoodId)) {
      return HttpResponse.json(
        { statusCode: 404, message: "El barrio no esta asignado a la zona operativa.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}/neighborhoods/${neighborhoodId}` },
        { status: 404 },
      );
    }

    return HttpResponse.json(removeNeighborhoodFixture(zoneId, neighborhoodId));
  }),
  http.get("*/api/zones/:zoneId/references", ({ params }) => {
    const zoneId = params.zoneId as string;
    const zone = getZoneFixture(zoneId);
    if (!zone) {
      return HttpResponse.json(
        { statusCode: 404, message: "Zona no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/zones/${zoneId}/references` },
        { status: 404 },
      );
    }
    return HttpResponse.json(getZoneReferences(zoneId));
  }),
  http.get("*/api/routes", ({ request }) => {
    const query = routeQueryFromUrl(request.url);
    return HttpResponse.json(paginateRouteFixtures(filterRouteFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/routes/:routeId", ({ params }) => {
    const route = getRouteFixture(params.routeId as string);
    if (!route) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Recorrido no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/routes/${params.routeId}`,
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(route);
  }),
  http.post("*/api/routes", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/routes" },
        { status: 400 },
      );
    }
    const parsed = createRouteInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((i) => i.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/routes" },
        { status: 400 },
      );
    }
    const existing = routeFixtures.find((r) => r.code.toLowerCase() === parsed.data.code.toLowerCase());
    if (existing) {
      return HttpResponse.json(
        { statusCode: 409, message: `Ya existe un recorrido con el código ${parsed.data.code}.`, error: "Conflict", timestamp: new Date().toISOString(), path: "/api/routes" },
        { status: 409 },
      );
    }
    const created: Route = {
      id: `route-${Date.now()}`,
      code: parsed.data.code,
      name: parsed.data.name,
      active: true,
      stops: [],
    };
    addRouteFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/routes/:routeId", async ({ params, request }) => {
    const routeId = params.routeId as string;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}` },
        { status: 400 },
      );
    }
    const parsed = updateRouteInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((i) => i.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}` },
        { status: 400 },
      );
    }
    const updated = updateRouteFixture(routeId, parsed.data);
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Recorrido no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.delete("*/api/routes/:routeId", ({ params }) => {
    const routeId = params.routeId as string;
    const updated = updateRouteFixture(routeId, { active: false });
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Recorrido no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.get("*/api/routes/:routeId/references", ({ params }) => {
    const routeId = params.routeId as string;
    const route = getRouteFixture(routeId);
    if (!route) {
      return HttpResponse.json(
        { statusCode: 404, message: "Recorrido no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/references` },
        { status: 404 },
      );
    }
    return HttpResponse.json(getRouteReferences(routeId));
  }),
  http.put("*/api/routes/:routeId/stops", async ({ params, request }) => {
    const routeId = params.routeId as string;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/stops` },
        { status: 400 },
      );
    }
    const parsed = setRouteStopsInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { statusCode: 400, message: parsed.error.issues.map((i) => i.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/stops` },
        { status: 400 },
      );
    }
    const route = getRouteFixture(routeId);
    if (!route) {
      return HttpResponse.json(
        { statusCode: 404, message: "Recorrido no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/stops` },
        { status: 404 },
      );
    }
    const zoneIds = parsed.data.stops.map((s) => s.zoneId);
    if (zoneIds.length > 0) {
      const missingZones = zoneIds.filter((zid) => !zoneFixtures.some((z) => z.id === zid));
      if (missingZones.length > 0) {
        return HttpResponse.json(
          { statusCode: 404, message: `Zonas no encontradas: ${missingZones.join(", ")}`, error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/stops` },
          { status: 404 },
        );
      }
    }
    const updated = setRouteStopsFixture(routeId, parsed.data.stops);
    if (!updated) {
      return HttpResponse.json(
        { statusCode: 404, message: "Recorrido no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/routes/${routeId}/stops` },
        { status: 404 },
      );
    }
    return HttpResponse.json(updated);
  }),
  http.get("*/api/disposal-sites", ({ request }) => { const query = disposalSiteQueryFromUrl(request.url); return HttpResponse.json(paginateDisposalSiteFixtures(filterDisposalSiteFixtures(query), query.page, query.pageSize)); }),
  http.get("*/api/disposal-sites/:disposalSiteId", ({ params }) => { const item = disposalSiteFixtures.find((candidate) => candidate.id === params.disposalSiteId); return item ? HttpResponse.json(item) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.post("*/api/disposal-sites", async ({ request }) => { const parsed = disposalSiteCreateInputSchema.safeParse(await request.json()); if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 400 }); const created = { id: `ds-${Date.now()}`, ...parsed.data, active: true }; addDisposalSiteFixture(created); return HttpResponse.json(created, { status: 201 }); }),
  http.patch("*/api/disposal-sites/:disposalSiteId", async ({ params, request }) => { const parsed = disposalSiteUpdateInputSchema.safeParse(await request.json()); if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 400 }); const updated = updateDisposalSiteFixture(params.disposalSiteId as string, parsed.data); return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.delete("*/api/disposal-sites/:disposalSiteId", ({ params }) => { const updated = updateDisposalSiteFixture(params.disposalSiteId as string, { active: false }); return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.get("*/api/service-types", ({ request }) => {
    const query = serviceTypeQueryFromUrl(request.url);
    return HttpResponse.json(paginateServiceTypeFixtures(filterServiceTypeFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/service-types/:serviceTypeId", ({ params }) => {
    const item = serviceTypeFixtures.find((candidate) => candidate.id === params.serviceTypeId);
    return item ? HttpResponse.json(item) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-types" }, { status: 404 });
  }),
  http.post("*/api/service-types", async ({ request }) => {
    const parsed = serviceTypeCreateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-types" }, { status: 400 });
    const created = { id: `st-${Date.now()}`, ...parsed.data, active: true };
    addServiceTypeFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/service-types/:serviceTypeId", async ({ params, request }) => {
    const parsed = serviceTypeUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-types" }, { status: 400 });
    const updated = updateServiceTypeFixture(params.serviceTypeId as string, parsed.data);
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-types" }, { status: 404 });
  }),
  http.delete("*/api/service-types/:serviceTypeId", ({ params }) => {
    const updated = updateServiceTypeFixture(params.serviceTypeId as string, { active: false });
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-types" }, { status: 404 });
  }),
  http.get("*/api/service-frequencies", ({ request }) => {
    const query = serviceFrequencyQueryFromUrl(request.url);
    return HttpResponse.json(paginateServiceFrequencyFixtures(filterServiceFrequencyFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/service-frequencies/:serviceFrequencyId", ({ params }) => {
    const item = serviceFrequencyFixtures.find((candidate) => candidate.id === params.serviceFrequencyId);
    return item ? HttpResponse.json(item) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
  }),
  http.post("*/api/service-frequencies", async ({ request }) => {
    const parsed = serviceFrequencyCreateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const serviceType = serviceTypeFixtures.find((item) => item.id === parsed.data.serviceTypeId);
    if (!serviceType || serviceType.mode !== "ROUTE") return HttpResponse.json({ statusCode: 400, message: "El tipo de servicio debe ser de modo ROUTE.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const created = { id: `freq-${Date.now()}`, ...parsed.data, validTo: parsed.data.validTo ?? null };
    addServiceFrequencyFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/service-frequencies/:serviceFrequencyId", async ({ params, request }) => {
    const parsed = serviceFrequencyUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const updated = updateServiceFrequencyFixture(params.serviceFrequencyId as string, parsed.data);
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
  }),
  http.delete("*/api/service-frequencies/:serviceFrequencyId", ({ params }) => {
    const updated = closeServiceFrequencyFixture(params.serviceFrequencyId as string, "2026-09-06");
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
  }),
  http.get("*/api/vehicles", ({ request }) => HttpResponse.json(paginateVehicleFixtures(filterVehicleFixtures(vehicleQueryFromUrl(request.url))))),
  http.get("*/api/vehicles/:vehicleId", ({ params }) => {
    const vehicle = vehicleFixtures.find((item) => item.id === params.vehicleId);
    return vehicle ? HttpResponse.json(vehicle) : HttpResponse.json({ statusCode: 404, message: "Vehículo no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/vehicles/${params.vehicleId}` }, { status: 404 });
  }),
  http.post("*/api/vehicles", async ({ request }) => {
    const parsed = createVehicleInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de vehículo inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/vehicles" }, { status: 400 });
    const vehicle = { id: `vehicle-${vehicleFixtures.length + 1}`, ...parsed.data, active: true };
    addVehicleFixture(vehicle);
    return HttpResponse.json(vehicle, { status: 201 });
  }),
  http.patch("*/api/vehicles/:vehicleId", async ({ params, request }) => {
    const vehicle = vehicleFixtures.find((item) => item.id === params.vehicleId);
    const parsed = updateVehicleInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!vehicle) return HttpResponse.json({ statusCode: 404, message: "Vehículo no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/vehicles/${params.vehicleId}` }, { status: 404 });
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de vehículo inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/vehicles/${params.vehicleId}` }, { status: 400 });
    Object.assign(vehicle, parsed.data);
    return HttpResponse.json(vehicle);
  }),
  http.delete("*/api/vehicles/:vehicleId", ({ params }) => {
    const vehicle = vehicleFixtures.find((item) => item.id === params.vehicleId);
    if (!vehicle) return HttpResponse.json({ statusCode: 404, message: "Vehículo no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/vehicles/${params.vehicleId}` }, { status: 404 });
    vehicle.active = false;
    return HttpResponse.json(vehicle);
  }),
  http.get("*/api/crews", ({ request }) => HttpResponse.json(paginateCrewFixtures(filterCrewFixtures(crewQueryFromUrl(request.url))))),
  http.get("*/api/crews/:crewId", ({ params }) => {
    const crew = crewFixtures.find((item) => item.id === params.crewId);
    return crew ? HttpResponse.json(crew) : HttpResponse.json({ statusCode: 404, message: "Cuadrilla no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}` }, { status: 404 });
  }),
  http.post("*/api/crews", async ({ request }) => {
    const parsed = createCrewInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de cuadrilla inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/crews" }, { status: 400 });
    const crew = { id: `crew-${crewFixtures.length + 1}`, ...parsed.data, memberUserIds: [parsed.data.leaderUserId], active: true };
    addCrewFixture(crew);
    return HttpResponse.json(crew, { status: 201 });
  }),
  http.patch("*/api/crews/:crewId", async ({ params, request }) => {
    const crew = crewFixtures.find((item) => item.id === params.crewId);
    const parsed = updateCrewInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!crew) return HttpResponse.json({ statusCode: 404, message: "Cuadrilla no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}` }, { status: 404 });
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de cuadrilla inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}` }, { status: 400 });
    Object.assign(crew, parsed.data);
    return HttpResponse.json(crew);
  }),
  http.delete("*/api/crews/:crewId", ({ params }) => {
    const crew = crewFixtures.find((item) => item.id === params.crewId);
    if (!crew) return HttpResponse.json({ statusCode: 404, message: "Cuadrilla no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}` }, { status: 404 });
    crew.active = false;
    return HttpResponse.json(crew);
  }),
  http.post("*/api/crews/:crewId/members", async ({ params, request }) => {
    const crew = crewFixtures.find((item) => item.id === params.crewId);
    const parsed = addCrewMembersInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!crew) return HttpResponse.json({ statusCode: 404, message: "Cuadrilla no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}/members` }, { status: 404 });
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Los integrantes de la cuadrilla son inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}/members` }, { status: 400 });
    crew.memberUserIds = [...new Set([...crew.memberUserIds, ...parsed.data.memberUserIds])];
    return HttpResponse.json(crew);
  }),
  http.delete("*/api/crews/:crewId/members/:userId", ({ params }) => {
    const crew = crewFixtures.find((item) => item.id === params.crewId);
    if (!crew) return HttpResponse.json({ statusCode: 404, message: "Cuadrilla no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/crews/${params.crewId}/members/${params.userId}` }, { status: 404 });
    crew.memberUserIds = crew.memberUserIds.filter((memberUserId) => memberUserId !== params.userId);
    return HttpResponse.json(crew);
  }),
  http.get("*/api/green-spaces", ({ request }) => {
    const query = greenSpaceQueryFromUrl(request.url);
    return HttpResponse.json(paginateGreenSpaceFixtures(filterGreenSpaceFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/green-spaces/:greenSpaceId", ({ params }) => {
    const greenSpace = greenSpaceFixtures.find((item) => item.id === params.greenSpaceId);
    return greenSpace
      ? HttpResponse.json(greenSpace)
      : HttpResponse.json(
          {
            statusCode: 404,
            message: "Espacio verde no encontrado.",
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: `/api/green-spaces/${params.greenSpaceId}`,
          },
          { status: 404 },
        );
  }),
  http.post("*/api/green-spaces", async ({ request }) => {
    const parsed = createGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Datos de espacio verde inválidos.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/green-spaces",
        },
        { status: 400 },
      );
    }
    const greenSpace = { id: `green-space-108-${greenSpaceFixtures.length + 1}`, ...parsed.data, active: true };
    addGreenSpaceFixture(greenSpace);
    return HttpResponse.json(greenSpace, { status: 201 });
  }),
  http.patch("*/api/green-spaces/:greenSpaceId", async ({ params, request }) => {
    const greenSpace = greenSpaceFixtures.find((item) => item.id === params.greenSpaceId);
    const parsed = updateGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!greenSpace) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Espacio verde no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/green-spaces/${params.greenSpaceId}`,
        },
        { status: 404 },
      );
    }
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Datos de espacio verde inválidos.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/green-spaces/${params.greenSpaceId}`,
        },
        { status: 400 },
      );
    }
    Object.assign(greenSpace, parsed.data);
    return HttpResponse.json(greenSpace);
  }),
  http.delete("*/api/green-spaces/:greenSpaceId", ({ params }) => {
    const greenSpace = greenSpaceFixtures.find((item) => item.id === params.greenSpaceId);
    if (!greenSpace) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Espacio verde no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/green-spaces/${params.greenSpaceId}`,
        },
        { status: 404 },
      );
    }
    greenSpace.active = false;
    return HttpResponse.json(greenSpace);
  }),
  // --- Containers catalog (#120) ---
  http.get("*/api/containers", ({ request }) => {
    const query = containerQueryFromUrl(request.url);
    return HttpResponse.json(paginateContainerFixtures(filterContainerFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/containers/:containerId", ({ params }) => {
    const container = containerFixtures.find((item) => item.id === params.containerId);
    return container
      ? HttpResponse.json(container)
      : HttpResponse.json(
          {
            statusCode: 404,
            message: "Contenedor no encontrado.",
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: `/api/containers/${params.containerId}`,
          },
          { status: 404 },
        );
  }),
  http.post("*/api/containers", async ({ request }) => {
    const parsed = createContainerInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Datos de contenedor inválidos.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/containers",
        },
        { status: 400 },
      );
    }
    const newContainer = {
      id: `cont-${Date.now()}`,
      ...parsed.data,
      status: "ACTIVE" as const,
    };
    addContainerFixture(newContainer);
    return HttpResponse.json(newContainer, { status: 201 });
  }),
  http.patch("*/api/containers/:containerId", async ({ params, request }) => {
    const container = containerFixtures.find((item) => item.id === params.containerId);
    const parsed = updateContainerInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}`,
        },
        { status: 404 },
      );
    }
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Datos de contenedor inválidos.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}`,
        },
        { status: 400 },
      );
    }
    const updated = updateContainerFixture(params.containerId as string, parsed.data);
    return HttpResponse.json(updated);
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
      coordinates: { x: 50, y: 50 },
      attachments: [],
      history: [{ label: "Programado", at: new Date().toISOString().slice(0, 16).replace("T", " "), done: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addServiceFixture(newService);
    return HttpResponse.json(newService, { status: 201 });
  }),
  http.post("*/api/services/:serviceId/assign-crew", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/assign-crew`,
        },
        { status: 400 },
      );
    }

    const parsed = assignCrewInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/assign-crew`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Servicio no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/assign-crew`,
        },
        { status: 404 },
      );
    }

    const serviceType = SERVICE_TYPE_CATALOG.find((t) => t.id === service.serviceTypeId);
    if (serviceType?.requiresVehicle && (!parsed.data.vehicleId || !parsed.data.vehicleId.trim())) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El tipo de servicio requiere la asignación obligatoria de un vehículo operativo.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/assign-crew`,
        },
        { status: 400 },
      );
    }

    const crew = CREW_CATALOG.find((c) => c.id === parsed.data.crewId);
    const vehicle = parsed.data.vehicleId
      ? VEHICLE_CATALOG.find((v) => v.id === parsed.data.vehicleId)
      : null;

    const historyEntry = {
      label: "Asignado",
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
      done: true,
    };

    const updated = updateServiceFixture(service.id, {
      crewId: parsed.data.crewId,
      crewName: crew?.name ?? parsed.data.crewId,
      vehicleId: parsed.data.vehicleId ?? null,
      vehiclePlate: vehicle?.plate ?? null,
      history: [...service.history, historyEntry],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/start", ({ params }) => {
    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/start`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "SCHEDULED") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden iniciar servicios en estado SCHEDULED (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/start`,
        },
        { status: 409 },
      );
    }

    if (!service.crewId) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: "No se puede iniciar el servicio sin una cuadrilla asignada.",
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/start`,
        },
        { status: 409 },
      );
    }

    const serviceType = SERVICE_TYPE_CATALOG.find((t) => t.id === service.serviceTypeId);
    if (serviceType?.requiresVehicle && (!service.vehicleId || !service.vehicleId.trim())) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: "El tipo de servicio requiere un vehículo operativo asignado para iniciar.",
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/start`,
        },
        { status: 409 },
      );
    }

    const historyEntry = {
      label: "En curso",
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
      done: true,
    };

    const updated = updateServiceFixture(service.id, {
      status: "IN_PROGRESS",
      history: [...service.history, historyEntry],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/suspend", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/suspend`,
        },
        { status: 400 },
      );
    }

    const parsed = suspendServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/suspend`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/suspend`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "IN_PROGRESS") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden suspender servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/suspend`,
        },
        { status: 409 },
      );
    }

    const statusReason = `${NOT_SERVICED_REASON_LABEL[parsed.data.reason]}: ${parsed.data.note}`;

    const updated = updateServiceFixture(service.id, {
      status: "SUSPENDED",
      statusReason,
      history: [
        ...service.history,
        {
          label: "Suspendido",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/resume", ({ params }) => {
    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/resume`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "SUSPENDED") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden reanudar servicios suspendidos (SUSPENDED) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/resume`,
        },
        { status: 409 },
      );
    }

    const updated = updateServiceFixture(service.id, {
      status: "IN_PROGRESS",
      statusReason: null,
      history: [
        ...service.history,
        {
          label: "Reanudado",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/reschedule", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/reschedule`,
        },
        { status: 400 },
      );
    }

    const parsed = rescheduleServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/reschedule`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/reschedule`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "SCHEDULED") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden reprogramar servicios programados (SCHEDULED) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/reschedule`,
        },
        { status: 409 },
      );
    }

    const updated = updateServiceFixture(service.id, {
      status: "RESCHEDULED",
      statusReason: parsed.data.reason,
      history: [
        ...service.history,
        {
          label: "A reprogramar",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/confirm-reschedule", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/confirm-reschedule`,
        },
        { status: 400 },
      );
    }

    const parsed = confirmRescheduleInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/confirm-reschedule`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/confirm-reschedule`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "RESCHEDULED") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede confirmar la nueva fecha de servicios a reprogramar (RESCHEDULED) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/confirm-reschedule`,
        },
        { status: 409 },
      );
    }

    const updated = updateServiceFixture(service.id, {
      status: "SCHEDULED",
      statusReason: null,
      scheduledDate: parsed.data.scheduledDate,
      windowFrom: parsed.data.timeWindow.start,
      windowTo: parsed.data.timeWindow.end,
      history: [
        ...service.history,
        {
          label: "Programado",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/services/:serviceId/cancel", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/cancel`,
        },
        { status: 400 },
      );
    }

    const parsed = cancelServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/cancel`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: `Servicio ${params.serviceId} no encontrado.`,
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/cancel`,
        },
        { status: 404 },
      );
    }

    if (!["SCHEDULED", "RESCHEDULED", "SUSPENDED"].includes(service.status)) {
      const message =
        service.status === "IN_PROGRESS"
          ? "No se puede cancelar un servicio en curso (IN_PROGRESS) directamente; debe suspenderse primero."
          : `Solo se pueden cancelar servicios programados (SCHEDULED), a reprogramar (RESCHEDULED) o suspendidos (SUSPENDED) (estado actual: ${service.status}).`;
      return HttpResponse.json(
        {
          statusCode: 409,
          message,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/cancel`,
        },
        { status: 409 },
      );
    }

    const updated = updateServiceFixture(service.id, {
      status: "CANCELLED",
      statusReason: parsed.data.reason,
      history: [
        ...service.history,
        {
          label: "Cancelado",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.get("*/api/services/:serviceId/zone-results", ({ params }) => {
    const results = getZoneResultsByServiceId(params.serviceId as string);
    return HttpResponse.json(results);
  }),
  http.post("*/api/services/:serviceId/zone-results", async ({ params, request }) => {
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
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 400 },
      );
    }

    const parsed = recordZoneResultInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 400 },
      );
    }

    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Servicio no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "IN_PROGRESS") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden registrar resultados en servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 409 },
      );
    }

    if (!service.zoneIds.includes(parsed.data.zoneId)) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: `La zona ${parsed.data.zoneId} no pertenece al alcance delimitado de este servicio.`,
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 400 },
      );
    }

    const existingResults = getZoneResultsByServiceId(params.serviceId as string);
    if (existingResults.some((r) => r.zoneId === parsed.data.zoneId)) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `El resultado para la zona ${parsed.data.zoneId} ya fue registrado previamente.`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/zone-results`,
        },
        { status: 409 },
      );
    }

    const newResult: ZoneResult = {
      id: `ZR-${params.serviceId}-${Math.floor(100 + Math.random() * 900)}`,
      serviceId: params.serviceId as string,
      zoneId: parsed.data.zoneId,
      status: parsed.data.status,
      reason: parsed.data.status === "SERVICED" ? null : (parsed.data.reason ?? null),
      notes: parsed.data.notes ?? null,
      proposedDate: parsed.data.proposedDate ?? null,
      attachments: [],
      recordedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    addZoneResultFixture(newResult);
    return HttpResponse.json(newResult, { status: 201 });
  }),
  http.post("*/api/services/:serviceId/complete", ({ params }) => {
    const service = serviceFixtures.find((s) => s.id === params.serviceId);
    if (!service) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Servicio no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/complete`,
        },
        { status: 404 },
      );
    }

    if (service.status !== "IN_PROGRESS") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se pueden completar servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/complete`,
        },
        { status: 409 },
      );
    }

    const results = getZoneResultsByServiceId(params.serviceId as string);
    const missingZones = service.zoneIds.filter((zid) => !results.some((r) => r.zoneId === zid));
    if (missingZones.length > 0) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Falta registrar el resultado de ${missingZones.length} zona(s) del servicio antes de completar.`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/complete`,
        },
        { status: 409 },
      );
    }

    const allServiced = results.every((r) => r.status === "SERVICED");
    const computedStatus: ServiceStatus = allServiced ? "COMPLETED" : "PARTIALLY_COMPLETED";
    const historyLabel = computedStatus === "COMPLETED" ? "Completado" : "Parcial";

    const nonServicedNotes = results
      .filter((r) => r.status !== "SERVICED" && r.notes)
      .map((r) => r.notes)
      .join(" · ");

    const updated = updateServiceFixture(service.id, {
      status: computedStatus,
      statusReason: computedStatus === "PARTIALLY_COMPLETED"
        ? (nonServicedNotes || "Cierre parcial con zonas no atendidas o parciales")
        : null,
      history: [
        ...service.history,
        {
          label: historyLabel,
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/evidence", async ({ request }) => {
    const idempotencyKey = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key");
    if (!idempotencyKey || !idempotencyKey.trim()) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "La cabecera Idempotency-Key es obligatoria para la carga de evidencia.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El cuerpo de la solicitud debe ser multipart/form-data válido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    const rawOwnerType = formData.get("ownerType");
    const ownerId = formData.get("ownerId");

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Debe incluir un archivo válido en el campo 'file'.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    if (!rawOwnerType || typeof rawOwnerType !== "string") {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El campo 'ownerType' es obligatorio.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    const parsedOwnerType = evidenceOwnerTypeSchema.safeParse(rawOwnerType);
    if (!parsedOwnerType.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Tipo de propietario de evidencia inválido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    if (!ownerId || typeof ownerId !== "string" || !ownerId.trim()) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El campo 'ownerId' es obligatorio.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    const rawFileSize = formData.get("fileSize");
    const declaredSize = rawFileSize ? Number(rawFileSize) : NaN;
    const fileSize = !isNaN(declaredSize) ? declaredSize : file.size;

    const maxSizeBytes = 10 * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El archivo supera el tamaño máximo permitido de 10 MB.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    const mimeType = file.type || "application/octet-stream";
    if (!allowedMime.has(mimeType)) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP o PDF.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }

    const cacheKey = `${parsedOwnerType.data}:${ownerId}:${idempotencyKey}`;
    if (evidenceCache.has(cacheKey)) {
      return HttpResponse.json(evidenceCache.get(cacheKey)!, { status: 200 });
    }

    if (parsedOwnerType.data === "ZONE_RESULT") {
      const zoneResult = zoneResultFixtures.find((zr) => zr.id === ownerId);
      if (!zoneResult) {
        return HttpResponse.json(
          {
            statusCode: 404,
            message: `El resultado de zona ${ownerId} no existe.`,
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: "/api/evidence",
          },
          { status: 404 },
        );
      }
    }
    if (parsedOwnerType.data === "SERVICE") {
      const service = serviceFixtures.find((s) => s.id === ownerId);
      if (!service) {
        return HttpResponse.json(
          {
            statusCode: 404,
            message: `El servicio ${ownerId} no existe.`,
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: "/api/evidence",
          },
          { status: 404 },
        );
      }
    }

    const rawNameFromForm = formData.get("fileName");
    const fileObjName = (file as { name?: string }).name;
    const fileName =
      (typeof rawNameFromForm === "string" && rawNameFromForm.trim() ? rawNameFromForm : null) ||
      (fileObjName && fileObjName !== "blob" ? fileObjName : null) ||
      "archivo";
    const sanitizedFilename = sanitizeFilename(fileName, mimeType);

    const attachment: Attachment = {
      id: `att-${Math.floor(1000 + Math.random() * 9000)}`,
      url: `/mock/evidence/${sanitizedFilename}`,
      filename: sanitizedFilename,
      contentType: mimeType,
      uploadedAt: new Date().toISOString(),
    };

    if (parsedOwnerType.data === "ZONE_RESULT") {
      addAttachmentToZoneResult(ownerId, attachment);
    }
    if (parsedOwnerType.data === "SERVICE") {
      addAttachmentToService(ownerId, attachment);
    }

    evidenceCache.set(cacheKey, attachment);

    return HttpResponse.json(attachment, { status: 201 });
  }),
  // ── RepairRequest / M3 (issue #113) ─────────────────────────────────────
  http.get("*/api/repair-requests", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const query = {
      status: repairRequestStatusSchema.safeParse(params.get("status")).data,
      damageType: repairDamageTypeSchema.safeParse(params.get("damageType")).data,
      severity: repairSeveritySchema.safeParse(params.get("severity")).data,
      detectedInId: params.get("detectedInId") ?? undefined,
      page: params.has("page") ? Number(params.get("page")) : undefined,
      pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
    };
    return HttpResponse.json(paginateRepairRequestFixtures(filterRepairRequestFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/repair-requests/:requestId", ({ params }) => {
    const request = getRepairRequestFixture(params.requestId as string);
    return request
      ? HttpResponse.json(request)
      : HttpResponse.json({ statusCode: 404, message: "Derivación no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}` }, { status: 404 });
  }),
  http.post("*/api/repair-requests", async ({ request }) => {
    let body: unknown;
    try { body = await request.json(); } catch { return HttpResponse.json({ statusCode: 400, message: "JSON inválido", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 400 }); }
    const parsed = createRepairRequestInputSchema.safeParse(body);
    if (!parsed.success || parsed.data.detectedInType !== "SERVICE") return HttpResponse.json({ statusCode: 400, message: "La derivación debe originarse en un Servicio.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 400 });
    const service = serviceFixtures.find((item) => item.id === parsed.data.detectedInId);
    if (!service) return HttpResponse.json({ statusCode: 404, message: "Servicio no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 404 });
    const created = createRepairRequestFixture(parsed.data, service);
    addRepairRequestFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post("*/api/repair-requests/:requestId/start", async ({ params, request }) => {
    const current = getRepairRequestFixture(params.requestId as string);
    if (!current) return HttpResponse.json({ statusCode: 404, message: "Derivación no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/start` }, { status: 404 });
    const parsed = repairRequestRecoveryInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de recuperación inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/start` }, { status: 400 });
    if (current.status !== "REQUESTED") return HttpResponse.json({ statusCode: 409, message: "La derivación no está pendiente.", error: "Conflict", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/start` }, { status: 409 });
    return HttpResponse.json(transitionRepairRequestFixture(params.requestId as string, "IN_PROGRESS", parsed.data));
  }),
  http.post("*/api/repair-requests/:requestId/close", async ({ params, request }) => {
    const current = getRepairRequestFixture(params.requestId as string);
    if (!current) return HttpResponse.json({ statusCode: 404, message: "Derivación no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/close` }, { status: 404 });
    const parsed = repairRequestRecoveryInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de recuperación inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/close` }, { status: 400 });
    if (current.status !== "IN_PROGRESS") return HttpResponse.json({ statusCode: 409, message: "La derivación no está en curso.", error: "Conflict", timestamp: new Date().toISOString(), path: `/api/repair-requests/${params.requestId}/close` }, { status: 409 });
    return HttpResponse.json(transitionRepairRequestFixture(params.requestId as string, "CLOSED", parsed.data));
  }),
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
