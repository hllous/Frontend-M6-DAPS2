import { http } from "msw";

import { GET as getPublicGreenPoints } from "@/app/api/public/green-points/route";
import { GET as getPublicReport } from "@/app/api/public/reports/[ticketId]/route";
import { GET as getPublicServices } from "@/app/api/public/services/route";
import { GET as getPublicZones } from "@/app/api/public/zones/route";

/**
 * Handlers Node de la sección pública. A diferencia de los demás dominios no reciben cookie de
 * respaldo: las rutas públicas no tienen sesión y los tests no deben dársela.
 */
export function publicRouteHandlers() {
  return [
    http.get("*/api/public/reports/:ticketId", ({ params, request }) =>
      getPublicReport(request, { params: Promise.resolve({ ticketId: String(params.ticketId) }) })),
    http.get("*/api/public/green-points", ({ request }) => getPublicGreenPoints(request)),
    http.get("*/api/public/zones", ({ request }) => getPublicZones(request)),
    http.get("*/api/public/services", ({ request }) => getPublicServices(request)),
  ];
}
