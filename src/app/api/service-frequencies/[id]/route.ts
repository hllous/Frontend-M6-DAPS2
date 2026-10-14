import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { serviceFrequencyResponseFixture, closeServiceFrequencyFixture, serviceFrequencyFixtures, updateServiceFrequencyFixture } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyUpdateInputSchema } from "@/lib/service-frequencies";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";



async function targetId(context: { params: Promise<{ id: string }> | { id: string } }) { return (await context.params).id; }
function requireOfficeCapability(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar frecuencias de servicio.", capability: "serviceFrequency:manage", throwOnError: true }).session; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);
    if (backendMode(session)) { const response = await fetchBackend(request, `/service-frequencies/${pathId(id)}`); return forwardResponse(response); }
    const item = serviceFrequencyFixtures.find((candidate) => candidate.id === id);
    return item ? NextResponse.json(serviceFrequencyResponseFixture(item)) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar la frecuencia de servicio.");
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
    if (backendMode(session)) { const response = await fetchBackend(request, `/service-frequencies/${pathId(id)}`, "serviceFrequency:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }); return forwardResponse(response); }
    const updated = updateServiceFrequencyFixture(id, parsed.data);
    return updated ? NextResponse.json(serviceFrequencyResponseFixture(updated)) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo actualizar la frecuencia de servicio.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    const id = await targetId(context);
    if (backendMode(session)) { const response = await fetchBackend(request, `/service-frequencies/${pathId(id)}`, "serviceFrequency:manage", { method: "DELETE" }); return forwardResponse(response); }
    const updated = closeServiceFrequencyFixture(id);
    return updated ? NextResponse.json(serviceFrequencyResponseFixture(updated)) : errorResponse(404, "Frecuencia no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof ForbiddenSessionError) { recordTelemetryEvent({ name: "auth_forbidden", status: 403 }); return errorResponse(403, error.message, path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cerrar la vigencia de la frecuencia.");
  }
}
