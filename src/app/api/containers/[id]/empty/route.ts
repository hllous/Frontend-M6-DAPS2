import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, emptyContainerFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
import { versionedContainer } from "@/lib/bff-mock-versions";





async function targetId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

async function handlePOST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await targetId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    authorize(session, { capability: "container:empty", capabilityMessage: "No tiene permisos para vaciar contenedores.", throwOnError: true });

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/empty`, "container:empty", {
        method: "POST",
      });
            return forwardResponse(backendResponse);
    }

    const container = getContainerFixture(id);
    if (!container) {
      return errorResponse(404, `Contenedor ${id} no encontrado.`, path);
    }

    if (container.status !== "OVERFLOWED") {
      return errorResponse(
        409,
        `Solo se puede vaciar un contenedor en estado desbordado. Estado actual: ${container.status}`,
        path,
      );
    }

    const updated = emptyContainerFixture(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo registrar el vaciado del contenedor.");
  }
}

export const POST = versionedContainer(handlePOST);
