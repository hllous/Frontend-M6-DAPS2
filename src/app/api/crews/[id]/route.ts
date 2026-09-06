import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { updateCrewInputSchema } from "@/lib/crews";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }
type Context = { params: Promise<{ id: string }> | { id: string } };

async function context(request: Request, routeContext: Context) {
  const { id } = await routeContext.params;
  const session = getRequiredSession(request);
  return { id, path: new URL(request.url).pathname, session, scenario: getScenario(session.scenarioId) };
}
function forwardResponse(response: Response) { return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } }); }
function requireOfficeCapability(session: ReturnType<typeof getRequiredSession>, scenario: ReturnType<typeof getScenario>) {
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar cuadrillas.");
  requireCapability(session, "crew:manage");
}

export async function GET(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await context(request, routeContext);
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId !== id) throw new ForbiddenSessionError("Solo puede consultar su propia cuadrilla.");
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, `/crews/${id}`));
    const crew = crewFixtures.find((item) => item.id === id);
    return crew ? NextResponse.json(crew) : errorResponse(404, `La cuadrilla ${id} no existe.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar la cuadrilla.", path);
  }
}

export async function PATCH(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await context(request, routeContext);
    requireOfficeCapability(session, scenario);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = updateCrewInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, `/crews/${id}`, "crew:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
    const crew = crewFixtures.find((item) => item.id === id);
    if (!crew) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    Object.assign(crew, parsed.data);
    return NextResponse.json(crew);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo actualizar la cuadrilla.", path);
  }
}

export async function DELETE(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await context(request, routeContext);
    requireOfficeCapability(session, scenario);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, `/crews/${id}`, "crew:manage", { method: "DELETE" }));
    const crew = crewFixtures.find((item) => item.id === id);
    if (!crew) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    crew.active = false;
    return NextResponse.json(crew);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo dar de baja la cuadrilla.", path);
  }
}
