import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";

const server = setupServer(...handlers);

const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const limitedOfficeCookie = createSessionCookie("office-limited-intake", { mode: "mock" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetContainerFixtures();
  resetDisposalSiteFixtures();
});
afterAll(() => server.close());

function call(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : SESSION_MUTATION_HEADERS), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("container handlers delegate to the real BFF routes", () => {
  it("lists and reads the catalog as Office through the route envelope", async () => {
    const list = await call("GET", "/api/containers");
    expect(list.status).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThan(0);

    const missing = await call("GET", "/api/containers/cont-nope");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ statusCode: 404, error: "Not Found" });
  });

  it("runs Office actions through the route state machine", async () => {
    const emptied = await call("POST", "/api/containers/cont-2/empty");
    expect(emptied.status).toBe(200);
    expect(await emptied.json()).toMatchObject({ id: "cont-2", status: "ACTIVE" });

    const conflict = await call("POST", "/api/containers/cont-1/empty");
    expect(conflict.status).toBe(409);
  });

  it("reports overflow as a Field crew and returns the real 403 for Office actions from a crew", async () => {
    const overflow = await call("POST", "/api/containers/cont-1/report-overflow");
    expect(overflow.status).toBe(200);
    expect(await overflow.json()).toMatchObject({ id: "cont-1", status: "OVERFLOWED" });

    for (const action of ["empty", "start-repair", "remove", "relocate"]) {
      const response = await call("POST", `/api/containers/cont-2/${action}`, crewCookie);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ statusCode: 403, error: "Forbidden" });
    }
  });
});

describe("disposal site handlers delegate to the real BFF routes", () => {
  it("lists, creates and deactivates sites as Office", async () => {
    const list = await call("GET", "/api/disposal-sites");
    expect(list.status).toBe(200);
    const [first] = (await list.json()).data;

    const missing = await call("GET", "/api/disposal-sites/ds-nope");
    expect(missing.status).toBe(404);

    const invalid = await call("POST", "/api/disposal-sites", undefined, {});
    expect(invalid.status).toBe(400);

    const deactivated = await call("DELETE", `/api/disposal-sites/${first.id}`);
    expect(deactivated.status).toBe(200);
    expect(await deactivated.json()).toMatchObject({ id: first.id, active: false });
  });

  it("returns the real 403 when a session without disposalSite:manage writes", async () => {
    for (const cookie of [crewCookie, limitedOfficeCookie]) {
      const create = await call("POST", "/api/disposal-sites", cookie, {});
      expect(create.status).toBe(403);
      expect(await create.json()).toMatchObject({ statusCode: 403, error: "Forbidden", path: "/api/disposal-sites" });
    }
  });
});
