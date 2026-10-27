import { backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getRepairRequestFixture, transitionRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { repairRequestRecoveryInputSchema } from "@/lib/repair-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";



export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request); const scenario = getScenario(session);
    if (!scenario.capabilities.includes("referral:reconcile")) return errorResponse(403, "Su rol no permite reconciliar derivaciones.", path, FORBIDDEN_CODES.roleRequired);
    let body: unknown = {};
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = repairRequestRecoveryInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) { const response = await fetchBackend(request, `/repair-requests/${pathId(id)}/close`, undefined, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }); return forwardResponse(response); }
    const current = getRepairRequestFixture(id);
    if (!current) return errorResponse(404, `Derivación ${id} no encontrada.`, path);
    if (current.status !== "IN_PROGRESS") return errorResponse(409, `Solo se puede cerrar una derivación IN_PROGRESS (estado actual: ${current.status}).`, path);
    return NextResponse.json(transitionRepairRequestFixture(id, "CLOSED", parsed.data));
  } catch (error) { if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path); if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path); return mapSessionError(error, path, "No se pudo cerrar la derivación."); }
}
