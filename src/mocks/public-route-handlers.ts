import { http } from "msw";

import { GET as getPublicReport } from "@/app/api/public/reports/[ticketId]/route";

/**
 * Handlers Node de la sección pública. A diferencia de los demás dominios no reciben cookie de
 * respaldo: las rutas públicas no tienen sesión y los tests no deben dársela.
 */
export function publicRouteHandlers() {
  return [
    http.get("*/api/public/reports/:ticketId", ({ params, request }) =>
      getPublicReport(request, { params: Promise.resolve({ ticketId: String(params.ticketId) }) })),
  ];
}
