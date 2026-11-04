import { backendMode, backendQuery, authorize, mapSessionError } from "@/lib/bff-route";

import { fetchBackend } from "@/lib/bff-backend";
import { outboxPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseOutboxQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listOutboxFixtures } from "@/mocks/integration-monitor-fixtures";

const BACKEND_QUERY_KEYS = ["status", "eventType", "from", "to", "page", "pageSize"] as const;

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, {
      capability: "integrationMonitor:view",
      fallbackMessage: "No se pudieron cargar los eventos salientes.",
      throwOnError: true,
    });
    const parsedQuery = parseOutboxQuery(new URL(request.url));
    if (!parsedQuery.success) return invalidQueryResponse(path, "Los filtros de eventos salientes no son válidos.");

    if (backendMode(session)) {
      const response = await fetchBackend(
        request,
        `/events/outbox${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`,
        "integrationMonitor:view",
        { cache: "no-store" },
      );
      return validatedBackendResponse(response, outboxPageSchema, path, "No se pudo obtener información válida de eventos salientes. Reintente en unos segundos.");
    }

    return jsonNoStore(outboxPageSchema.parse(listOutboxFixtures(parsedQuery.data)));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudieron cargar los eventos salientes."));
  }
}
