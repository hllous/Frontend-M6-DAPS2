import { backendMode } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend } from "@/lib/bff-backend";
import { todayInArgentina } from "@/lib/argentina-date";
import { serviceFrequencySchema } from "@/lib/service-frequencies";
import type { RouteReferenceReport } from "@/lib/routes";

import {
  AuthUnavailableError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getRouteFixture, getRouteReferences } from "@/lib/routes-fixtures";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    if (backendMode(session)) {
      const detail = await fetchBackend(request, `/routes/${encodeURIComponent(id)}`);
      if (detail.status === 404) return errorResponse(404, "Recorrido no encontrado.", path);
      if (!detail.ok) throw new AuthUnavailableError("No se pudo consultar el recorrido.");
      z.object({ id: z.literal(id) }).parse(await detail.json());

      const pageSchema = z.object({
        data: z.array(serviceFrequencySchema.extend({ serviceType: z.object({ name: z.string() }).optional() })),
        meta: z.object({ totalPages: z.number().int().nonnegative() }),
      });
      const activeServiceFrequencies: RouteReferenceReport["activeServiceFrequencies"] = [];
      const weekdays = ["", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
      const shifts = { MORNING: "MAÑANA", AFTERNOON: "TARDE", NIGHT: "NOCHE" };
      let page = 1;
      let totalPages = 1;
      do {
        const query = new URLSearchParams({ routeId: id, validOn: todayInArgentina(), page: String(page), pageSize: "100" });
        const response = await fetchBackend(request, `/service-frequencies?${query}`);
        if (!response.ok) throw new AuthUnavailableError("No se pudieron verificar las frecuencias de servicio.");
        const payload = pageSchema.parse(await response.json());
        totalPages = payload.meta.totalPages;
        activeServiceFrequencies.push(...payload.data.map((frequency) => ({
          id: frequency.id,
          serviceTypeName: frequency.serviceType?.name ?? "Tipo de servicio no disponible",
          shift: shifts[frequency.shift],
          weekdays: frequency.weekdays.map((day) => weekdays[day]),
        })));
        page += 1;
      } while (page <= totalPages);
      return NextResponse.json({ routeId: id, activeServiceFrequencies, totalReferences: activeServiceFrequencies.length });
    }

    const route = getRouteFixture(id);
    if (!route) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }

    const report = getRouteReferences(id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudieron obtener las referencias del recorrido.", path);
  }
}
