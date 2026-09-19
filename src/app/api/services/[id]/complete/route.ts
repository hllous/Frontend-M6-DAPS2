import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  getZoneResultsByServiceId,
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { completeServiceInputSchema, type CompleteServiceInput, type ServiceStatus } from "@/lib/services";
import {
  completeRepairFixture,
  confirmRelocationFixture,
  containerFixtures,
  emptyContainerFixture,
  getContainerFixture,
} from "@/lib/containers-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

function findTargetContainer(service: (typeof serviceFixtures)[number]) {
  if (service.mode !== "POINT" || service.targetType !== "CONTAINER") return null;

  return (
    (service.targetId ? getContainerFixture(service.targetId) : null) ??
    (service.targetRef ? containerFixtures.find((container) => container.code === service.targetRef) ?? null : null)
  );
}

function transitionTargetContainer(
  service: (typeof serviceFixtures)[number],
  input: CompleteServiceInput,
) {
  const container = findTargetContainer(service);
  if (!container) return;

  switch (container.status) {
    case "OVERFLOWED":
      emptyContainerFixture(container.id);
      break;
    case "UNDER_REPAIR":
      completeRepairFixture(container.id);
      break;
    case "RELOCATING":
      if (!input.containerLocation) {
        throw new Error("CONTAINER_LOCATION_REQUIRED");
      }
      confirmRelocationFixture(container.id, input.containerLocation);
      break;
    default:
      break;
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
    const scenario = getScenario(session.scenarioId);

    if (!scenario.capabilities.includes("service:execute")) {
      return errorResponse(
        403,
        "No tiene permisos para completar el servicio. Solo la persona responsable de la cuadrilla puede hacerlo.",
        path,
      );
    }

    let completionInput: CompleteServiceInput = {};
    const requestBody = await request.text();
    if (requestBody.trim()) {
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        return errorResponse(400, "El cuerpo de la solicitud debe ser un JSON válido.", path);
      }
      const parsedInput = completeServiceInputSchema.safeParse(parsedBody);
      if (!parsedInput.success) {
        return errorResponse(400, parsedInput.error.issues.map((issue) => issue.message).join(" "), path);
      }
      completionInput = parsedInput.data;
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendInit: RequestInit = { method: "POST" };
      if (requestBody.trim()) {
        backendInit.headers = { "content-type": "application/json" };
        backendInit.body = JSON.stringify(completionInput);
      }
      const backendResponse = await fetchBackend(
        request,
        `/services/${serviceId}/complete`,
        undefined,
        backendInit,
      );
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      if (service.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "No tiene permisos para completar servicios de otra cuadrilla.", path);
      }
    }

    if (service.status !== "IN_PROGRESS") {
      return errorResponse(
        409,
        `Solo se pueden completar servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
        path,
      );
    }

    const results = getZoneResultsByServiceId(serviceId);
    const missingZones = service.zoneIds.filter((zid) => !results.some((r) => r.zoneId === zid));
    if (missingZones.length > 0) {
      return errorResponse(
        409,
        `Falta registrar el resultado de ${missingZones.length} zona(s) del servicio antes de completar.`,
        path,
      );
    }

    // Backend-computed completion rollup
    const allServiced = results.every((r) => r.status === "SERVICED");
    const computedStatus: ServiceStatus = allServiced ? "COMPLETED" : "PARTIALLY_COMPLETED";
    const historyLabel = computedStatus === "COMPLETED" ? "Completado" : "Parcial";

    const nonServicedNotes = results
      .filter((r) => r.status !== "SERVICED" && r.notes)
      .map((r) => r.notes)
      .join(" · ");

    if (computedStatus === "COMPLETED") {
      try {
        transitionTargetContainer(service, completionInput);
      } catch (error) {
        if (error instanceof Error && error.message === "CONTAINER_LOCATION_REQUIRED") {
          return errorResponse(400, "La nueva ubicación del contenedor es obligatoria para completar la reubicación.", path);
        }
        throw error;
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

    return NextResponse.json(updated, { status: 200 });
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return errorResponse(500, "Error interno del servidor.", path);
  }
}
