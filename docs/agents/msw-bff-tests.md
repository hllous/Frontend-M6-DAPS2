# MSW and BFF route tests

Use Node MSW handlers to call migrated Next.js route exports in component tests. Keep browser handlers free of server route imports.

For each domain migration:

1. Remove that domain's handwritten `http.*` handlers from `src/mocks/handlers.shared.ts`.
2. Add a Node-only handler module: a short declarative list of routes passed to `routeHandlers(fallbackCookie, routes)` from `src/mocks/route-handlers.ts`. Each entry is `{ method, path, route, params? }`; `params` maps the route's dynamic param name to the MSW path param (`{ id: "serviceTypeId" }`). The helper calls the route export with the intercepted `Request` and those params.
3. Compose those handlers in `src/mocks/handlers.ts`. The `fallbackCookie` (signed, from `src/test/session.ts`) is the actor of that handler set and is added only when the request has no session cookie, so pass a Field crew cookie to build a Field-crew set; a request's own cookie always wins, which is how authorization tests send their actor.
4. Keep `src/mocks/browser.ts` on `handlers.shared.ts`. With `onUnhandledRequest: "bypass"`, migrated browser requests reach the real BFF route instead of importing server modules into the service worker.
5. Keep route and mock behavior on the same fixture module in mock mode.

`src/mocks/service-type-route-handlers.ts` is the reference implementation for this pattern.
