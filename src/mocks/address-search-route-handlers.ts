import { GET } from "@/app/api/address-search/route";
import { GET as SUGGEST } from "@/app/api/address-suggest/route";

import { routeHandlers } from "./route-handlers";

export function addressSearchRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/address-search", route: GET },
    { method: "get", path: "*/api/address-suggest", route: SUGGEST },
  ]);
}
