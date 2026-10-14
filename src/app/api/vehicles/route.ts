import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { createVehicleInputSchema, type VehicleQuery, vehicleTypeSchema } from "@/lib/vehicles";
import { addVehicleFixture, filterVehicleFixtures, paginateVehicleFixtures } from "@/lib/vehicles-fixtures";
import { pageParam, pageSizeParam } from "@/lib/input-limits";





function parseVehicleQuery(url: URL): VehicleQuery {
  const active = url.searchParams.get("active");
  const vehicleType = vehicleTypeSchema.safeParse(url.searchParams.get("vehicleType"));
  return {
    active: active === null ? undefined : active === "true",
    vehicleType: vehicleType.success ? vehicleType.data : undefined,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function requireOfficeCapability(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar vehículos.", capability: "vehicle:manage", throwOnError: true }).session; }

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseVehicleQuery(new URL(request.url));
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/vehicles${backendQuery(query, ["active", "vehicleType", "page", "pageSize"])}`);
      return forwardResponse(response);
    }
    return NextResponse.json(paginateVehicleFixtures(filterVehicleFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los vehículos.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = createVehicleInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, "/vehicles", "vehicle:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return forwardResponse(response);
    }
    const vehicle = { id: `vehicle-${Date.now()}`, ...parsed.data, active: true };
    addVehicleFixture(vehicle);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo registrar el vehículo.");
  }
}
