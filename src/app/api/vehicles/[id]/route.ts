import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { updateVehicleInputSchema } from "@/lib/vehicles";
import { vehicleFixtures } from "@/lib/vehicles-fixtures";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

type Context = { params: Promise<{ id: string }> | { id: string } };

async function requestContext(request: Request, context: Context) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  return { id, path, session, scenario };
}

function requireOfficeCapability(session: ReturnType<typeof getRequiredSession>, scenario: ReturnType<typeof getScenario>) {
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar vehículos.");
  requireCapability(session, "vehicle:manage");
}

async function forward(request: Request, path: string, capability?: "vehicle:manage", init?: RequestInit) {
  const response = await fetchBackend(request, path, capability, init);
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(request: Request, context: Context) {
  try {
    const { id, path, session } = await requestContext(request, context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forward(request, `/vehicles/${id}`);
    const vehicle = vehicleFixtures.find((item) => item.id === id);
    return vehicle ? NextResponse.json(vehicle) : errorResponse(404, `El vehículo ${id} no existe.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", new URL(request.url).pathname); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, new URL(request.url).pathname);
    return errorResponse(500, "No se pudo cargar el vehículo.", new URL(request.url).pathname);
  }
}

export async function PATCH(request: Request, context: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await requestContext(request, context);
    requireOfficeCapability(session, scenario);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = updateVehicleInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    requireOfficeCapability(session, scenario);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forward(request, `/vehicles/${id}`, "vehicle:manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
    const vehicle = vehicleFixtures.find((item) => item.id === id);
    if (!vehicle) return errorResponse(404, `El vehículo ${id} no existe.`, path);
    Object.assign(vehicle, parsed.data);
    return NextResponse.json(vehicle);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo actualizar el vehículo.", path);
  }
}

export async function DELETE(request: Request, context: Context) {
  const path = new URL(request.url).pathname;
  try {
    const { id, session, scenario } = await requestContext(request, context);
    requireOfficeCapability(session, scenario);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forward(request, `/vehicles/${id}`, "vehicle:manage", { method: "DELETE" });
    const vehicle = vehicleFixtures.find((item) => item.id === id);
    if (!vehicle) return errorResponse(404, `El vehículo ${id} no existe.`, path);
    vehicle.active = false;
    return NextResponse.json(vehicle);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo dar de baja el vehículo.", path);
  }
}
