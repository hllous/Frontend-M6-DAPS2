import { createSessionCookie } from "@/test/session";

import { handlers as sharedHandlers } from "./handlers.shared";
import { serviceTypeRouteHandlers } from "./service-type-route-handlers";

const officeSessionCookie = createSessionCookie("office-duty-queue", { mode: "mock" });

export const handlers = [
  ...sharedHandlers,
  ...serviceTypeRouteHandlers(officeSessionCookie),
];
