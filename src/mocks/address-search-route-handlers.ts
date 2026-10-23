import { GET } from "@/app/api/address-search/route";

import { routeHandlers } from "./route-handlers";

export function addressSearchRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/address-search", route: GET },
  ]);
}
