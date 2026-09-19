import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getTreeInterventionFixture, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import {
  treeInterventionAssignServiceInputSchema,
  type TreeInterventionAssignServiceInput,
} from "@/lib/tree-interventions";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
  requireCapability,
} from "@/lib/session";

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
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

async function backendAssignService(
  request: Request,
  id: string,
  input: TreeInterventionAssignServiceInput,
) {
  const response = await fetchBackend(
    request,
    `/tree-interventions/${encodeURIComponent(id)}/assign-service`,
    "service:schedule",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede programar y asociar un servicio.", path);
    }
    if (!scenario.capabilities.includes("service:schedule")) {
      return errorResponse(403, "La sesión no tiene capacidad para programar servicios.", path);
    }
    requireCapability(session, "service:schedule");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }
    const parsed = treeInterventionAssignServiceInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      return backendAssignService(request, id, parsed.data);
    }

    const intervention = getTreeInterventionFixture(id);
    if (!intervention) return errorResponse(404, `Intervención de arbolado ${id} no encontrada.`, path);
    if (intervention.status !== "AUTHORIZED") {
      return errorResponse(409, "Solo se puede asociar un servicio a una intervención autorizada.", path);
    }
    if (intervention.serviceId) {
      return errorResponse(409, "La intervención ya tiene un servicio asociado.", path);
    }

    const service = serviceFixtures.find((candidate) => candidate.id === parsed.data.serviceId);
    if (!service) return errorResponse(404, `Servicio ${parsed.data.serviceId} no encontrado.`, path);
    if (service.mode !== "POINT") {
      return errorResponse(400, "El servicio de una intervención de arbolado debe ser de modo POINT.", path);
    }

    return NextResponse.json(updateTreeInterventionFixture(id, { serviceId: service.id }), { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo asociar el servicio a la intervención.", path);
  }
}
