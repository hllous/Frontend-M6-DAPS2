// @ts-nocheck
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, reportDamageFixture } from "@/lib/containers-fixtures";
import { reportDamageInputSchema } from "@/lib/containers";
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

    authorize(session, { capability: "container:report", capabilityMessage: "No tiene permisos para reportar daños de contenedores.", throwOnError: true });

    const parsed = await parseJsonBody(request, reportDamageInputSchema, path);
    if (parsed instanceof Response) return parsed;

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/report-damage`, "container:report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
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
        `Solo se puede reportar daño en contenedores activos. Estado actual: ${container.status}`,
        path,
      );
    }

    const updated = reportDamageFixture(id, parsed.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo reportar el daño del contenedor.");
  }
}
