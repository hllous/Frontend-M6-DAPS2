import { backendMode, authorize, errorResponse, mapSessionError } from "@/lib/bff-route";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { outboxEventSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { getOutboxFixture, retryOutboxFixture } from "@/mocks/integration-monitor-fixtures";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = authorize(request, {
      capability: "integrationMonitor:manage",
      fallbackMessage: "No se pudo reintentar el evento.",
      throwOnError: true,
    });
    const { id } = await context.params;
    if (!outboxEventSchema.shape.id.safeParse(id).success) {
      return noStore(errorResponse(400, "El identificador del evento no es válido.", path));
    }

    if (backendMode(session)) {
      const response = await fetchBackend(
        request,
        `/events/outbox/${pathId(id)}/retry`,
        "integrationMonitor:manage",
        { method: "POST", cache: "no-store" },
      );
      return validatedBackendResponse(response, outboxEventSchema, path, "La respuesta del reintento no respeta el contrato documentado.");
    }

    const current = getOutboxFixture(id);
    if (!current) return noStore(errorResponse(404, "No se encontró el evento saliente.", path));
    if (current.status !== "FAILED") {
      return noStore(errorResponse(409, "El evento ya no está fallido o cambió durante el reintento.", path));
    }
    const updated = retryOutboxFixture(id, scenario.actor.userId);
    return updated ? jsonNoStore(outboxEventSchema.parse(updated)) : noStore(errorResponse(409, "El evento ya cambió durante el reintento.", path));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudo reintentar el evento."));
  }
}
