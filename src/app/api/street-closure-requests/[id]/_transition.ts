import { backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  getStreetClosureRequestFixture,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import { approveStreetClosureRequestInputSchema } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";

type Transition = "approve" | "reject" | "end";





export async function handleStreetClosureTransition(
  request: Request,
  id: string,
  transition: Transition,
) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (!scenario.capabilities.includes("referral:reconcile")) {
      return errorResponse(403, "Su rol no permite reconciliar solicitudes de corte de calle.", path, FORBIDDEN_CODES.roleRequired);
    }

    let body: unknown = undefined;
    if (transition === "approve") {
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "El cuerpo de la aprobación no es un JSON válido.", path);
      }
      const parsed = approveStreetClosureRequestInputSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
      body = parsed.data;
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/street-closure-requests/${pathId(id)}/${transition}`, undefined, {
        method: "POST",
        headers: transition === "approve" ? { "content-type": "application/json" } : undefined,
        body: transition === "approve" ? JSON.stringify(body) : undefined,
      });
      return forwardResponse(backendResponse);
    }

    const current = getStreetClosureRequestFixture(id);
    if (!current) return errorResponse(404, `Solicitud de corte de calle ${id} no encontrada.`, path);
    const valid =
      (transition === "approve" && current.status === "REQUESTED") ||
      (transition === "reject" && current.status === "REQUESTED") ||
      (transition === "end" && (current.status === "APPROVED" || current.status === "EXPIRED"));
    if (!valid) return errorResponse(409, "La transición no es válida para el estado actual de la solicitud.", path);

    const changes = {
      status: transition === "approve" ? "APPROVED" : transition === "reject" ? "REJECTED" : "ENDED",
      closureId: transition === "approve" ? (body as { closureId: string }).closureId : current.closureId,
      updatedAt: new Date().toISOString(),
    } as const;
    return NextResponse.json(updateStreetClosureRequestFixture(id, changes));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo reconciliar la solicitud de corte de calle.");
  }
}
