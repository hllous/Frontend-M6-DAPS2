import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, removeContainerFixture } from "@/lib/containers-fixtures";
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

    authorize(session, { office: true, officeMessage: "No tiene permisos para retirar contenedores.", capability: "container:manage", capabilityMessage: "No tiene permisos para retirar contenedores.", throwOnError: true });

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/remove`, "container:manage", {
        method: "POST",
      });
            return forwardResponse(backendResponse);
    }

    const container = getContainerFixture(id);
    if (!container) return errorResponse(404, `Contenedor ${id} no encontrado.`, path);

    if (container.status !== "DAMAGED") {
      return errorResponse(
        409,
        `Solo se pueden retirar contenedores dañados. Estado actual: ${container.status}`,
        path,
      );
    }

    return NextResponse.json(removeContainerFixture(id), { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo retirar el contenedor.");
  }
}
