import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeInterventionFixture, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import {
  treeInterventionAssignServiceInputSchema,
  type TreeInterventionAssignServiceInput,
} from "@/lib/tree-interventions";
import { serviceFixtures } from "@/lib/services-fixtures";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";





async function backendAssignService(
  request: Request,
  id: string,
  input: TreeInterventionAssignServiceInput,
) {
  const response = await fetchBackend(
    request,
    `/tree-interventions/${pathId(id)}/assign-service`,
    "service:schedule",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return forwardResponse(response);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    authorize(session, { office: true, officeMessage: "Solo Oficina puede programar y asociar un servicio.", capability: "service:schedule", capabilityMessage: "La sesión no tiene capacidad para programar servicios.", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }
    const parsed = treeInterventionAssignServiceInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
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
    return mapSessionError(error, path, "No se pudo asociar el servicio a la intervención.");
  }
}
