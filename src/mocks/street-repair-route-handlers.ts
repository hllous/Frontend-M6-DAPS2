import { GET as listStreetClosureRequests, POST as createStreetClosureRequest } from "@/app/api/street-closure-requests/route";
import { GET as getStreetClosureRequest } from "@/app/api/street-closure-requests/[id]/route";
import { POST as approveStreetClosureRequest } from "@/app/api/street-closure-requests/[id]/approve/route";
import { POST as rejectStreetClosureRequest } from "@/app/api/street-closure-requests/[id]/reject/route";
import { POST as endStreetClosureRequest } from "@/app/api/street-closure-requests/[id]/end/route";
import { GET as listRepairRequests, POST as createRepairRequest } from "@/app/api/repair-requests/route";
import { GET as getRepairRequest } from "@/app/api/repair-requests/[id]/route";
import { POST as startRepairRequest } from "@/app/api/repair-requests/[id]/start/route";
import { POST as closeRepairRequest } from "@/app/api/repair-requests/[id]/close/route";
import { GET as listEvidence, POST as uploadEvidence } from "@/app/api/evidence/route";

import { routeHandlers } from "./route-handlers";

const byRequestId = { id: "requestId" };

/** Office runs street closures, repair-request reads and reconciliation; uploading evidence is a Field crew action and runs as `crewCookie`. */
export function streetRepairRouteHandlers(officeCookie: string, crewCookie: string) {
  return [
    ...routeHandlers(officeCookie, [
      { method: "get", path: "*/api/street-closure-requests", route: listStreetClosureRequests },
      { method: "post", path: "*/api/street-closure-requests", route: createStreetClosureRequest },
      { method: "get", path: "*/api/street-closure-requests/:requestId", route: getStreetClosureRequest, params: byRequestId },
      { method: "post", path: "*/api/street-closure-requests/:requestId/approve", route: approveStreetClosureRequest, params: byRequestId },
      { method: "post", path: "*/api/street-closure-requests/:requestId/reject", route: rejectStreetClosureRequest, params: byRequestId },
      { method: "post", path: "*/api/street-closure-requests/:requestId/end", route: endStreetClosureRequest, params: byRequestId },
      { method: "get", path: "*/api/repair-requests", route: listRepairRequests },
      { method: "post", path: "*/api/repair-requests", route: createRepairRequest },
      { method: "get", path: "*/api/repair-requests/:requestId", route: getRepairRequest, params: byRequestId },
      { method: "post", path: "*/api/repair-requests/:requestId/start", route: startRepairRequest, params: byRequestId },
      { method: "post", path: "*/api/repair-requests/:requestId/close", route: closeRepairRequest, params: byRequestId },
      { method: "get", path: "*/api/evidence", route: listEvidence },
    ]),
    ...routeHandlers(crewCookie, [
      { method: "post", path: "*/api/evidence", route: uploadEvidence },
    ]),
  ];
}
