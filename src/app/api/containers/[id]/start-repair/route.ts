import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, startRepairFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";





async function targetId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await targetId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    authorize(session, { office: true, officeMessage: "No tiene permisos para iniciar reparaciones de contenedores.", capability: "container:manage", capabilityMessage: "No tiene permisos para iniciar reparaciones de contenedores.", throwOnError: true });

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/start-repair`, "container:manage", {
        method: "POST",
      });
            return forwardResponse(backendResponse);
    }

    const container = getContainerFixture(id);
    if (!container) return errorResponse(404, `Contenedor ${id} no encontrado.`, path);

    if (container.status !== "DAMAGED") {
      return errorResponse(
        409,
        `Solo se puede iniciar la reparación de contenedores dañados. Estado actual: ${container.status}`,
        path,
      );
    }

    return NextResponse.json(startRepairFixture(id), { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo iniciar la reparación del contenedor.");
  }
}
