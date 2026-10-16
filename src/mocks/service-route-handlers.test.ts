import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { createSessionCookie } from "@/test/session";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetServiceFixtures();
});
afterAll(() => server.close());

function post(path: string, cookie: string, body: unknown = {}) {
  return fetch(`http://localhost${path}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Service MSW handlers delegate to the real BFF routes", () => {
  it("lists and reads services as Office through the route envelope", async () => {
    const list = await fetch("http://localhost/api/services");
    expect(list.status).toBe(200);
    const page = await list.json();
    expect(page.data.length).toBeGreaterThan(0);

    const missing = await fetch("http://localhost/api/services/SVC-NOPE");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ statusCode: 404, error: "Not Found" });
  });

  it("returns the real 403 when a Field crew creates a service", async () => {
    const fieldCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const response = await post("/api/services", fieldCookie, {});

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ statusCode: 403, error: "Forbidden", path: "/api/services" });
  });

  it("returns the real 403 when Office records a zone result or completes a service", async () => {
    const officeCookie = createSessionCookie("office-duty-queue", { mode: "mock" });

    const zoneResult = await post("/api/services/SVC-1112/zone-results", officeCookie, {});
    expect(zoneResult.status).toBe(403);
    expect(await zoneResult.json()).toMatchObject({ statusCode: 403, error: "Forbidden" });

    const complete = await post("/api/services/SVC-1112/complete", officeCookie);
    expect(complete.status).toBe(403);
  });
});
