import { createSessionCookie } from "@/test/session";

import { envControlRouteHandlers } from "./env-control-route-handlers";
import { handlers as sharedHandlers } from "./handlers.shared";
import { serviceTypeRouteHandlers } from "./service-type-route-handlers";
import { treeRouteHandlers } from "./tree-route-handlers";
import { zoneRouteHandlers } from "./zone-route-handlers";
import { serviceRouteHandlers } from "./service-route-handlers";

const officeSessionCookie = createSessionCookie("office-duty-queue", { mode: "mock" });
const fieldCrewSessionCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

export const handlers = [
  ...sharedHandlers,
  ...serviceTypeRouteHandlers(officeSessionCookie),
  ...zoneRouteHandlers(officeSessionCookie),
  ...envControlRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
  ...serviceRouteHandlers(officeSessionCookie),
  ...treeRouteHandlers(officeSessionCookie, fieldCrewSessionCookie),
];
