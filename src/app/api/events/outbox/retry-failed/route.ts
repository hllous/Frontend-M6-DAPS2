import { backendMode, authorize, errorResponse, mapSessionError } from "@/lib/bff-route";

import { fetchBackend } from "@/lib/bff-backend";
import { retryFailedInputSchema, retryFailedResponseSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { retryFailedOutboxFixtures } from "@/mocks/integration-monitor-fixtures";

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = authorize(request, {
      capability: "integrationMonitor:manage",
      fallbackMessage: "No se pudieron reintentar los eventos fallidos.",
      throwOnError: true,
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return noStore(errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path));
    }
    const parsedBody = retryFailedInputSchema.safeParse(body);
    if (!parsedBody.success) return noStore(errorResponse(400, "Confirme el reintento e indique un límite entre 1 y 100.", path));

    if (backendMode(session)) {
      const response = await fetchBackend(request, "/events/outbox/retry-failed", "integrationMonitor:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedBody.data),
        cache: "no-store",
      });
      return validatedBackendResponse(response, retryFailedResponseSchema, path, "El resultado del reintento no respeta el contrato documentado.");
    }

    return jsonNoStore(retryFailedResponseSchema.parse(retryFailedOutboxFixtures(parsedBody.data.limit ?? 100, scenario.actor.userId)));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudieron reintentar los eventos fallidos."));
  }
}
