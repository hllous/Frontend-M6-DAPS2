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
  completeServiceInputSchema,
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
import { addGreenPointFixture, filterGreenPointFixtures, greenPointFixtures, paginateGreenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { greenPointCreateInputSchema, greenPointUpdateInputSchema, wasteTypeSchema, type GreenPointQuery } from "@/lib/green-points";
import { complianceIndicatorFixture, coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "@/lib/indicator-fixtures";
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
  referralFromRepairRequest,
  referralFromStreetClosureRequest,
} from "@/lib/referrals";
import { repairRequestFixtures } from "@/lib/repair-request-fixtures";
import { streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import {
  addAttachmentToInspection,
  addEnvironmentalInspectionFixture,
  addEnvironmentalReportFixture,
  createEnvironmentalInspectionFixture,
  createEnvironmentalReportFixture,
  filterEnvironmentalReportFixtures,
  getEnvironmentalInspectionFixture,
  getInspectionAttachments,
  getEnvironmentalReportFixture,
  getSanctionOutcomeIntegrationExceptions,
  getViolationNoticeFixture,
  listEnvironmentalInspectionFixtures,
  paginateEnvironmentalReportFixtures,
  addViolationNoticeFixture,
  createViolationNoticeFixture,
  updateEnvironmentalInspectionFixture,
  transitionEnvironmentalReportFixture,
} from "@/lib/environmental-report-fixtures";
import {
  createEnvironmentalReportInputSchema,
  environmentalInspectionCompleteInputSchema,
  environmentalInspectionScheduleInputSchema,
  issueViolationNoticeInputSchema,
  environmentalReportPrioritySchema,
  environmentalReportStatusSchema,
  environmentalReportTypeSchema,
  type EnvironmentalReportStatus,
} from "@/lib/environmental-reports";

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

function environmentalReportTransitionResponse(
  id: string,
  expected: EnvironmentalReportStatus | EnvironmentalReportStatus[],
  next: EnvironmentalReportStatus,
) {
  const report = getEnvironmentalReportFixture(id);
  if (!report) return HttpResponse.json({ statusCode: 404, message: "Expediente ambiental no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${id}` }, { status: 404 });
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];
  if (!expectedStatuses.includes(report.status)) return HttpResponse.json({ statusCode: 409, message: `La transición no es válida para el estado actual: ${report.status}.`, error: "Conflict", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${id}` }, { status: 409 });
  return HttpResponse.json(transitionEnvironmentalReportFixture(id, next));
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
  http.get("*/api/referrals", () => HttpResponse.json({
    data: [
      ...repairRequestFixtures.map(referralFromRepairRequest),
      ...streetClosureRequestFixtures.map(referralFromStreetClosureRequest),
    ],
    meta: { total: repairRequestFixtures.length + streetClosureRequestFixtures.length },
  })),
  // ── EnvironmentalReport case file (#132) ─────────────────────────────────
  http.get("*/api/environmental-reports", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const query = {
      status: environmentalReportStatusSchema.safeParse(params.get("status")).data,
      reportType: environmentalReportTypeSchema.safeParse(params.get("reportType")).data,
      priority: environmentalReportPrioritySchema.safeParse(params.get("priority")).data,
      ticketId: params.get("ticketId") ?? undefined,
      search: params.get("search") ?? undefined,
      page: params.has("page") ? Number(params.get("page")) : undefined,
      pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
    };
    const page = paginateEnvironmentalReportFixtures(filterEnvironmentalReportFixtures(query), query.page, query.pageSize);
    return HttpResponse.json({ ...page, sanctionOutcomeIntegrationExceptions: getSanctionOutcomeIntegrationExceptions() });
  }),
  http.get("*/api/environmental-reports/:reportId", ({ params }) => {
    const report = getEnvironmentalReportFixture(params.reportId as string);
    return report ? HttpResponse.json(report) : HttpResponse.json({ statusCode: 404, message: "Expediente ambiental no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${params.reportId}` }, { status: 404 });
  }),
  http.post("*/api/environmental-reports", async ({ request }) => {
    const parsed = createEnvironmentalReportInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: "/api/environmental-reports" }, { status: 400 });
    const created = createEnvironmentalReportFixture(parsed.data, "crew-b");
    addEnvironmentalReportFixture(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get("*/api/environmental-reports/:reportId/inspections", ({ params }) => {
    const report = getEnvironmentalReportFixture(params.reportId as string);
    if (!report) return HttpResponse.json({ statusCode: 404, message: "Expediente ambiental no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${params.reportId}/inspections` }, { status: 404 });
    return HttpResponse.json(listEnvironmentalInspectionFixtures(params.reportId as string));
  }),
  http.post("*/api/environmental-reports/:reportId/inspections", async ({ params, request }) => {
    const reportId = params.reportId as string;
    const report = getEnvironmentalReportFixture(reportId);
    if (!report) return HttpResponse.json({ statusCode: 404, message: "Expediente ambiental no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${reportId}/inspections` }, { status: 404 });
    const parsed = environmentalInspectionScheduleInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${reportId}/inspections` }, { status: 400 });

    const active = listEnvironmentalInspectionFixtures(reportId).find((inspection) => !inspection.outcome);
    if (active && report.status === "INSPECTION_SCHEDULED") {
      return HttpResponse.json(updateEnvironmentalInspectionFixture(active.id, {
        scheduledDate: parsed.data.scheduledDate,
        timeWindow: parsed.data.timeWindow,
        checklistVersion: parsed.data.checklistVersion,
        checklist: parsed.data.checklist,
        notes: parsed.data.notes ?? null,
      }));
    }
    const isFirstSchedule = report.status === "UNDER_REVIEW";
    const isReinspection = report.status === "INSPECTED" && listEnvironmentalInspectionFixtures(reportId).some((inspection) => inspection.outcome === "INCONCLUSIVE");
    if (!isFirstSchedule && !isReinspection) return HttpResponse.json({ statusCode: 409, message: `Solo se puede programar una inspección desde el estado actual: ${report.status}.`, error: "Conflict", timestamp: new Date().toISOString(), path: `/api/environmental-reports/${reportId}/inspections` }, { status: 409 });
    const created = createEnvironmentalInspectionFixture(reportId, parsed.data);
    addEnvironmentalInspectionFixture(created);
    transitionEnvironmentalReportFixture(reportId, "INSPECTION_SCHEDULED");
    return HttpResponse.json(created, { status: 201 });
  }),
  // ── EnvironmentalInspection execution / M6 issue #134 ────────────────────
  http.get("*/api/environmental-inspections/:inspectionId", ({ params }) => {
    const inspection = getEnvironmentalInspectionFixture(params.inspectionId as string);
    return inspection
      ? HttpResponse.json(inspection)
      : HttpResponse.json({ statusCode: 404, message: "Inspección no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${params.inspectionId}` }, { status: 404 });
  }),
  http.post("*/api/environmental-inspections/:inspectionId/complete", async ({ params, request }) => {
    const inspectionId = params.inspectionId as string;
    const inspection = getEnvironmentalInspectionFixture(inspectionId);
    if (!inspection) return HttpResponse.json({ statusCode: 404, message: "Inspección no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${inspectionId}/complete` }, { status: 404 });
    const parsed = environmentalInspectionCompleteInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${inspectionId}/complete` }, { status: 400 });
    if (parsed.data.outcome !== "NO_VIOLATION" && !(inspection.attachments?.length ?? 0)) return HttpResponse.json({ statusCode: 400, message: "Debe adjuntar al menos una evidencia para este resultado.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${inspectionId}/complete` }, { status: 400 });
    const nextStep = parsed.data.outcome === "NO_VIOLATION" ? "CASE_CLOSED" : parsed.data.outcome === "VIOLATION_FOUND" ? "NOTICE_TO_BE_ISSUED" : "REINSPECTION";
    const expectedChecklistIds = new Set(inspection.checklist.map((item) => item.id));
    if (parsed.data.checklist.length !== expectedChecklistIds.size || parsed.data.checklist.some((item) => !expectedChecklistIds.has(item.id))) return HttpResponse.json({ statusCode: 400, message: "El checklist enviado no coincide con el checklist asignado.", error: "Bad Request", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${inspectionId}/complete` }, { status: 400 });
    const updated = updateEnvironmentalInspectionFixture(inspectionId, {
      inspectedAt: new Date().toISOString(),
      outcome: parsed.data.outcome,
      nextStep,
      findings: parsed.data.findings ?? null,
      violationType: parsed.data.violationType ?? null,
      severity: parsed.data.severity ?? null,
      suggestedAction: parsed.data.suggestedAction ?? null,
      notes: parsed.data.conclusion ?? inspection.notes,
    });
    if (updated?.serviceId) updateServiceFixture(updated.serviceId, { status: "COMPLETED" });
    transitionEnvironmentalReportFixture(inspection.reportId, parsed.data.outcome === "NO_VIOLATION" ? "NO_VIOLATION" : parsed.data.outcome === "VIOLATION_FOUND" ? "VIOLATION_FOUND" : "INSPECTED");
    return HttpResponse.json(updated);
  }),
  // ── ViolationNotice issuance / M6 issue #135 ─────────────────────────────
  http.get("*/api/environmental-inspections/:inspectionId/violation-notice", ({ params }) => {
    const notice = getViolationNoticeFixture(params.inspectionId as string);
    return notice
      ? HttpResponse.json(notice)
      : HttpResponse.json({ statusCode: 404, message: "La inspección no tiene un acta emitida.", error: "Not Found", timestamp: new Date().toISOString(), path: `/api/environmental-inspections/${params.inspectionId}/violation-notice` }, { status: 404 });
  }),
  http.post("*/api/environmental-inspections/:inspectionId/violation-notice", async ({ params, request }) => {
    const inspectionId = params.inspectionId as string;
    const path = `/api/environmental-inspections/${inspectionId}/violation-notice`;
    const inspection = getEnvironmentalInspectionFixture(inspectionId);
    if (!inspection) return HttpResponse.json({ statusCode: 404, message: "Inspección no encontrada.", error: "Not Found", timestamp: new Date().toISOString(), path }, { status: 404 });
    const parsed = issueViolationNoticeInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return HttpResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message).join(" "), error: "Bad Request", timestamp: new Date().toISOString(), path }, { status: 400 });
    if (inspection.outcome !== "VIOLATION_FOUND") return HttpResponse.json({ statusCode: 409, message: "Solo se puede emitir un acta sobre una inspección completada con infracción constatada.", error: "Conflict", timestamp: new Date().toISOString(), path }, { status: 409 });
    if (!(inspection.attachments?.length ?? 0)) return HttpResponse.json({ statusCode: 400, message: "Debe adjuntar al menos una evidencia a la inspección antes de emitir el acta.", error: "Bad Request", timestamp: new Date().toISOString(), path }, { status: 400 });
    if (getViolationNoticeFixture(inspectionId)) return HttpResponse.json({ statusCode: 409, message: "La inspección ya tiene un acta emitida. Las correcciones requieren una nueva inspección.", error: "Conflict", timestamp: new Date().toISOString(), path }, { status: 409 });
    if (!getEnvironmentalReportFixture(inspection.reportId)) return HttpResponse.json({ statusCode: 404, message: "Expediente ambiental no encontrado.", error: "Not Found", timestamp: new Date().toISOString(), path }, { status: 404 });

    const notice = createViolationNoticeFixture(inspectionId, parsed.data);
    addViolationNoticeFixture(notice);
    transitionEnvironmentalReportFixture(inspection.reportId, notice.establishmentId ? "NOTICE_ISSUED" : "CLOSED");
    return HttpResponse.json(notice, { status: 201 });
  }),
  http.post("*/api/environmental-reports/:reportId/start-review", ({ params }) => environmentalReportTransitionResponse(params.reportId as string, "RECEIVED", "UNDER_REVIEW")),
  http.post("*/api/environmental-reports/:reportId/forward", ({ params }) => environmentalReportTransitionResponse(params.reportId as string, "UNDER_REVIEW", "FORWARDED")),
  http.post("*/api/environmental-reports/:reportId/dismiss", ({ params }) => environmentalReportTransitionResponse(params.reportId as string, "UNDER_REVIEW", "DISMISSED")),
  http.post("*/api/environmental-reports/:reportId/close", ({ params }) => environmentalReportTransitionResponse(params.reportId as string, ["FORWARDED", "DISMISSED", "NO_VIOLATION", "SANCTIONED"], "CLOSED")),
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
    const created = { id: `tree-${Date.now()}`, ...parsed.data, address: parsed.data.address ?? null, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null, active: parsed.data.active ?? true };
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
      inspectionId: input.origin === "INSPECTION" ? (input.inspectionId ?? null) : null,
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
    if (input.origin === "INSPECTION" && input.inspectionId) {
      updateEnvironmentalInspectionFixture(input.inspectionId, { serviceId: newService.id });
    }
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
  // #125 — a completed Container-targeted Service owns the Container transition.
  http.post("*/api/services/:serviceId/complete", async ({ params, request }) => {
    let body: unknown = {};
    try {
      const rawBody = await request.text();
      if (rawBody.trim()) body = JSON.parse(rawBody);
    } catch {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: "El cuerpo de la solicitud debe ser un JSON válido.",
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/complete`,
        },
        { status: 400 },
      );
    }

    const parsedInput = completeServiceInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: parsedInput.error.issues.map((issue) => issue.message).join(" "),
          error: "Bad Request",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/complete`,
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

    if (computedStatus === "COMPLETED" && service.mode === "POINT" && service.targetType === "CONTAINER") {
      const container =
        (service.targetId ? getContainerFixture(service.targetId) : null) ??
        (service.targetRef
          ? containerFixtures.find((candidate) => candidate.code === service.targetRef) ?? null
          : null);

      if (container?.status === "RELOCATING" && !parsedInput.data.containerLocation) {
        return HttpResponse.json(
          {
            statusCode: 400,
            message: "La nueva ubicación del contenedor es obligatoria para completar la reubicación.",
            error: "Bad Request",
            timestamp: new Date().toISOString(),
            path: `/api/services/${params.serviceId}/complete`,
          },
          { status: 400 },
        );
      }

      if (container?.status === "OVERFLOWED") emptyContainerFixture(container.id);
      if (container?.status === "UNDER_REPAIR") completeRepairFixture(container.id);
      if (container?.status === "RELOCATING" && parsedInput.data.containerLocation) {
        confirmRelocationFixture(container.id, parsedInput.data.containerLocation);
      }
    }

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
  // ── Indicators / #138 ─────────────────────────────────────────────────────
  http.get("*/api/indicators/coverage", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const zoneId = params.get("zoneId");
    const serviceTypeId = params.get("serviceTypeId");
    return HttpResponse.json({
      ...coverageIndicatorFixture,
      period: { from: params.get("from") ?? coverageIndicatorFixture.period.from, to: params.get("to") ?? coverageIndicatorFixture.period.to },
      byZone: zoneId ? coverageIndicatorFixture.byZone.filter((item) => item.id === zoneId) : coverageIndicatorFixture.byZone,
      byServiceType: serviceTypeId ? coverageIndicatorFixture.byServiceType.filter((item) => item.id === serviceTypeId) : coverageIndicatorFixture.byServiceType,
    });
  }),
  http.get("*/api/indicators/compliance", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const zoneId = params.get("zoneId");
    return HttpResponse.json({
      ...complianceIndicatorFixture,
      period: { from: params.get("from") ?? complianceIndicatorFixture.period.from, to: params.get("to") ?? complianceIndicatorFixture.period.to },
      unattendedZones: zoneId ? complianceIndicatorFixture.unattendedZones.filter((item) => item.id === zoneId) : complianceIndicatorFixture.unattendedZones,
    });
  }),
  http.get("*/api/indicators/incidents", ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json({ ...incidentsIndicatorFixture, period: { from: params.get("from") ?? incidentsIndicatorFixture.period.from, to: params.get("to") ?? incidentsIndicatorFixture.period.to } });
  }),
  http.get("*/api/indicators/waste", ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json({ ...wasteIndicatorFixture, period: { from: params.get("from") ?? wasteIndicatorFixture.period.from, to: params.get("to") ?? wasteIndicatorFixture.period.to } });
  }),
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
