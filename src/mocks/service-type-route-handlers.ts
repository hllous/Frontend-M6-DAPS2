import { GET as listServiceTypes, POST as createServiceType } from "@/app/api/service-types/route";
import {
  DELETE as deleteServiceType,
  GET as getServiceType,
  PATCH as updateServiceType,
} from "@/app/api/service-types/[id]/route";

import { routeHandlers } from "./route-handlers";

const byId = { id: "serviceTypeId" };

export function serviceTypeRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/service-types", route: listServiceTypes },
    { method: "get", path: "*/api/service-types/:serviceTypeId", route: getServiceType, params: byId },
    { method: "post", path: "*/api/service-types", route: createServiceType },
    { method: "patch", path: "*/api/service-types/:serviceTypeId", route: updateServiceType, params: byId },
    { method: "delete", path: "*/api/service-types/:serviceTypeId", route: deleteServiceType, params: byId },
  ]);
}
