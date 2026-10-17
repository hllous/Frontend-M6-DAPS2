# MSW and BFF route tests

Component tests reach the real Next.js route exports through MSW Node handlers. The browser demo calls the real BFF routes directly. Nothing in `src/mocks` reimplements domain behavior.

## Layout

- `src/mocks/handlers.shared.ts`: session and mock-scenario handlers only (`/api/mock/scenarios`, `/api/session/logout`). Used by the browser worker and by tests. Do not add domain handlers here.
- `src/mocks/<domain>-route-handlers.ts`: one Node-only module per domain, a short declarative list passed to `routeHandlers(fallbackCookie, routes)` from `src/mocks/route-handlers.ts`. Each entry is `{ method, path, route, params? }`; `params` maps the route's dynamic param name to the MSW path param (`{ id: "serviceTypeId" }`). The helper calls the route export with the intercepted `Request` and those params.
- `src/mocks/handlers.ts`: composes the shared handlers and every domain module for Vitest.
- `src/mocks/browser.ts`: stays on `handlers.shared.ts`. With `onUnhandledRequest: "bypass"`, browser requests for domain endpoints reach the real BFF route, so no server-only module is imported into the service worker.

## Sessions

The `fallbackCookie` (signed, from `src/test/session.ts`) is the actor of a domain's handler set and is added only when the request has no session cookie. Pass a Field crew cookie to build a Field-crew set. A request's own cookie always wins, which is how authorization tests send their actor.

## Adding or changing a domain

1. Add the route to the domain's `*-route-handlers.ts` (or create the module and compose it in `handlers.ts`).
2. Keep route and mock behavior on the same fixture module in mock mode.
3. Override a single endpoint in one test with `server.use(http.*(...))`; do not add the override to the shared list.
4. Cover new modules with a `*-route-handlers.test.ts` that calls the handlers through `fetch`.

`src/mocks/service-type-route-handlers.ts` is the reference implementation.
