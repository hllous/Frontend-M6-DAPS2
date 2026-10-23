import { backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import {
  addRepairRequestFixture,
  createRepairRequestFixture,
  filterRepairRequestFixtures,
  paginateRepairRequestFixtures,
} from "@/lib/repair-request-fixtures";
import {
  createRepairRequestInputSchema,
  repairDamageTypeSchema,
  repairRequestStatusSchema,
  repairSeveritySchema,
  type RepairRequestQuery,
} from "@/lib/repair-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { pageParam, pageSizeParam } from "@/lib/input-limits";





function sessionAndScenario(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session);
  return { session, scenario };
}

function fieldCanAccessService(scenario: ReturnType<typeof getScenario>, serviceId: string) {
  return (
    scenario.actor.kind === "FIELD" &&
    Boolean(scenario.actor.crewId) &&
    serviceFixtures.some(
      (service) => service.id === serviceId && service.crewId === scenario.actor.crewId,
    )
  );
}

function fieldCanAccessInspection(scenario: ReturnType<typeof getScenario>, inspectionId: string) {
  const inspection = getEnvironmentalInspectionFixture(inspectionId);
  return Boolean(
    inspection?.serviceId &&
      scenario.actor.kind === "FIELD" &&
      scenario.actor.crewId &&
      serviceFixtures.some(
        (service) => service.id === inspection.serviceId && service.crewId === scenario.actor.crewId,
      ),
  );
}

function fieldCanAccessSource(scenario: ReturnType<typeof getScenario>, sourceId: string) {
  return fieldCanAccessService(scenario, sourceId) || fieldCanAccessInspection(scenario, sourceId);
}

function queryFromUrl(url: URL): RepairRequestQuery {
  return {
    status: repairRequestStatusSchema.safeParse(url.searchParams.get("status")).data,
    damageType: repairDamageTypeSchema.safeParse(url.searchParams.get("damageType")).data,
    severity: repairSeveritySchema.safeParse(url.searchParams.get("severity")).data,
    detectedInId: url.searchParams.get("detectedInId") ?? undefined,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = sessionAndScenario(request);
    const query = queryFromUrl(new URL(request.url));
    const useBackend = backendMode(session);

    if (scenario.actor.kind === "FIELD") {
      if (!query.detectedInId) {
        return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
      }
      if (useBackend) {
        if (!session.crew?.id) {
          return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
        }
        const serviceResponse = await fetchBackend(request, `/services/${pathId(query.detectedInId)}`);
        if (!serviceResponse.ok) {
          return forwardResponse(serviceResponse);
        }
        const service = await serviceResponse.json();
        if (service?.crewId !== session.crew.id) {
          return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
        }
      } else if (!fieldCanAccessSource(scenario, query.detectedInId)) {
        return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
      }
    } else if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }

    if (useBackend) {
      const backendResponse = await fetchBackend(request, `/repair-requests${new URL(request.url).search}`);
      return forwardResponse(backendResponse);
    }

    return NextResponse.json(paginateRepairRequestFixtures(filterRepairRequestFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las derivaciones.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = sessionAndScenario(request);
    if (!scenario.capabilities.includes("repairRequest:create")) {
      return errorResponse(403, "Su rol no permite crear derivaciones.", path, FORBIDDEN_CODES.roleRequired);
    }

    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = createRepairRequestInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const sourcePath = parsed.data.detectedInType === "SERVICE" ? "/services" : "/environmental-inspections";
      const sourceResponse = await fetchBackend(request, `${sourcePath}/${pathId(parsed.data.detectedInId)}`);
      if (sourceResponse.status === 404) {
        return errorResponse(404, parsed.data.detectedInType === "SERVICE"
          ? `Servicio ${parsed.data.detectedInId} no encontrado.`
          : `Inspección ${parsed.data.detectedInId} no encontrada.`, path);
      }
      if (!sourceResponse.ok) {
        return forwardResponse(sourceResponse);
      }
      const sourceSchema = parsed.data.detectedInType === "SERVICE"
        ? z.object({ crewId: z.string().nullable().optional() }).passthrough()
        : z.object({ serviceId: z.string() }).passthrough();
      const source = sourceSchema.parse(await sourceResponse.json());
      if (scenario.actor.kind === "FIELD") {
        if (!session.crew?.id) {
          return errorResponse(403, "Solo puede crear derivaciones desde trabajo de su cuadrilla.", path);
        }
        let service = source;
        if (parsed.data.detectedInType === "INSPECTION") {
          const serviceResponse = await fetchBackend(request, `/services/${pathId(source.serviceId as string)}`);
          if (!serviceResponse.ok) {
            return forwardResponse(serviceResponse);
          }
          service = z.object({ crewId: z.string().nullable().optional() }).passthrough().parse(await serviceResponse.json());
        }
        if (service.crewId !== session.crew.id) {
          return errorResponse(403, "Solo puede crear derivaciones desde trabajo de su cuadrilla.", path);
        }
      }
      const backendResponse = await fetchBackend(request, "/repair-requests", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return forwardResponse(backendResponse);
    }

    if (parsed.data.detectedInType === "SERVICE" && !serviceFixtures.some((service) => service.id === parsed.data.detectedInId)) {
      return errorResponse(404, `Servicio ${parsed.data.detectedInId} no encontrado.`, path);
    }
    if (parsed.data.detectedInType === "INSPECTION" && !getEnvironmentalInspectionFixture(parsed.data.detectedInId)) {
      return errorResponse(404, `Inspección ${parsed.data.detectedInId} no encontrada.`, path);
    }
    if (scenario.actor.kind === "FIELD" && !fieldCanAccessSource(scenario, parsed.data.detectedInId)) {
      return errorResponse(403, "Solo puede crear derivaciones desde trabajo de su cuadrilla.", path);
    }

    const service = parsed.data.detectedInType === "SERVICE"
      ? serviceFixtures.find((candidate) => candidate.id === parsed.data.detectedInId)
      : undefined;
    const created = createRepairRequestFixture(parsed.data, service);
    addRepairRequestFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo crear la derivación.");
  }
}
