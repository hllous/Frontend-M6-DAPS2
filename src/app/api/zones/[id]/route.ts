import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  getZoneFixture,
  updateZoneFixture,
  findCommuneFixture,
  zoneFixtures,
} from "@/lib/zones-fixtures";
import { updateZoneInputSchema, type Zone } from "@/lib/zones";





async function targetId(context: { params: Promise<{ id: string }> }) {
  const resolved = await context.params;
  return resolved.id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/zones/${pathId(id)}`);
            return forwardResponse(backendResponse);
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
    return mapSessionError(error, path, "No se pudo cargar la zona operativa.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede editar zonas operativas.", capability: "zone:manage", throwOnError: true });

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

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/zones/${pathId(id)}`, "zone:manage", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return forwardResponse(backendResponse);
    }

    const existing = zoneFixtures.find((candidate) => candidate.id === id);
    if (!existing) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    // Code is strictly immutable: updateZoneFixture only patches allowed properties (name, active)
    const { communeId, ...fields } = parsed.data;
    const patch: Partial<Zone> = fields;
    if (communeId !== undefined) {
      const commune = communeId === null ? null : findCommuneFixture(communeId);
      if (communeId !== null && !commune) return errorResponse(400, "La comuna indicada no existe.", path);
      patch.commune = commune;
    }
    const updated = updateZoneFixture(id, patch);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo actualizar la zona operativa.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede dar de baja zonas operativas.", capability: "zone:manage", throwOnError: true });

    const id = await targetId(context);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/zones/${pathId(id)}`, "zone:manage", {
        method: "DELETE",
      });
      return forwardResponse(backendResponse);
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
      return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo dar de baja la zona operativa.");
  }
}
