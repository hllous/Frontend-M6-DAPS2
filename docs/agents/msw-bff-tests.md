# MSW and BFF route tests

Component tests reach the real Next.js route exports through MSW Node handlers. The browser demo calls the real BFF routes directly. No domain behavior is reimplemented in `src/mocks`; the only handwritten handlers are the two session and scenario stubs below, kept as stubs on purpose (the scenario list has no BFF route of its own, and logout is a no-op so tests and the demo never clear the session).

## Delaying a component-test response

Keep delays in a test-specific `server.use` override so the shared and browser handlers stay unchanged. `mockResponseAfter` waits using MSW's delay support, then builds the response:

```ts
import { http, HttpResponse } from "msw";

import { mockResponseAfter } from "@/mocks/delayed-response";

server.use(
  http.get("*/api/service-types", () =>
    mockResponseAfter(350, () => HttpResponse.json({ data: [] })),
  ),
);
```

Here, `server` is the suite's existing `setupServer(...handlers)` instance. Use the route's normal response fixture in place of the empty list when the component needs data after loading.

## Layout

- `src/mocks/handlers.shared.ts`: session and mock-scenario handlers only (`/api/mock/scenarios`, `/api/session/logout`). Used by the browser worker and, through `handlers.ts`, by tests. Do not add domain handlers here.
- `src/mocks/<domain>-route-handlers.ts`: one Node-only module per domain, a short declarative list passed to `routeHandlers(fallbackCookie, routes)` from `src/mocks/route-handlers.ts`. Each entry is `{ method, path, route, params? }`; `params` maps the route's dynamic param name to the MSW path param (`{ id: "serviceTypeId" }`). The helper calls the route export with the intercepted `Request` and those params.
- `src/mocks/handlers.ts`: composes the shared handlers and every domain module for Vitest.
- `src/mocks/browser.ts`: stays on `handlers.shared.ts`. With `onUnhandledRequest: "bypass"` (set in `src/mocks/ensure-worker-started.ts`), browser requests for domain endpoints reach the real BFF route, so no server-only module is imported into the service worker.

## Sessions

The `fallbackCookie` (signed, from `src/test/session.ts`) is the actor of a domain's handler set and is added only when the request has no session cookie. Pass a Field crew cookie to build a Field-crew set. A request's own cookie always wins, which is how authorization tests send their actor.

M6 roles: a scenario's `roles` are the fixture of `GET /me` and its capabilities derive from them (`src/lib/m6-roles.ts`). In `backend-development` the login handler calls `GET /me` first, so tests that log in through the handler use `loginAs` or `loginWithMe` from `src/test/session.ts`: they answer `/me` on the side with the scenario's roles (or the `roles` option) and leave the rest of the test's fetch mock queue untouched. `createSessionCookie` seals a session without any call.

## Adding or changing a domain

1. Add the route to the domain's `*-route-handlers.ts` (or create the module and compose it in `handlers.ts`).
2. Keep route and mock behavior on the same fixture module in mock mode.
3. Override a single endpoint in one test with `server.use(http.*(...))`; do not add the override to the shared list.
4. Cover new modules with a `*-route-handlers.test.ts` that calls the handlers through `fetch` (as the street-repair, tree, container and crew-vehicle modules do).

`src/mocks/service-type-route-handlers.ts` is the reference implementation.
