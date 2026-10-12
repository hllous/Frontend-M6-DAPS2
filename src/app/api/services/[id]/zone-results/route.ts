import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  addZoneResultFixture,
  getZoneResultsByServiceId,
  serviceFixtures,
} from "@/lib/services-fixtures";
import {
  recordZoneResultInputSchema,
  type ZoneResult,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";





export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/zone-results`,
      );
            return forwardResponse(backendResponse);
    }

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      if (service.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "No tiene permisos para ver los resultados de otra cuadrilla.", path);
      }
    }

    const results = getZoneResultsByServiceId(serviceId);
    return NextResponse.json(results);
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return mapSessionError(caught, path, "Error interno del servidor.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    if (!scenario.capabilities.includes("service:execute")) {
      return errorResponse(
        403,
        "No tiene permisos para registrar resultados de zona. Solo la persona responsable de la cuadrilla puede hacerlo.",
        path,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = recordZoneResultInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        parsed.error.issues.map((i) => i.message).join(" "),
        path,
      );
    }

    const input = parsed.data;

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/zone-results`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
            return forwardResponse(backendResponse);
    }

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      if (service.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "No tiene permisos para registrar resultados en servicios de otra cuadrilla.", path);
      }
    }

    if (service.status !== "IN_PROGRESS") {
      return errorResponse(
        409,
        `Solo se pueden registrar resultados en servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
        path,
      );
    }

    if (!service.zoneIds.includes(input.zoneId)) {
      return errorResponse(
        400,
        `La zona ${input.zoneId} no pertenece al alcance delimitado de este servicio.`,
        path,
      );
    }

    const existingResults = getZoneResultsByServiceId(serviceId);
    if (existingResults.some((r) => r.zoneId === input.zoneId)) {
      return errorResponse(
        409,
        `El resultado para la zona ${input.zoneId} ya fue registrado previamente.`,
        path,
      );
    }

    const newResult: ZoneResult = {
      id: `ZR-${serviceId}-${Math.floor(100 + Math.random() * 900)}`,
      serviceId,
      zoneId: input.zoneId,
      status: input.status,
      reason: input.status === "SERVICED" ? null : (input.reason ?? null),
      notes: input.notes ?? null,
      proposedDate: input.proposedDate ?? null,
      attachments: [],
      recordedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    addZoneResultFixture(newResult);
    return NextResponse.json(newResult, { status: 201 });
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return mapSessionError(caught, path, "Error interno del servidor.");
  }
}
