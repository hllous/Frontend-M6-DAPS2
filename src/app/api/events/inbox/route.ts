import { backendMode, backendQuery, authorize, mapSessionError } from "@/lib/bff-route";

import { fetchBackend } from "@/lib/bff-backend";
import { inboxPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseInboxQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listInboxFixtures } from "@/mocks/integration-monitor-fixtures";

const BACKEND_QUERY_KEYS = ["status", "eventType", "sourceModule", "from", "to", "page", "pageSize"] as const;

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, {
      capability: "integrationMonitor:view",
      fallbackMessage: "No se pudieron cargar los eventos recibidos.",
      throwOnError: true,
    });
    const parsedQuery = parseInboxQuery(new URL(request.url));
    if (!parsedQuery.success) return invalidQueryResponse(path, "Los filtros de eventos recibidos no son válidos.");

    if (backendMode(session)) {
      const response = await fetchBackend(
        request,
        `/events/inbox${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`,
        "integrationMonitor:view",
        { cache: "no-store" },
      );
      return validatedBackendResponse(response, inboxPageSchema, path, "No se pudo obtener información válida de eventos recibidos. Reintente en unos segundos.");
    }

    return jsonNoStore(inboxPageSchema.parse(listInboxFixtures(parsedQuery.data)));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudieron cargar los eventos recibidos."));
  }
}
