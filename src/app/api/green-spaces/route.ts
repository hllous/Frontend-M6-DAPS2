import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addGreenSpaceFixture,
  filterGreenSpaceFixtures,
  greenSpaceFixtures,
  paginateGreenSpaceFixtures,
} from "@/lib/green-space-fixtures";
import {
  createGreenSpaceInputSchema,
  greenSpaceTypeSchema,
  type GreenSpace,
  type GreenSpaceQuery,
} from "@/lib/green-spaces";
import { getScenario, type OperationalScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { pageParam, pageSizeParam } from "@/lib/input-limits";




function parseGreenSpaceQuery(url: URL): GreenSpaceQuery {
  const rawSpaceType = url.searchParams.get("spaceType");
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    spaceType: greenSpaceTypeSchema.safeParse(rawSpaceType).success
      ? (rawSpaceType as GreenSpaceQuery["spaceType"])
      : undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function backendQueryString(query: GreenSpaceQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.spaceType) params.set("spaceType", query.spaceType);
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function isOffice(scenario: OperationalScenario) {
  return scenario.actor.kind === "OFFICE";
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const query = parseGreenSpaceQuery(new URL(request.url));

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/green-spaces${backendQueryString(query)}`);
            return forwardResponse(backendResponse);
    }

    return NextResponse.json(paginateGreenSpaceFixtures(filterGreenSpaceFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los espacios verdes.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (!isOffice(scenario)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);

    const parsed = createGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/green-spaces", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const greenSpace: GreenSpace = {
      id: `green-space-108-${greenSpaceFixtures.length + 1}`,
      ...parsed.data,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      active: true,
    };
    addGreenSpaceFixture(greenSpace);
    return NextResponse.json(greenSpace, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo registrar el espacio verde.");
  }
}
