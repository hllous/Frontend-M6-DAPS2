import { NextResponse } from "next/server";

import { closeServiceFrequencyFixture, serviceFrequencyFixtures, updateServiceFrequencyFixture } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyUpdateInputSchema } from "@/lib/service-frequencies";
import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }
async function targetId(context: { params: Promise<{ id: string }> | { id: string } }) { return (await context.params).id; }
function requireOfficeCapability(request: Request) { const session = getRequiredSession(request); const scenario = getScenario(session.scenarioId); if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar frecuencias de servicio."); requireCapability(session, "serviceFrequency:manage"); return session; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) { const response = await fetchBackend(request, `/service-frequencies/${id}`); return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } }); }
    const item = serviceFrequencyFixtures.find((candidate) => candidate.id === id);
    return item ? NextResponse.json(item) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar la frecuencia de servicio.", path);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    const id = await targetId(context);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = serviceFrequencyUpdateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) { const response = await fetchBackend(request, `/service-frequencies/${id}`, "serviceFrequency:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }); return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } }); }
    const updated = updateServiceFrequencyFixture(id, parsed.data);
    return updated ? NextResponse.json(updated) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo actualizar la frecuencia de servicio.", path);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    const id = await targetId(context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) { const response = await fetchBackend(request, `/service-frequencies/${id}`, "serviceFrequency:manage", { method: "DELETE" }); return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } }); }
    const updated = closeServiceFrequencyFixture(id);
    return updated ? NextResponse.json(updated) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof ForbiddenSessionError) { recordTelemetryEvent({ name: "auth_forbidden", status: 403 }); return errorResponse(403, error.message, path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cerrar la vigencia de la frecuencia.", path);
  }
}
