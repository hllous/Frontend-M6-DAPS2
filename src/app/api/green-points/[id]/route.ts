import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { greenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { greenPointUpdateInputSchema } from "@/lib/green-points";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }
async function targetId(context: { params: Promise<{ id: string }> | { id: string } }) { return (await context.params).id; }
function requireOffice(request: Request) { const session = getRequiredSession(request); const scenario = getScenario(session.scenarioId); if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar puntos verdes."); requireCapability(session, "greenPoint:manage"); return session; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/green-points/${id}`);
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const item = greenPointFixtures.find((candidate) => candidate.id === id);
    return item ? NextResponse.json(item) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar el punto verde.", path);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOffice(request);
    const id = await targetId(context);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = greenPointUpdateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/green-points/${id}`, "greenPoint:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const updated = updateGreenPointFixture(id, parsed.data);
    return updated ? NextResponse.json(updated) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo actualizar el punto verde.", path);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOffice(request);
    const id = await targetId(context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/green-points/${id}`, "greenPoint:manage", { method: "DELETE" });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const updated = updateGreenPointFixture(id, { active: false });
    return updated ? new NextResponse(null, { status: 204 }) : errorResponse(404, `Punto verde ${id} no encontrado.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo dar de baja el punto verde.", path);
  }
}
