import { backendMode, errorResponse, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { updateCrewInputSchema } from "@/lib/crews";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";



type Context = { params: Promise<{ id: string }> | { id: string } };

async function context(request: Request, routeContext: Context) {
  const { id } = await routeContext.params;
  const session = getRequiredSession(request);
  return { id, path: new URL(request.url).pathname, session, scenario: getScenario(session) };
}
function requireOfficeCapability(session: ReturnType<typeof getRequiredSession>, scenario: ReturnType<typeof getScenario>) {
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar cuadrillas.");
  requireCapability(session, "crew:manage");
}

export async function GET(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await context(request, routeContext);
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId !== id) throw new ForbiddenSessionError("Solo puede consultar su propia cuadrilla.");
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}`));
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
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}`, "crew:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
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
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}`, "crew:manage", { method: "DELETE" }));
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
