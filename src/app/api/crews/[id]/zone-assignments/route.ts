import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addCrewZoneAssignmentFixture, crewFixtures, listCrewZoneAssignmentFixtures, overlapsCrewZoneAssignment } from "@/lib/crew-fixtures";
import { createCrewZoneAssignmentInputSchema } from "@/lib/crew-zone-assignments";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

const OVERLAP_MESSAGE = "El período indicado se superpone con otra reubicación de esta cuadrilla. Ajuste las fechas.";

function mapError(error: unknown, path: string, fallback: string) {
  if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
  if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
  if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
  return mapSessionError(error, path, fallback);
}

export async function GET(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id } = await routeContext.params;
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId !== id) throw new ForbiddenSessionError("Solo puede consultar su propia cuadrilla.");
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}/zone-assignments`));
    if (!crewFixtures.some((item) => item.id === id)) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    return NextResponse.json({ data: listCrewZoneAssignmentFixtures(id) });
  } catch (error) {
    return mapError(error, path, "No se pudo cargar el historial de reubicaciones.");
  }
}

export async function POST(request: Request, routeContext: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id } = await routeContext.params;
    const { session } = authorize(request, { office: true, officeMessage: "Solo Operaciones puede reubicar cuadrillas.", capability: "service:assign", capabilityMessage: "Solo Operaciones puede reubicar cuadrillas.", throwOnError: true });
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = createCrewZoneAssignmentInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/crews/${pathId(id)}/zone-assignments`, "service:assign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (response.status === 409) { void response.body?.cancel().catch(() => undefined); return errorResponse(409, OVERLAP_MESSAGE, path); }
      return forwardResponse(response);
    }
    if (!crewFixtures.some((item) => item.id === id)) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    if (overlapsCrewZoneAssignment(id, parsed.data.validFrom, parsed.data.validTo)) return errorResponse(409, OVERLAP_MESSAGE, path);
    const move = { id: `move-${crypto.randomUUID()}`, crewId: id, zoneId: parsed.data.zoneId, validFrom: parsed.data.validFrom, validTo: parsed.data.validTo ?? null, reason: parsed.data.reason, createdBy: "3", createdAt: new Date().toISOString() };
    addCrewZoneAssignmentFixture(move);
    return NextResponse.json(move, { status: 201 });
  } catch (error) {
    return mapError(error, path, "No se pudo reubicar la cuadrilla.");
  }
}
