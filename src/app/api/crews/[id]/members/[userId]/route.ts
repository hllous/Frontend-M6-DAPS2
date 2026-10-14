import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";


type Context = { params: Promise<{ id: string; userId: string }> };



function requireOfficeCapability(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar integrantes de cuadrillas.", capability: "crew:manage", throwOnError: true }).session; }

export async function DELETE(request: Request, routeContext: Context) {
  const { id, userId } = await routeContext.params;
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}/members/${pathId(userId)}`, "crew:manage", { method: "DELETE" }));
    const crew = crewFixtures.find((item) => item.id === id);
    if (!crew) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    crew.memberUserIds = crew.memberUserIds.filter((memberUserId) => memberUserId !== userId);
    return NextResponse.json(crew);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo quitar el integrante.");
  }
}
