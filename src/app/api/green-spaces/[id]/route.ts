import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { greenSpaceFixtures } from "@/lib/green-space-fixtures";
import { updateGreenSpaceInputSchema } from "@/lib/green-spaces";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

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
    { statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path },
    { status },
  );
}
async function greenSpaceId(context: { params: Promise<{ id: string }> | { id: string } }) {
  return (await context.params).id;
}

function isOffice(request: Request) {
  const session = getRequiredSession(request);
  return getScenario(session.scenarioId).actor.kind === "OFFICE";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${id}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }
    const greenSpace = greenSpaceFixtures.find((item) => item.id === id);
    return greenSpace ? NextResponse.json(greenSpace) : errorResponse(404, "Espacio verde no encontrado.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar el espacio verde.", path);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (!isOffice(request)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);
    const parsed = updateGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${id}`, undefined, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
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
    return errorResponse(500, "No se pudo actualizar el espacio verde.", path);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const id = await greenSpaceId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    if (!isOffice(request)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/green-spaces/${id}`, undefined, { method: "DELETE" });
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
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
    return errorResponse(500, "No se pudo dar de baja el espacio verde.", path);
  }
}
