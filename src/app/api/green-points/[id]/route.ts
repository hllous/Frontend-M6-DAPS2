import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { greenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { greenPointUpdateInputSchema } from "@/lib/green-points";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";



async function targetId(context: { params: Promise<{ id: string }> }) { return (await context.params).id; }
function requireOffice(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar puntos verdes.", capability: "greenPoint:manage", throwOnError: true }).session; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/green-points/${pathId(id)}`);
      return forwardResponse(response);
    }
    const item = greenPointFixtures.find((candidate) => candidate.id === id);
    return item ? NextResponse.json(item) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar el punto verde.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOffice(request);
    const id = await targetId(context);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = greenPointUpdateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/green-points/${pathId(id)}`, "greenPoint:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(response);
    }
    const updated = updateGreenPointFixture(id, parsed.data);
    return updated ? NextResponse.json(updated) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo actualizar el punto verde.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOffice(request);
    const id = await targetId(context);
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/green-points/${pathId(id)}`, "greenPoint:manage", { method: "DELETE" });
      return forwardResponse(response);
    }
    const updated = updateGreenPointFixture(id, { active: false });
    return updated ? new NextResponse(null, { status: 204 }) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo dar de baja el punto verde.");
  }
}
