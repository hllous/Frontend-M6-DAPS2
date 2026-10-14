import { http } from "msw";

import { GET as listServiceTypes, POST as createServiceType } from "@/app/api/service-types/route";
import {
  DELETE as deleteServiceType,
  GET as getServiceType,
  PATCH as updateServiceType,
} from "@/app/api/service-types/[id]/route";
import { AUTH_COOKIE_NAME } from "@/lib/session-config";

function withSession(request: Request, fallbackCookie: string): Request {
  const headers = new Headers(request.headers);
  const hasSession = headers.get("cookie")?.split(";").some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
  if (hasSession) return request;

  const existingCookie = headers.get("cookie");
  headers.set("cookie", existingCookie ? `${existingCookie}; ${fallbackCookie}` : fallbackCookie);
  return new Request(request, { headers });
}

export function serviceTypeRouteHandlers(fallbackCookie: string) {
  return [
    http.get("*/api/service-types", ({ request }) => listServiceTypes(withSession(request, fallbackCookie))),
    http.get("*/api/service-types/:serviceTypeId", ({ params, request }) =>
      getServiceType(withSession(request, fallbackCookie), { params: { id: params.serviceTypeId as string } })),
    http.post("*/api/service-types", ({ request }) => createServiceType(withSession(request, fallbackCookie))),
    http.patch("*/api/service-types/:serviceTypeId", ({ params, request }) =>
      updateServiceType(withSession(request, fallbackCookie), { params: { id: params.serviceTypeId as string } })),
    http.delete("*/api/service-types/:serviceTypeId", ({ params, request }) =>
      deleteServiceType(withSession(request, fallbackCookie), { params: { id: params.serviceTypeId as string } })),
  ];
}
