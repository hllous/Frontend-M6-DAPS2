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
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
