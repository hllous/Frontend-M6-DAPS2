import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { addCrewMembersInputSchema } from "@/lib/crews";
import { AuthUnavailableError, ForbiddenSessionError, InvalidSessionError } from "@/lib/session";


type PostContext = { params: Promise<{ id: string }> };



function requireOfficeCapability(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar integrantes de cuadrillas.", capability: "crew:manage", throwOnError: true }).session; }

// El backend nombra el campo userIds en POST /crews/{id}/members; adentro se sigue
// llamando memberUserIds, asi que la traduccion queda en el borde, que es el BFF.
export async function POST(request: Request, routeContext: PostContext) {
  const { id } = await routeContext.params;
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = addCrewMembersInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/crews/${pathId(id)}/members`, "crew:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userIds: parsed.data.memberUserIds }) }));
    const crew = crewFixtures.find((item) => item.id === id);
    if (!crew) return errorResponse(404, `La cuadrilla ${id} no existe.`, path);
    crew.memberUserIds = [...new Set([...crew.memberUserIds, ...parsed.data.memberUserIds])];
    return NextResponse.json(crew);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron agregar los integrantes.");
  }
}
