# MSW and BFF route tests

Use Node MSW handlers to call migrated Next.js route exports in component tests. Keep browser handlers free of server route imports.

For each domain migration:

1. Remove that domain's handwritten `http.*` handlers from `src/mocks/handlers.shared.ts`.
2. Add a Node-only handler module that calls the exported `GET`, `POST`, `PATCH`, and `DELETE` route functions with the intercepted `Request` and dynamic route params.
3. Compose those handlers in `src/mocks/handlers.ts`. Give tests without a session cookie a signed mock cookie from `src/test/session.ts`; use the actor's own signed cookie when testing authorization.
4. Keep `src/mocks/browser.ts` on `handlers.shared.ts`. With `onUnhandledRequest: "bypass"`, migrated browser requests reach the real BFF route instead of importing server modules into the service worker.
5. Keep route and mock behavior on the same fixture module in mock mode.

The service-type handlers are the reference implementation for this pattern.
