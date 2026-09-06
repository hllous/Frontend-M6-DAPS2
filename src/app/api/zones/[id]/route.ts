import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
  requireCapability,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  getZoneFixture,
  updateZoneFixture,
  zoneFixtures,
} from "@/lib/zones-fixtures";
import { updateZoneInputSchema } from "@/lib/zones";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
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

async function targetId(context: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await context.params;
  return resolved.id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/zones/${id}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const zone = getZoneFixture(id);
    if (!zone) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    return NextResponse.json(zone);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo cargar la zona operativa.", path);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

    if (scenario.actor.kind !== "OFFICE") {
      throw new ForbiddenSessionError("Solo el rol de Oficina puede editar zonas operativas.");
    }
    requireCapability(session, "zone:manage");

    const id = await targetId(context);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = updateZoneInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/zones/${id}`, "zone:manage", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const text = await backendResponse.text();
      return new NextResponse(text, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const existing = zoneFixtures.find((candidate) => candidate.id === id);
    if (!existing) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    // Code is strictly immutable: updateZoneFixture only patches allowed properties (name, active)
    const updated = updateZoneFixture(id, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo actualizar la zona operativa.", path);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

    if (scenario.actor.kind !== "OFFICE") {
      throw new ForbiddenSessionError("Solo el rol de Oficina puede dar de baja zonas operativas.");
    }
    requireCapability(session, "zone:manage");

    const id = await targetId(context);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/zones/${id}`, "zone:manage", {
        method: "DELETE",
      });
      const text = await backendResponse.text();
      return new NextResponse(text, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const existing = zoneFixtures.find((candidate) => candidate.id === id);
    if (!existing) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    // Logical delete per standard: active = false
    const updated = updateZoneFixture(id, { active: false });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo dar de baja la zona operativa.", path);
  }
}
