import { GET as listServices, POST as createService } from "@/app/api/services/route";
import { GET as getService } from "@/app/api/services/[id]/route";
import { POST as assignCrew } from "@/app/api/services/[id]/assign-crew/route";
import { POST as cancelService } from "@/app/api/services/[id]/cancel/route";
import { POST as completeService } from "@/app/api/services/[id]/complete/route";
import { POST as confirmReschedule } from "@/app/api/services/[id]/confirm-reschedule/route";
import { POST as rescheduleService } from "@/app/api/services/[id]/reschedule/route";
import { POST as resumeService } from "@/app/api/services/[id]/resume/route";
import { POST as startService } from "@/app/api/services/[id]/start/route";
import { POST as suspendService } from "@/app/api/services/[id]/suspend/route";
import {
  GET as listZoneResults,
  POST as recordZoneResult,
} from "@/app/api/services/[id]/zone-results/route";

import { routeHandlers } from "./route-handlers";

const byId = { id: "serviceId" };

export function serviceRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/services", route: listServices },
    { method: "get", path: "*/api/services/:serviceId", route: getService, params: byId },
    { method: "post", path: "*/api/services", route: createService },
    { method: "post", path: "*/api/services/:serviceId/assign-crew", route: assignCrew, params: byId },
    { method: "post", path: "*/api/services/:serviceId/start", route: startService, params: byId },
    { method: "post", path: "*/api/services/:serviceId/suspend", route: suspendService, params: byId },
    { method: "post", path: "*/api/services/:serviceId/resume", route: resumeService, params: byId },
    { method: "post", path: "*/api/services/:serviceId/reschedule", route: rescheduleService, params: byId },
    { method: "post", path: "*/api/services/:serviceId/confirm-reschedule", route: confirmReschedule, params: byId },
    { method: "post", path: "*/api/services/:serviceId/cancel", route: cancelService, params: byId },
    { method: "get", path: "*/api/services/:serviceId/zone-results", route: listZoneResults, params: byId },
    { method: "post", path: "*/api/services/:serviceId/zone-results", route: recordZoneResult, params: byId },
    { method: "post", path: "*/api/services/:serviceId/complete", route: completeService, params: byId },
  ]);
}
