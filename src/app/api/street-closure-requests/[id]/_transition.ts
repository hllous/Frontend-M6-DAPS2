import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  getStreetClosureRequestFixture,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import { approveStreetClosureRequestInputSchema } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";

type Transition = "approve" | "reject" | "end";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    { statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path },
    { status },
  );
}

export async function handleStreetClosureTransition(
  request: Request,
  id: string,
  transition: Transition,
) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede reconciliar solicitudes de corte de calle.", path);
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

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/street-closure-requests/${id}/${transition}`, undefined, {
        method: "POST",
        headers: transition === "approve" ? { "content-type": "application/json" } : undefined,
        body: transition === "approve" ? JSON.stringify(body) : undefined,
      });
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const current = getStreetClosureRequestFixture(id);
    if (!current) return errorResponse(404, `Solicitud de corte de calle ${id} no encontrada.`, path);
    const valid =
      (transition === "approve" && current.status === "REQUESTED") ||
      (transition === "reject" && current.status === "REQUESTED") ||
      (transition === "end" && current.status === "APPROVED");
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
    return errorResponse(500, "No se pudo reconciliar la solicitud de corte de calle.", path);
  }
}
