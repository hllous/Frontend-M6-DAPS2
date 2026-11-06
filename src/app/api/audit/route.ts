import { backendMode, backendQuery, authorize, mapSessionError } from "@/lib/bff-route";

import { fetchBackend } from "@/lib/bff-backend";
import { auditPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseAuditQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listAuditFixtures } from "@/mocks/integration-monitor-fixtures";

const BACKEND_QUERY_KEYS = ["entityType", "entityId", "page", "pageSize"] as const;

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, {
      capability: "integrationMonitor:view",
      fallbackMessage: "No se pudo cargar el registro de actividad.",
      throwOnError: true,
    });
    const parsedQuery = parseAuditQuery(new URL(request.url));
    if (!parsedQuery.success) return invalidQueryResponse(path, "Los filtros del registro de actividad no son válidos.");

    if (backendMode(session)) {
      const response = await fetchBackend(
        request,
        `/audit${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`,
        "integrationMonitor:view",
        { cache: "no-store" },
      );
      return validatedBackendResponse(response, auditPageSchema, path, "No se pudo obtener información válida del registro de actividad. Reintente en unos segundos.");
    }

    return jsonNoStore(auditPageSchema.parse(listAuditFixtures(parsedQuery.data)));
  } catch (error) {
    return noStore(mapSessionError(error, path, "No se pudo cargar el registro de actividad."));
  }
}
