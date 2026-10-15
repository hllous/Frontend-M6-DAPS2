import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { greenSpaceFixtures } from "@/lib/green-space-fixtures";
import { updateGreenSpaceInputSchema } from "@/lib/green-spaces";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";




async function greenSpaceId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

function isOffice(request: Request) {
  const session = getRequiredSession(request);
  return getScenario(session).actor.kind === "OFFICE";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${pathId(id)}`);
            return forwardResponse(backendResponse);
    }
    const greenSpace = greenSpaceFixtures.find((item) => item.id === id);
    return greenSpace ? NextResponse.json(greenSpace) : errorResponse(404, "Espacio verde no encontrado.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar el espacio verde.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (!isOffice(request)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);
    const parsed = updateGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${pathId(id)}`, undefined, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const greenSpace = greenSpaceFixtures.find((item) => item.id === id);
    if (!greenSpace) return errorResponse(404, "Espacio verde no encontrado.", path);
    Object.assign(greenSpace, parsed.data);
    return NextResponse.json(greenSpace);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo actualizar el espacio verde.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (!isOffice(request)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${pathId(id)}`, undefined, { method: "DELETE" });
            return forwardResponse(backendResponse);
    }

    const greenSpace = greenSpaceFixtures.find((item) => item.id === id);
    if (!greenSpace) return errorResponse(404, "Espacio verde no encontrado.", path);
    greenSpace.active = false;
    return NextResponse.json(greenSpace);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo dar de baja el espacio verde.");
  }
}
