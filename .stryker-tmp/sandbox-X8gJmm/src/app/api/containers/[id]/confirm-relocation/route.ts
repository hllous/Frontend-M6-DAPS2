// @ts-nocheck
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, confirmRelocationFixture } from "@/lib/containers-fixtures";
import { confirmRelocationInputSchema } from "@/lib/containers";
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

    authorize(session, { capability: "container:manage", capabilityMessage: "No tiene permisos para confirmar la reubicación de contenedores.", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud debe ser un JSON válido.", path);
    }

    const parsed = confirmRelocationInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}/confirm-relocation`, "container:manage", {
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

    if (container.status !== "RELOCATING") {
      return errorResponse(
        409,
        `Solo se puede confirmar la reubicación en contenedores en estado de reubicación. Estado actual: ${container.status}`,
        path,
      );
    }

    const updated = confirmRelocationFixture(id, parsed.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo confirmar la reubicación del contenedor.");
  }
}
