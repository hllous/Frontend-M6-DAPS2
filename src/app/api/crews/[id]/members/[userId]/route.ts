import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
type Context = { params: Promise<{ id: string; userId: string }> };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function forwardResponse(response: Response) {
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}

function requireOfficeCapability(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar integrantes de cuadrillas.");
  requireCapability(session, "crew:manage");
  return session;
}

export async function DELETE(request: Request, routeContext: Context) {
  const { id, userId } = await routeContext.params;
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, `/crews/${id}/members/${encodeURIComponent(userId)}`, "crew:manage", { method: "DELETE" }));
    const crew = crewFixtures.find((item) => item.id === id);
    if (!crew) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    crew.memberUserIds = crew.memberUserIds.filter((memberUserId) => memberUserId !== userId);
    return NextResponse.json(crew);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo quitar el integrante.", path);
  }
}
