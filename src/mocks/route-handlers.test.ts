import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { routeHandlers } from "./route-handlers";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function echo(request: Request, context?: { params: Promise<Record<string, string>> }) {
  return Response.json({ cookie: request.headers.get("cookie"), params: await context?.params });
}

const fallback = "m6_session=fallback";

describe("routeHandlers", () => {
  it("adds the fallback session when the request has none", async () => {
    server.use(...routeHandlers(fallback, [{ method: "get", path: "*/api/things", route: echo }]));

    const body = await (await fetch("http://localhost/api/things")).json();

    expect(body.cookie).toBe(fallback);
  });

  it("keeps other cookies and appends the fallback session", async () => {
    server.use(...routeHandlers(fallback, [{ method: "get", path: "*/api/things", route: echo }]));

    const body = await (await fetch("http://localhost/api/things", { headers: { cookie: "theme=dark" } })).json();

    expect(body.cookie).toBe(`theme=dark; ${fallback}`);
  });

  it("keeps the session the request already carries", async () => {
    server.use(...routeHandlers(fallback, [{ method: "get", path: "*/api/things", route: echo }]));

    const body = await (await fetch("http://localhost/api/things", { headers: { cookie: "m6_session=actor" } })).json();

    expect(body.cookie).toBe("m6_session=actor");
  });

  it("forwards MSW path params under the route's own param names", async () => {
    server.use(...routeHandlers(fallback, [
      { method: "patch", path: "*/api/things/:thingId", route: echo, params: { id: "thingId" } },
    ]));

    const body = await (await fetch("http://localhost/api/things/42", { method: "PATCH" })).json();

    expect(body.params).toEqual({ id: "42" });
  });

  it("calls routes without dynamic params with an empty params context", async () => {
    server.use(...routeHandlers(fallback, [{ method: "post", path: "*/api/things", route: echo }]));

    const body = await (await fetch("http://localhost/api/things", { method: "POST" })).json();

    expect(body.params).toEqual({});
  });
});
