import { GET as listZones, POST as createZone } from "@/app/api/zones/route";
import { DELETE as deleteZone, GET as getZone, PATCH as updateZone } from "@/app/api/zones/[id]/route";
import { POST as assignNeighborhoods } from "@/app/api/zones/[id]/neighborhoods/route";
import { DELETE as removeNeighborhood } from "@/app/api/zones/[id]/neighborhoods/[neighborhoodId]/route";
import { GET as getZoneReferences } from "@/app/api/zones/[id]/references/route";
import { GET as listRoutes, POST as createRoute } from "@/app/api/routes/route";
import { DELETE as deleteRoute, GET as getRoute, PATCH as updateRoute } from "@/app/api/routes/[id]/route";
import { GET as getRouteReferences } from "@/app/api/routes/[id]/references/route";
import { PUT as setRouteStops } from "@/app/api/routes/[id]/stops/route";

import { routeHandlers } from "./route-handlers";

const byZoneId = { id: "zoneId" };
const byRouteId = { id: "routeId" };

export function zoneRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/zones", route: listZones },
    { method: "get", path: "*/api/zones/:zoneId", route: getZone, params: byZoneId },
    { method: "post", path: "*/api/zones", route: createZone },
    { method: "patch", path: "*/api/zones/:zoneId", route: updateZone, params: byZoneId },
    { method: "delete", path: "*/api/zones/:zoneId", route: deleteZone, params: byZoneId },
    { method: "post", path: "*/api/zones/:zoneId/neighborhoods", route: assignNeighborhoods, params: byZoneId },
    {
      method: "delete",
      path: "*/api/zones/:zoneId/neighborhoods/:neighborhoodId",
      route: removeNeighborhood,
      params: { id: "zoneId", neighborhoodId: "neighborhoodId" },
    },
    { method: "get", path: "*/api/zones/:zoneId/references", route: getZoneReferences, params: byZoneId },
    { method: "get", path: "*/api/routes", route: listRoutes },
    { method: "get", path: "*/api/routes/:routeId", route: getRoute, params: byRouteId },
    { method: "post", path: "*/api/routes", route: createRoute },
    { method: "patch", path: "*/api/routes/:routeId", route: updateRoute, params: byRouteId },
    { method: "delete", path: "*/api/routes/:routeId", route: deleteRoute, params: byRouteId },
    { method: "get", path: "*/api/routes/:routeId/references", route: getRouteReferences, params: byRouteId },
    { method: "put", path: "*/api/routes/:routeId/stops", route: setRouteStops, params: byRouteId },
  ]);
}
