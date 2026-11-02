import { POST as login } from "@/app/api/session/login/route";

import { routeHandlers } from "./route-handlers";

export function sessionRouteHandlers() {
  return routeHandlers("", [
    { method: "post", path: "http://localhost/api/session/login", route: login },
  ]);
}
