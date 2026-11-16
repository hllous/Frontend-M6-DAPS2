// @ts-nocheck
import { backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, requireCrewScope, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { withArgentinaOffset } from "@/lib/argentina-date";
import { fetchBackend } from "@/lib/bff-backend";
import {
  addStreetClosureRequestFixture,
  createStreetClosureRequestFixture,
  filterStreetClosureRequestFixtures,
  paginateStreetClosureRequestFixtures,
} from "@/lib/street-closure-request-fixtures";
import {
  type CreateStreetClosureRequestInput,
  createStreetClosureRequestInputSchema,
  streetClosureRequestQuerySchema,
} from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { pageParam, pageSizeParam } from "@/lib/input-limits";





async function requireReadAccess(request: Request, path: string, sourceId?: string) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session);
  if (scenario.actor.kind === "OFFICE") return { session, scenario };

  // Field may read only the dependency context for a Service assigned to its crew.
  // Backend remains authoritative for this scope when the BFF is forwarding.
  if (sourceId && backendMode(session)) {
    const scopedService = await requireCrewScope(request, session, { serviceId: sourceId });
    if (scopedService instanceof Response) return { response: scopedService };
    return { session, scenario };
  }
  const service = sourceId
    ? serviceFixtures.find((candidate) => candidate.id === sourceId)
    : undefined;
  if (!sourceId || !service || service.crewId !== scenario.actor.crewId) {
    return { response: errorResponse(403, "Solo Oficina puede consultar solicitudes de corte de calle.", path) };
  }
  return { session, scenario };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const sourceId = new URL(request.url).searchParams.get("sourceId") ?? undefined;
    const access = await requireReadAccess(request, path, sourceId);
    if (access.response) return access.response;
    const queryResult = streetClosureRequestQuerySchema.safeParse({
      status: new URL(request.url).searchParams.get("status") ?? undefined,
      sourceId: new URL(request.url).searchParams.get("sourceId") ?? undefined,
      page: pageParam(new URL(request.url).searchParams),
      pageSize: pageSizeParam(new URL(request.url).searchParams),
    });
    if (!queryResult.success) {
      return errorResponse(400, "Los filtros de solicitudes de corte de calle son inválidos.", path);
    }

    if (access.session && backendMode(access.session)) {
      const backendResponse = await fetchBackend(
        request,
        `/street-closure-requests${backendQuery(queryResult.data, ["status", "sourceId", "page", "pageSize"])}`,
      );
      return forwardResponse(backendResponse);
    }

    return NextResponse.json(
      paginateStreetClosureRequestFixtures(filterStreetClosureRequestFixtures(queryResult.data), queryResult.data.page, queryResult.data.pageSize),
    );
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las solicitudes de corte de calle.");
  }
}

// Backend's CreateStreetClosureRequestDto is strict (forbidNonWhitelisted): it names the
// collection `sections` and has no `sourceModule`, so send exactly its wire shape.
// The form sends a zoneless local window; Backend parses it with `new Date` on a UTC server,
// so it gets the Argentina offset here (#917).
function toBackendCreateBody({ affectedSections, sourceModule: _sourceModule, requestedFrom, requestedTo, ...rest }: CreateStreetClosureRequestInput) {
  return {
    ...rest,
    requestedFrom: withArgentinaOffset(requestedFrom),
    requestedTo: withArgentinaOffset(requestedTo),
    sections: affectedSections,
  };
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (!scenario.capabilities.includes("streetClosureRequest:create")) {
      return errorResponse(403, "Su rol no permite crear solicitudes de corte de calle.", path, FORBIDDEN_CODES.roleRequired);
    }
    const parsed = await parseJsonBody(request, createStreetClosureRequestInputSchema, path);
    if (parsed instanceof Response) return parsed;

    if (session && backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/street-closure-requests", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toBackendCreateBody(parsed.data)),
      });
      return forwardResponse(backendResponse);
    }

    const source = parsed.data.sourceType === "SERVICE"
      ? serviceFixtures.find((candidate) => candidate.id === parsed.data.sourceId)
      : getTreeInterventionFixture(parsed.data.sourceId);
    if (!source) {
      return errorResponse(
        404,
        parsed.data.sourceType === "SERVICE"
          ? `Servicio ${parsed.data.sourceId} no encontrado.`
          : `Intervención de arbolado ${parsed.data.sourceId} no encontrada.`,
        path,
      );
    }
    if (parsed.data.sourceType === "TREE_INTERVENTION" && source.status !== "AUTHORIZED") {
      return errorResponse(
        409,
        "Solo se puede solicitar un corte de calle desde una intervención de arbolado autorizada.",
        path,
      );
    }
    const created = createStreetClosureRequestFixture(parsed.data, source);
    addStreetClosureRequestFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo crear la solicitud de corte de calle.");
  }
}
