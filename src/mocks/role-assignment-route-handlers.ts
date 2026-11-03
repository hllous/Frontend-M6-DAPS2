import { GET as list } from "@/app/api/role-assignments/route";
import { GET, PUT, DELETE } from "@/app/api/role-assignments/[userId]/route";
import { routeHandlers } from "./route-handlers";
export function roleAssignmentRouteHandlers(cookie: string) {
  return routeHandlers(cookie, [
    { method: "get", path: "*/api/role-assignments", route: list },
    { method: "get", path: "*/api/role-assignments/:userId", route: GET, params: { userId: "userId" } },
    { method: "put", path: "*/api/role-assignments/:userId", route: PUT, params: { userId: "userId" } },
    { method: "delete", path: "*/api/role-assignments/:userId", route: DELETE, params: { userId: "userId" } },
  ]);
}
