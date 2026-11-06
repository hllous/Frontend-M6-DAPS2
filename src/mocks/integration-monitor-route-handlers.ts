import { GET as getAudit } from "@/app/api/audit/route";
import { GET as getInbox } from "@/app/api/events/inbox/route";
import { GET as getOutbox, } from "@/app/api/events/outbox/route";
import { GET as getOutboxDetail } from "@/app/api/events/outbox/[id]/route";
import { POST as retryOutboxEvent } from "@/app/api/events/outbox/[id]/retry/route";
import { POST as retryFailedOutbox } from "@/app/api/events/outbox/retry-failed/route";

import { routeHandlers } from "./route-handlers";

export function integrationMonitorRouteHandlers(officeCookie: string) {
  return routeHandlers(officeCookie, [
    { method: "get", path: "*/api/events/outbox", route: getOutbox },
    { method: "get", path: "*/api/events/outbox/:id", route: getOutboxDetail, params: { id: "id" } },
    { method: "post", path: "*/api/events/outbox/:id/retry", route: retryOutboxEvent, params: { id: "id" } },
    { method: "post", path: "*/api/events/outbox/retry-failed", route: retryFailedOutbox },
    { method: "get", path: "*/api/events/inbox", route: getInbox },
    { method: "get", path: "*/api/audit", route: getAudit },
  ]);
}
