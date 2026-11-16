// @ts-nocheck
import { backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { containerFixtures, updateContainerFixture } from "@/lib/containers-fixtures";
import { updateContainerInputSchema } from "@/lib/containers";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";





async function targetId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await targetId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}`);
            return forwardResponse(backendResponse);
    }

    const container = containerFixtures.find((c) => c.id === id);
    if (!container) {
      return errorResponse(404, `Contenedor ${id} no encontrado.`, path);
    }

    return NextResponse.json(container);
  } catch (error) {
    return handleRouteError(error, path, "No se pudo cargar el contenedor.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = await targetId(context);
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    // Permission check: mirror cancel/route.ts inline actor-kind check
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo el rol de Oficina puede gestionar contenedores.", path);
    }

    const parsed = await parseJsonBody(request, updateContainerInputSchema, path);
    if (parsed instanceof Response) return parsed;

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers/${pathId(id)}`, "container:manage", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const existing = containerFixtures.find((c) => c.id === id);
    if (!existing) {
      return errorResponse(404, `Contenedor ${id} no encontrado.`, path);
    }

    // Code and containerType are strictly immutable.
    const updated = updateContainerFixture(id, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, path, "No se pudo actualizar el contenedor.");
  }
}
