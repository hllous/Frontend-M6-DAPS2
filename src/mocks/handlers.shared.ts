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
import { assignCrewInputSchema, cancelServiceInputSchema, completeServiceInputSchema, confirmRescheduleInputSchema, createServiceInputSchema, NOT_SERVICED_REASON_LABEL, recordZoneResultInputSchema, rescheduleServiceInputSchema, ROUTE_CATALOG, SERVICE_TYPE_CATALOG, suspendServiceInputSchema, type Service, type ServiceMode, type ServiceOrigin, type ServiceQuery, type ServiceStatus, type ZoneResult } from "@/lib/services";
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
import { greenSpaceTypeSchema, type GreenSpaceQuery } from "@/lib/green-spaces";
import { addGreenPointFixture, filterGreenPointFixtures, greenPointFixtures, paginateGreenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { wasteTypeSchema, type GreenPointQuery } from "@/lib/green-points";
import { addTreeFixture, filterTreeFixtures, paginateTreeFixtures, treeFixtures, updateTreeFixture } from "@/lib/tree-fixtures";
import { addTreeSurveyFixture, createTreeSurveyFixture, filterTreeSurveyFixtures, getTreeSurveyFixture, paginateTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { treeHealthStatusSchema, treeSurveyCreateInputSchema, riskLevelSchema } from "@/lib/tree-surveys";
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
  // --- Green Point catalog (#124) ---
  // --- Tree catalog (#126) ---
  // --- Tree surveys (#127) ---
  // --- Tree interventions (#128) ---
  // ── RepairRequest / M3 (issue #113) ─────────────────────────────────────
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
