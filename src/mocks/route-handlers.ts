import { http } from "msw";

import { AUTH_COOKIE_NAME } from "@/lib/session-config";

type RouteContext = { params: Promise<Record<string, string>> };

/** A Next.js route export (`GET`, `POST`, ...) as the BFF defines it. */
type RouteExport = (request: Request, context: any) => Response | Promise<Response>;

export type RouteDefinition = {
  method: "get" | "post" | "put" | "patch" | "delete";
  /** MSW URL pattern, with the dynamic segments named as MSW params. */
  path: string;
  route: RouteExport;
  /** Route param name -> MSW path param name, e.g. `{ id: "serviceTypeId" }`. */
  params?: Record<string, string>;
};

function withSession(request: Request, fallbackCookie: string): Request {
  const headers = new Headers(request.headers);
  const existingCookie = headers.get("cookie");
  const hasSession = existingCookie?.split(";").some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
  if (hasSession) return request;

  headers.set("cookie", existingCookie ? `${existingCookie}; ${fallbackCookie}` : fallbackCookie);
  return new Request(request, { headers });
}

/**
 * Node MSW handlers that delegate to the real BFF route exports. Requests without a session
 * cookie get `fallbackCookie` (the actor of this handler set: Office or Field crew); a cookie the
 * request already carries wins, so authorization tests can send their own actor.
 */
export function routeHandlers(fallbackCookie: string, routes: RouteDefinition[]) {
  return routes.map(({ method, path, route, params: paramMap = {} }) =>
    http[method](path, ({ params, request }) => {
      const routeParams = Object.fromEntries(
        Object.entries(paramMap).map(([routeName, mswName]) => [routeName, params[mswName] as string]),
      );
      const context: RouteContext = { params: Promise.resolve(routeParams) };
      return route(withSession(request, fallbackCookie), context);
    }));
}
