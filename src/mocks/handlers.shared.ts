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
    const source = parsed.data.sourceType === "SERVICE"
      ? serviceFixtures.find((candidate) => candidate.id === parsed.data.sourceId)
      : getTreeInterventionFixture(parsed.data.sourceId);
    if (!source) {
      return HttpResponse.json(
        { statusCode: 404, message: parsed.data.sourceType === "SERVICE" ? "Servicio de origen no encontrado." : "Intervención de arbolado de origen no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/street-closure-requests" },
        { status: 404 },
      );
    }
    if (parsed.data.sourceType === "TREE_INTERVENTION" && source.status !== "AUTHORIZED") {
      return HttpResponse.json(
        { statusCode: 409, message: "Solo se puede solicitar un corte de calle desde una intervención de arbolado autorizada.", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/street-closure-requests" },
        { status: 409 },
      );
    }
    const created = createStreetClosureRequestFixture(parsed.data, source);
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

    if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: `El archivo supera el tamaño máximo permitido de ${EVIDENCE_FILE_SIZE_LABEL}.`,
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
    // #134: evidence belongs to an existing inspection and is uploaded one file at a time.
    if (parsedOwnerType.data === "INSPECTION") {
      if (!getEnvironmentalInspectionFixture(ownerId)) {
        return HttpResponse.json({ statusCode: 404, message: `La inspección ${ownerId} no existe.`, error: "Not Found", timestamp: new Date().toISOString(), path: "/api/evidence" }, { status: 404 });
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
    if (parsedOwnerType.data === "CONTAINER") {
      addAttachmentToContainer(ownerId, attachment);
    }
    if (parsedOwnerType.data === "INSPECTION") {
      addAttachmentToInspection(ownerId, attachment);
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
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: "Datos de derivación inválidos.", error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 400 });
    // ── Issue #137: EnvironmentalInspection repair-request source ──
    const service = parsed.data.detectedInType === "SERVICE"
      ? serviceFixtures.find((item) => item.id === parsed.data.detectedInId)
      : undefined;
    const inspection = parsed.data.detectedInType === "INSPECTION"
      ? getEnvironmentalInspectionFixture(parsed.data.detectedInId)
      : undefined;
    if (parsed.data.detectedInType === "SERVICE" && !service) return HttpResponse.json({ statusCode: 404, message: "Servicio no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 404 });
    if (parsed.data.detectedInType === "INSPECTION" && !inspection) return HttpResponse.json({ statusCode: 404, message: "Inspección no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/repair-requests" }, { status: 404 });
    const created = createRepairRequestFixture(parsed.data, service);
    addRepairRequestFixture(created);
    // ── End issue #137 ──
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
  http.get("*/api/evidence", ({ request }) => {
    const url = new URL(request.url);
    const ownerType = url.searchParams.get("ownerType");
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerType || !ownerId) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "Los parámetros ownerType y ownerId son obligatorios.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: "/api/evidence",
        },
        { status: 400 },
      );
    }
    if (ownerType === "CONTAINER") {
      return HttpResponse.json(getContainerAttachments(ownerId));
    }
    // Zone-result evidence (#316), using the result ID rather than the zone ID.
    if (ownerType === "ZONE_RESULT") {
      const result = zoneResultFixtures.find((item) => item.id === ownerId);
      if (!result) {
        return HttpResponse.json(
          { statusCode: 404, message: "Resultado de zona no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/evidence" },
          { status: 404 },
        );
      }
      return HttpResponse.json(result.attachments);
    }
    if (ownerType === "INSPECTION") {
      const attachments = getInspectionAttachments(ownerId);
      if (!attachments) {
        return HttpResponse.json(
          { statusCode: 404, message: "Inspección no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: "/api/evidence" },
          { status: 404 },
        );
      }
      return HttpResponse.json(attachments);
    }
    return HttpResponse.json([]);
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
