import { createSessionCookie } from "@/test/session";
import { addressSearchRouteHandlers } from "./address-search-route-handlers";

import { containerRouteHandlers } from "./container-route-handlers";
import { envControlRouteHandlers } from "./env-control-route-handlers";
import { handlers as sharedHandlers } from "./handlers.shared";
import { serviceTypeRouteHandlers } from "./service-type-route-handlers";
import { treeRouteHandlers } from "./tree-route-handlers";
import { crewVehicleRouteHandlers } from "./crew-vehicle-route-handlers";
import { zoneRouteHandlers } from "./zone-route-handlers";
import { publicRouteHandlers } from "./public-route-handlers";
import { serviceRouteHandlers } from "./service-route-handlers";
import { streetRepairRouteHandlers } from "./street-repair-route-handlers";

const officeSessionCookie = createSessionCookie("office-duty-queue", { mode: "mock" });
const fieldCrewSessionCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

export const handlers = [
  ...sharedHandlers,
  ...addressSearchRouteHandlers(fieldCrewSessionCookie),
  ...serviceTypeRouteHandlers(officeSessionCookie),
  ...zoneRouteHandlers(officeSessionCookie),
  ...envControlRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
  ...serviceRouteHandlers(officeSessionCookie),
  ...streetRepairRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
  ...treeRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
  ...containerRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
  ...crewVehicleRouteHandlers(officeSessionCookie),
  ...publicRouteHandlers(),
];
