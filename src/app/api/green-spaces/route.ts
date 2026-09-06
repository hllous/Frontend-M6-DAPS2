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

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    { statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path },
    { status },
  );
}
function parseGreenSpaceQuery(url: URL): GreenSpaceQuery {
  const rawSpaceType = url.searchParams.get("spaceType");
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    spaceType: greenSpaceTypeSchema.safeParse(rawSpaceType).success
      ? (rawSpaceType as GreenSpaceQuery["spaceType"])
      : undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
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

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/green-spaces${backendQueryString(query)}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    return NextResponse.json(paginateGreenSpaceFixtures(filterGreenSpaceFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar los espacios verdes.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (!isOffice(scenario)) return errorResponse(403, "Solo Oficina puede gestionar espacios verdes.", path);

    const parsed = createGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/green-spaces", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const greenSpace: GreenSpace = {
      id: `green-space-108-${greenSpaceFixtures.length + 1}`,
      ...parsed.data,
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
    return errorResponse(500, "No se pudo registrar el espacio verde.", path);
  }
}
