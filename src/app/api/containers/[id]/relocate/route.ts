import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getContainerFixture, startRelocationFixture } from "@/lib/containers-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  503: "Service Unavailable",
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

async function targetId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await targetId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

    if (!scenario.capabilities.includes("container:manage")) {
      return errorResponse(403, "No tiene permisos para reubicar contenedores.", path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/containers/${id}/relocate`, "container:manage", {
        method: "POST",
      });
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const container = getContainerFixture(id);
    if (!container) {
      return errorResponse(404, `Contenedor ${id} no encontrado.`, path);
    }

    if (container.status !== "ACTIVE") {
      return errorResponse(
        409,
        `Solo se puede iniciar la reubicación en contenedores activos. Estado actual: ${container.status}`,
        path,
      );
    }

    const updated = startRelocationFixture(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo iniciar la reubicación del contenedor.", path);
  }
}
