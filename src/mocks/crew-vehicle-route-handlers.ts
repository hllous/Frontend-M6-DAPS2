import { GET as listCrews, POST as createCrew } from "@/app/api/crews/route";
import { DELETE as deleteCrew, GET as getCrew, PATCH as updateCrew } from "@/app/api/crews/[id]/route";
import { POST as addCrewMembers } from "@/app/api/crews/[id]/members/route";
import { DELETE as removeCrewMember } from "@/app/api/crews/[id]/members/[userId]/route";
import { GET as listVehicles, POST as createVehicle } from "@/app/api/vehicles/route";
import { DELETE as deleteVehicle, GET as getVehicle, PATCH as updateVehicle } from "@/app/api/vehicles/[id]/route";
import { GET as listServiceFrequencies, POST as createServiceFrequency } from "@/app/api/service-frequencies/route";
import {
  DELETE as closeServiceFrequency,
  GET as getServiceFrequency,
  PATCH as updateServiceFrequency,
} from "@/app/api/service-frequencies/[id]/route";

import { routeHandlers } from "./route-handlers";

const byCrewId = { id: "crewId" };
const byVehicleId = { id: "vehicleId" };
const byFrequencyId = { id: "serviceFrequencyId" };

export function crewVehicleRouteHandlers(fallbackCookie: string) {
  return routeHandlers(fallbackCookie, [
    { method: "get", path: "*/api/crews", route: listCrews },
    { method: "get", path: "*/api/crews/:crewId", route: getCrew, params: byCrewId },
    { method: "post", path: "*/api/crews", route: createCrew },
    { method: "patch", path: "*/api/crews/:crewId", route: updateCrew, params: byCrewId },
    { method: "delete", path: "*/api/crews/:crewId", route: deleteCrew, params: byCrewId },
    { method: "post", path: "*/api/crews/:crewId/members", route: addCrewMembers, params: byCrewId },
    {
      method: "delete",
      path: "*/api/crews/:crewId/members/:userId",
      route: removeCrewMember,
      params: { id: "crewId", userId: "userId" },
    },
    { method: "get", path: "*/api/vehicles", route: listVehicles },
    { method: "get", path: "*/api/vehicles/:vehicleId", route: getVehicle, params: byVehicleId },
    { method: "post", path: "*/api/vehicles", route: createVehicle },
    { method: "patch", path: "*/api/vehicles/:vehicleId", route: updateVehicle, params: byVehicleId },
    { method: "delete", path: "*/api/vehicles/:vehicleId", route: deleteVehicle, params: byVehicleId },
    { method: "get", path: "*/api/service-frequencies", route: listServiceFrequencies },
    { method: "get", path: "*/api/service-frequencies/:serviceFrequencyId", route: getServiceFrequency, params: byFrequencyId },
    { method: "post", path: "*/api/service-frequencies", route: createServiceFrequency },
    { method: "patch", path: "*/api/service-frequencies/:serviceFrequencyId", route: updateServiceFrequency, params: byFrequencyId },
    { method: "delete", path: "*/api/service-frequencies/:serviceFrequencyId", route: closeServiceFrequency, params: byFrequencyId },
  ]);
}
