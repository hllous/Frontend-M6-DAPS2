import { backendMode, authorize, errorResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { outboxDetailSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { getOutboxFixture } from "@/mocks/integration-monitor-fixtures";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, {
      capability: "integrationMonitor:manage",
      fallbackMessage: "No se pudo cargar el detalle del evento.",
      throwOnError: true,
    });
    const { id } = await context.params;
    if (!outboxDetailSchema.shape.id.safeParse(id).success) {
      return noStore(errorResponse(400, "El identificador del evento no es válido.", path));
    }

    if (backendMode(session)) {
      const response = await fetchBackend(
        request,
        `/events/outbox/${pathId(id)}`,
        "integrationMonitor:manage",
        { cache: "no-store" },
      );
      return validatedBackendResponse(response, outboxDetailSchema, path, "No se pudo obtener información válida del detalle del evento. Reintente en unos segundos.");
    }

    const detail = getOutboxFixture(id);
    return detail
      ? jsonNoStore(outboxDetailSchema.parse(detail))
      : noStore(errorResponse(404, "No se encontró el evento saliente.", path));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudo cargar el detalle del evento."));
  }
}
