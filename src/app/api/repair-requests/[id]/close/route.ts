import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { getRepairRequestFixture, transitionRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { repairRequestRecoveryInputSchema } from "@/lib/repair-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";

function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: status === 404 ? "Not Found" : status === 403 ? "Forbidden" : status === 409 ? "Conflict" : status === 400 ? "Bad Request" : "Error", timestamp: new Date().toISOString(), path }, { status }); }

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params; const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request); const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede reconciliar derivaciones.", path);
    let body: unknown = {};
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = repairRequestRecoveryInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) { const response = await fetchBackend(request, `/repair-requests/${id}/close`, undefined, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }); return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } }); }
    const current = getRepairRequestFixture(id);
    if (!current) return errorResponse(404, `Derivación ${id} no encontrada.`, path);
    if (current.status !== "IN_PROGRESS") return errorResponse(409, `Solo se puede cerrar una derivación IN_PROGRESS (estado actual: ${current.status}).`, path);
    return NextResponse.json(transitionRepairRequestFixture(id, "CLOSED", parsed.data));
  } catch (error) { if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path); if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path); return errorResponse(500, "No se pudo cerrar la derivación.", path); }
}
