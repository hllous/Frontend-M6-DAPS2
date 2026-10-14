import { backendMode, errorResponse, mapSessionError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import type { ZoneReferenceReport } from "@/lib/zones";

import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getZoneFixture, getZoneReferences } from "@/lib/zones-fixtures";





async function targetId(context: { params: Promise<{ id: string }> }) {
  const resolved = await context.params;
  return resolved.id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const id = await targetId(context);

    if (backendMode(session)) {
      const detail = await fetchBackend(request, `/zones/${pathId(id)}`);
      if (detail.status === 404) return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
      if (!detail.ok) throw new AuthUnavailableError("No se pudo consultar la zona.");
      z.object({ id: z.literal(id) }).parse(await detail.json());

      const routesPageSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name: z.string(), active: z.boolean(),
          stops: z.array(z.object({ zoneId: z.string() })),
        })),
        meta: z.object({ totalPages: z.number().int().nonnegative() }),
      });
      const activeRoutes: ZoneReferenceReport["activeRoutes"] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await fetchBackend(request, `/routes?active=true&page=${page}&pageSize=100`);
        if (!response.ok) throw new AuthUnavailableError("No se pudieron verificar los recorridos.");
        const payload = routesPageSchema.parse(await response.json());
        totalPages = payload.meta.totalPages;
        activeRoutes.push(...payload.data
          .filter((route) => route.active && route.stops.some((stop) => stop.zoneId === id))
          .map(({ id: routeId, code, name }) => ({ id: routeId, code, name })));
        page += 1;
      } while (page <= totalPages);

      const countSchema = z.object({ meta: z.object({ total: z.number().int().nonnegative() }) });
      async function count(resource: string) {
        const query = new URLSearchParams({ zoneId: id, pageSize: "1" });
        const response = await fetchBackend(request, `/${resource}?${query}`);
        if (!response.ok) throw new AuthUnavailableError("No se pudieron verificar los elementos de la zona.");
        return countSchema.parse(await response.json()).meta.total;
      }
      const containersCount = await count("containers");
      const treesCount = await count("trees");
      const greenSpacesCount = await count("green-spaces");
      return NextResponse.json({
        zoneId: id, activeRoutes, containersCount, treesCount, greenSpacesCount,
        totalReferences: activeRoutes.length + containersCount + treesCount + greenSpacesCount,
      });
    }

    const zone = getZoneFixture(id);
    if (!zone) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    const report = getZoneReferences(id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudieron verificar las referencias de la zona.");
  }
}
