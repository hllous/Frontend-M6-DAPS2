import { EVIDENCE_FILE_SIZE_LABEL, MAX_EVIDENCE_FILE_SIZE_BYTES } from "@/lib/evidence-limits";
import { HttpResponse, http } from "msw";

import { getScenario, scenarios, type ScenarioId } from "@/lib/scenarios";
import {
  addAttachmentToService,
  addAttachmentToZoneResult,
  addServiceFixture,
  assignCrewFixture,
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
  completeServiceInputSchema,
  confirmRescheduleInputSchema,
  createServiceInputSchema,
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
} from "@/lib/services";
import { zoneFixtures } from "@/lib/zones-fixtures";
import { addDisposalSiteFixture, disposalSiteFixtures, filterDisposalSiteFixtures, paginateDisposalSiteFixtures, updateDisposalSiteFixture } from "@/lib/disposal-site-fixtures";
import { disposalSiteCreateInputSchema, disposalSiteTypeSchema, disposalSiteUpdateInputSchema, type DisposalSiteQuery } from "@/lib/disposal-sites";
import { serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { serviceFrequencyResponseFixture, addServiceFrequencyFixture, closeServiceFrequencyFixture, filterServiceFrequencyFixtures, paginateServiceFrequencyFixtures, serviceFrequencyFixtures, updateServiceFrequencyFixture } from "@/lib/service-frequency-fixtures";
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
import { addGreenPointFixture, filterGreenPointFixtures, greenPointFixtures, paginateGreenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { greenPointCreateInputSchema, greenPointUpdateInputSchema, wasteTypeSchema, type GreenPointQuery } from "@/lib/green-points";
import { addTreeFixture, filterTreeFixtures, paginateTreeFixtures, treeFixtures, updateTreeFixture } from "@/lib/tree-fixtures";
import { treeCreateInputSchema, treeUpdateInputSchema, type TreeQuery } from "@/lib/trees";
import { addTreeSurveyFixture, createTreeSurveyFixture, filterTreeSurveyFixtures, getTreeSurveyFixture, paginateTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { treeHealthStatusSchema, treeSurveyCreateInputSchema, riskLevelSchema } from "@/lib/tree-surveys";
import { addTreeInterventionFixture, createTreeInterventionFixture, filterTreeInterventionFixtures, getTreeInterventionFixture, paginateTreeInterventionFixtures, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { treeInterventionAssignServiceInputSchema, treeInterventionAuthorizeInputSchema, treeInterventionCreateInputSchema, treeInterventionStatusSchema, treeInterventionTypeSchema } from "@/lib/tree-interventions";
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
  addAttachmentToContainer,
  addContainerFixture,
  completeRepairFixture,
  filterContainerFixtures,
  containerFixtures,
  getContainerAttachments,
  getContainerFixture,
  paginateContainerFixtures,
  reportDamageFixture,
  reportOverflowFixture,
  removeContainerFixture,
  startRepairFixture,
  updateContainerFixture,
  emptyContainerFixture,
  startRelocationFixture,
  confirmRelocationFixture,
} from "@/lib/containers-fixtures";
import {
  createContainerInputSchema,
  reportDamageInputSchema,
  updateContainerInputSchema,
  confirmRelocationInputSchema,
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
import {
  addAttachmentToInspection,
  getEnvironmentalInspectionFixture,
  getInspectionAttachments,
  updateEnvironmentalInspectionFixture,
} from "@/lib/environmental-report-fixtures";

const scenarioIds = new Set(Object.values(scenarios).map((scenario) => scenario.id));

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

function greenPointQueryFromUrl(url: string): GreenPointQuery {
  const params = new URL(url).searchParams;
  const wasteType = wasteTypeSchema.safeParse(params.get("wasteType"));
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    zoneId: params.get("zoneId") ?? undefined,
    wasteType: wasteType.success ? wasteType.data : undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  };
}

function treeQueryFromUrl(url: string): TreeQuery {
  const params = new URL(url).searchParams;
  return {
    active: params.has("active") ? params.get("active") === "true" : undefined,
    zoneId: params.get("zoneId") ?? undefined,
    search: params.get("search") ?? undefined,
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
  http.get("*/api/disposal-sites", ({ request }) => { const query = disposalSiteQueryFromUrl(request.url); return HttpResponse.json(paginateDisposalSiteFixtures(filterDisposalSiteFixtures(query), query.page, query.pageSize)); }),
  http.get("*/api/disposal-sites/:disposalSiteId", ({ params }) => { const item = disposalSiteFixtures.find((candidate) => candidate.id === params.disposalSiteId); return item ? HttpResponse.json(item) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.post("*/api/disposal-sites", async ({ request }) => { const parsed = disposalSiteCreateInputSchema.safeParse(await request.json()); if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 400 }); const created = { id: `ds-${Date.now()}`, ...parsed.data, active: true }; addDisposalSiteFixture(created); return HttpResponse.json(created, { status: 201 }); }),
  http.patch("*/api/disposal-sites/:disposalSiteId", async ({ params, request }) => { const parsed = disposalSiteUpdateInputSchema.safeParse(await request.json()); if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 400 }); const updated = updateDisposalSiteFixture(params.disposalSiteId as string, parsed.data); return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.delete("*/api/disposal-sites/:disposalSiteId", ({ params }) => { const updated = updateDisposalSiteFixture(params.disposalSiteId as string, { active: false }); return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/disposal-sites" }, { status: 404 }); }),
  http.get("*/api/service-frequencies", ({ request }) => {
    const query = serviceFrequencyQueryFromUrl(request.url);
    return HttpResponse.json(paginateServiceFrequencyFixtures(filterServiceFrequencyFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/service-frequencies/:serviceFrequencyId", ({ params }) => {
    const item = serviceFrequencyFixtures.find((candidate) => candidate.id === params.serviceFrequencyId);
    return item ? HttpResponse.json(serviceFrequencyResponseFixture(item)) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
  }),
  http.post("*/api/service-frequencies", async ({ request }) => {
    const parsed = serviceFrequencyCreateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const serviceType = serviceTypeFixtures.find((item) => item.id === parsed.data.serviceTypeId);
    if (!serviceType || serviceType.mode !== "ROUTE") return HttpResponse.json({ statusCode: 400, message: "El tipo de servicio debe ser de modo ROUTE.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const created = { id: `freq-${Date.now()}`, ...parsed.data, validTo: parsed.data.validTo ?? null };
    addServiceFrequencyFixture(created);
    return HttpResponse.json(serviceFrequencyResponseFixture(created), { status: 201 });
  }),
  http.patch("*/api/service-frequencies/:serviceFrequencyId", async ({ params, request }) => {
    const parsed = serviceFrequencyUpdateInputSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos inválidos", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 400 });
    const updated = updateServiceFrequencyFixture(params.serviceFrequencyId as string, parsed.data);
    return updated ? HttpResponse.json(serviceFrequencyResponseFixture(updated)) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
  }),
  http.delete("*/api/service-frequencies/:serviceFrequencyId", ({ params }) => {
    const updated = closeServiceFrequencyFixture(params.serviceFrequencyId as string, "2026-09-06");
    return updated ? HttpResponse.json(serviceFrequencyResponseFixture(updated)) : HttpResponse.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 404 });
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
    const greenSpace = {
      id: `green-space-108-${greenSpaceFixtures.length + 1}`,
      ...parsed.data,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      active: true,
    };
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
  // --- Green Point catalog (#124) ---
  http.get("*/api/green-points", ({ request }) => { const query = greenPointQueryFromUrl(request.url); return HttpResponse.json(paginateGreenPointFixtures(filterGreenPointFixtures(query), query.page, query.pageSize)); }),
  http.get("*/api/green-points/:greenPointId", ({ params }) => {
    const point = greenPointFixtures.find((item) => item.id === params.greenPointId);
    return point ? HttpResponse.json(point) : HttpResponse.json({ statusCode: 404, message: "Punto verde no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/green-points/${params.greenPointId}` }, { status: 404 });
  }),
  http.post("*/api/green-points", async ({ request }) => {
    const parsed = greenPointCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de punto verde inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/green-points" }, { status: 400 });
    const created = { id: `green-point-${Date.now()}`, ...parsed.data, address: parsed.data.address ?? null, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null, active: parsed.data.active ?? true };
    addGreenPointFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/green-points/:greenPointId", async ({ params, request }) => {
    const parsed = greenPointUpdateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos editables de punto verde inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/green-points" }, { status: 400 });
    const updated = updateGreenPointFixture(params.greenPointId as string, parsed.data);
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "Punto verde no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/green-points" }, { status: 404 });
  }),
  http.delete("*/api/green-points/:greenPointId", ({ params }) => {
    const updated = updateGreenPointFixture(params.greenPointId as string, { active: false });
    return updated ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ statusCode: 404, message: "Punto verde no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/green-points" }, { status: 404 });
  }),
  // --- Tree catalog (#126) ---
  http.get("*/api/trees", ({ request }) => { const query = treeQueryFromUrl(request.url); return HttpResponse.json(paginateTreeFixtures(filterTreeFixtures(query), query.page, query.pageSize)); }),
  http.get("*/api/trees/:treeId", ({ params }) => {
    const tree = treeFixtures.find((item) => item.id === params.treeId);
    return tree ? HttpResponse.json(tree) : HttpResponse.json({ statusCode: 404, message: "Árbol no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/trees/${params.treeId}` }, { status: 404 });
  }),
  http.post("*/api/trees", async ({ request }) => {
    const parsed = treeCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de árbol inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/trees" }, { status: 400 });
    if (treeFixtures.some((item) => item.surveyCode.toLowerCase() === parsed.data.surveyCode.toLowerCase())) return HttpResponse.json({ statusCode: 409, message: "Ya existe un árbol con ese código de relevamiento.", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/trees" }, { status: 409 });
    const created = { id: `tree-${Date.now()}`, ...parsed.data, address: parsed.data.address ?? null, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null, active: parsed.data.active ?? true, lastSurvey: null };
    addTreeFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/trees/:treeId", async ({ params, request }) => {
    const parsed = treeUpdateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos editables de árbol inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/trees" }, { status: 400 });
    const updated = updateTreeFixture(params.treeId as string, parsed.data);
    return updated ? HttpResponse.json(updated) : HttpResponse.json({ statusCode: 404, message: "Árbol no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/trees" }, { status: 404 });
  }),
  http.delete("*/api/trees/:treeId", ({ params }) => {
    const updated = updateTreeFixture(params.treeId as string, { active: false });
    return updated ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ statusCode: 404, message: "Árbol no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/trees" }, { status: 404 });
  }),
  // --- Tree surveys (#127) ---
  http.get("*/api/trees/:treeId/surveys", ({ request, params }) => {
    const url = new URL(request.url);
    const query = { healthStatus: treeHealthStatusSchema.safeParse(url.searchParams.get("healthStatus")).data, riskLevel: riskLevelSchema.safeParse(url.searchParams.get("riskLevel")).data, page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined, pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined };
    return HttpResponse.json(paginateTreeSurveyFixtures(filterTreeSurveyFixtures(params.treeId as string, query), query.page, query.pageSize));
  }),
  http.get("*/api/trees/:treeId/surveys/:surveyId", ({ params }) => {
    const survey = getTreeSurveyFixture(params.treeId as string, params.surveyId as string);
    return survey ? HttpResponse.json(survey) : HttpResponse.json({ statusCode: 404, message: "Relevamiento no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/trees/${params.treeId}/surveys/${params.surveyId}` }, { status: 404 });
  }),
  http.post("*/api/trees/:treeId/surveys", async ({ request, params }) => {
    const parsed = treeSurveyCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/trees/${params.treeId}/surveys` }, { status: 400 });
    const created = createTreeSurveyFixture(params.treeId as string, parsed.data, "field-user-1");
    addTreeSurveyFixture(created);
    updateTreeFixture(params.treeId as string, {
      lastSurvey: {
        surveyedAt: created.surveyedAt,
        healthStatus: created.healthStatus,
        riskLevel: created.riskLevel,
        riskType: created.riskType,
        suggestedIntervention: created.suggestedIntervention,
      },
    });
    return HttpResponse.json(created, { status: 201 });
  }),
  // --- Tree interventions (#128) ---
  http.get("*/api/tree-interventions", ({ request }) => {
    const url = new URL(request.url);
    const query = {
      interventionType: treeInterventionTypeSchema.safeParse(url.searchParams.get("interventionType")).data,
      status: treeInterventionStatusSchema.safeParse(url.searchParams.get("status")).data,
      page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
      pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
    };
    return HttpResponse.json(paginateTreeInterventionFixtures(filterTreeInterventionFixtures(query), query.page, query.pageSize));
  }),
  http.get("*/api/tree-interventions/:interventionId", ({ params }) => {
    const intervention = getTreeInterventionFixture(params.interventionId as string);
    return intervention ? HttpResponse.json(intervention) : HttpResponse.json({ statusCode: 404, message: "Intervención de arbolado no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}` }, { status: 404 });
  }),
  http.post("*/api/tree-interventions", async ({ request }) => {
    const parsed = treeInterventionCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/tree-interventions" }, { status: 400 });
    const created = createTreeInterventionFixture(parsed.data);
    addTreeInterventionFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post("*/api/tree-interventions/:interventionId/submit-for-authorization", ({ params }) => {
    const intervention = getTreeInterventionFixture(params.interventionId as string);
    if (!intervention) return HttpResponse.json({ statusCode: 404, message: "Intervención de arbolado no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/submit-for-authorization` }, { status: 404 });
    if (intervention.interventionType !== "REMOVAL") return HttpResponse.json({ statusCode: 400, message: "Solo las extracciones requieren el envío a autorización.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/submit-for-authorization` }, { status: 400 });
    if (intervention.status !== "REQUESTED") return HttpResponse.json({ statusCode: 409, message: "Solo se puede enviar a autorización una extracción solicitada.", error: "Conflict", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/submit-for-authorization` }, { status: 409 });
    return HttpResponse.json(updateTreeInterventionFixture(params.interventionId as string, { status: "PENDING_AUTHORIZATION" }));
  }),
  http.post("*/api/tree-interventions/:interventionId/authorize", async ({ params, request }) => {
    const parsed = treeInterventionAuthorizeInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/authorize` }, { status: 400 });
    const intervention = getTreeInterventionFixture(params.interventionId as string);
    if (!intervention) return HttpResponse.json({ statusCode: 404, message: "Intervención de arbolado no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/authorize` }, { status: 404 });
    const validStatus = intervention.interventionType === "REMOVAL" ? intervention.status === "PENDING_AUTHORIZATION" : intervention.status === "REQUESTED";
    if (!validStatus) return HttpResponse.json({ statusCode: 409, message: "La intervención no se encuentra en un estado autorizable.", error: "Conflict", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/authorize` }, { status: 409 });
    return HttpResponse.json(updateTreeInterventionFixture(params.interventionId as string, { status: "AUTHORIZED", authorizedByUserId: parsed.data.authorizedByUserId, authorizedAt: new Date().toISOString() }));
  }),
  http.post("*/api/tree-interventions/:interventionId/reject", ({ params }) => {
    const intervention = getTreeInterventionFixture(params.interventionId as string);
    if (!intervention) return HttpResponse.json({ statusCode: 404, message: "Intervención de arbolado no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/reject` }, { status: 404 });
    if (intervention.interventionType !== "REMOVAL" || intervention.status !== "PENDING_AUTHORIZATION") return HttpResponse.json({ statusCode: 409, message: "Solo se puede rechazar una extracción pendiente de autorización.", error: "Conflict", timestamp: new Date().toISOString(), path: `/api/tree-interventions/${params.interventionId}/reject` }, { status: 409 });
    return HttpResponse.json(updateTreeInterventionFixture(params.interventionId as string, { status: "REJECTED" }));
  }),
  http.post("*/api/tree-interventions/:interventionId/assign-service", async ({ params, request }) => {
    const interventionId = params.interventionId as string;
    const path = `/api/tree-interventions/${interventionId}/assign-service`;
    const parsed = treeInterventionAssignServiceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path }, { status: 400 });

    const intervention = getTreeInterventionFixture(interventionId);
    if (!intervention) return HttpResponse.json({ statusCode: 404, message: "Intervención de arbolado no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path }, { status: 404 });
    if (intervention.status !== "AUTHORIZED") return HttpResponse.json({ statusCode: 409, message: "Solo se puede asociar un servicio a una intervención autorizada.", error: "Conflict", timestamp: new Date().toISOString(), path }, { status: 409 });
    if (intervention.serviceId) return HttpResponse.json({ statusCode: 409, message: "La intervención ya tiene un servicio asociado.", error: "Conflict", timestamp: new Date().toISOString(), path }, { status: 409 });

    const service = serviceFixtures.find((candidate) => candidate.id === parsed.data.serviceId);
    if (!service) return HttpResponse.json({ statusCode: 404, message: "Servicio no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path }, { status: 404 });
    if (service.mode !== "POINT") return HttpResponse.json({ statusCode: 400, message: "El servicio de una intervención de arbolado debe ser de modo POINT.", error: "Bad Request", timestamp: new Date().toISOString(), path }, { status: 400 });
    return HttpResponse.json(updateTreeInterventionFixture(interventionId, { serviceId: service.id }));
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
  // ── Containers: Overflow and Damage (#121) ────────────────────────────────
  http.post("*/api/containers/:containerId/report-overflow", async ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-overflow`,
        },
        { status: 404 },
      );
    }
    if (container.status !== "ACTIVE") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede reportar desborde en contenedores activos. Estado actual: ${container.status}`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-overflow`,
        },
        { status: 409 },
      );
    }
    const updated = reportOverflowFixture(params.containerId as string);
    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/containers/:containerId/report-damage", async ({ params, request }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-damage`,
        },
        { status: 404 },
      );
    }
    if (container.status !== "ACTIVE") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede reportar daño en contenedores activos. Estado actual: ${container.status}`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-damage`,
        },
        { status: 409 },
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El cuerpo de la solicitud debe ser un JSON válido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-damage`,
        },
        { status: 400 },
      );
    }
    const parsed = reportDamageInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/report-damage`,
        },
        { status: 400 },
      );
    }
    const updated = reportDamageFixture(params.containerId as string, parsed.data);
    return HttpResponse.json(updated, { status: 200 });
  }),
  // ── Containers: Office repair/removal dispatch (#122) ───────────────────
  http.post("*/api/containers/:containerId/start-repair", ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        { statusCode: 404, message: "Contenedor no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/start-repair` },
        { status: 404 },
      );
    }
    if (container.status !== "DAMAGED") {
      return HttpResponse.json(
        { statusCode: 409, message: `Solo se puede iniciar la reparación de contenedores dañados. Estado actual: ${container.status}`, error: "Conflict", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/start-repair` },
        { status: 409 },
      );
    }
    return HttpResponse.json(startRepairFixture(params.containerId as string), { status: 200 });
  }),
  http.post("*/api/containers/:containerId/complete-repair", ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        { statusCode: 404, message: "Contenedor no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/complete-repair` },
        { status: 404 },
      );
    }
    if (container.status !== "UNDER_REPAIR") {
      return HttpResponse.json(
        { statusCode: 409, message: `Solo se puede completar la reparación de contenedores en reparación. Estado actual: ${container.status}`, error: "Conflict", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/complete-repair` },
        { status: 409 },
      );
    }
    return HttpResponse.json(completeRepairFixture(params.containerId as string), { status: 200 });
  }),
  http.post("*/api/containers/:containerId/remove", ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        { statusCode: 404, message: "Contenedor no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/remove` },
        { status: 404 },
      );
    }
    if (container.status !== "DAMAGED") {
      return HttpResponse.json(
        { statusCode: 409, message: `Solo se pueden retirar contenedores dañados. Estado actual: ${container.status}`, error: "Conflict", timestamp: new Date().toISOString(), path: `/api/containers/${params.containerId}/remove` },
        { status: 409 },
      );
    }
    return HttpResponse.json(removeContainerFixture(params.containerId as string), { status: 200 });
  }),
  // ── Containers: Emptying and Relocation (#123) ────────────────────────────
  http.post("*/api/containers/:containerId/empty", async ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/empty`,
        },
        { status: 404 },
      );
    }
    if (container.status !== "OVERFLOWED") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede vaciar un contenedor en estado desbordado. Estado actual: ${container.status}`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/empty`,
        },
        { status: 409 },
      );
    }
    const updated = emptyContainerFixture(params.containerId as string);
    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/containers/:containerId/relocate", async ({ params }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/relocate`,
        },
        { status: 404 },
      );
    }
    if (container.status !== "ACTIVE") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede iniciar la reubicación en contenedores activos. Estado actual: ${container.status}`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/relocate`,
        },
        { status: 409 },
      );
    }
    const updated = startRelocationFixture(params.containerId as string);
    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/containers/:containerId/confirm-relocation", async ({ params, request }) => {
    const container = getContainerFixture(params.containerId as string);
    if (!container) {
      return HttpResponse.json(
        {
          statusCode: 404,
          message: "Contenedor no encontrado.",
          error: "Not Found",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/confirm-relocation`,
        },
        { status: 404 },
      );
    }
    if (container.status !== "RELOCATING") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Solo se puede confirmar la reubicación en contenedores en estado de reubicación. Estado actual: ${container.status}`,
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/confirm-relocation`,
        },
        { status: 409 },
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El cuerpo de la solicitud debe ser un JSON válido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/confirm-relocation`,
        },
        { status: 400 },
      );
    }
    const parsed = confirmRelocationInputSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsed.error.issues.map((i) => i.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/containers/${params.containerId}/confirm-relocation`,
        },
        { status: 400 },
      );
    }
    const updated = confirmRelocationFixture(params.containerId as string, parsed.data);
    return HttpResponse.json(updated, { status: 200 });
  }),
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
