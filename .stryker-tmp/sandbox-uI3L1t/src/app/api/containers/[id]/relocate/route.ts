// @ts-nocheck
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, startRelocationFixture } from "@/lib/containers-fixtures";
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

    authorize(session, { capability: "container:manage", capabilityMessage: "No tiene permisos para reubicar contenedores.", throwOnError: true });

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/relocate`, "container:manage", {
        method: "POST",
      });
            return forwardResponse(backendResponse);
    }

    const container = getContainerFixture(id);
    if (!container) {
      return errorResponse(404, `Contenedor ${id} no encontrado.`, path);
    }

    if (container.status !== "ACTIVE") {
      return errorResponse(
        409,
        `Solo se puede iniciar la reubicación en contenedores activos. Estado actual: ${container.status}`,
        path,
      );
    }

    const updated = startRelocationFixture(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo iniciar la reubicación del contenedor.");
  }
}
