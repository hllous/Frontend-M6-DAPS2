import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";

const server = setupServer(...handlers);

const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const limitedOfficeCookie = createSessionCookie("office-limited-intake", { mode: "mock" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function call(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : SESSION_MUTATION_HEADERS), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("tree, green space and green point handlers delegate to the real BFF routes", () => {
  it("serves the tree catalog and a real 404 for an unknown tree", async () => {
    const list = await (await call("GET", "/api/trees")).json();
    expect(list.meta.total).toBe(list.data.length);
    expect((await call("GET", "/api/trees/tree-unknown")).status).toBe(404);
  });

  it("rejects a Field crew session creating a tree with the real 403", async () => {
    const response = await call("POST", "/api/trees", crewCookie, {});

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ statusCode: 403 });
  });

  it("registers a tree survey as the Field crew actor and rejects an Office session without the capability", async () => {
    const treeId = (await (await call("GET", "/api/trees")).json()).data[0].id;
    const survey = { surveyedAt: "2026-10-01T10:00:00.000Z", healthStatus: "HEALTHY", riskLevel: "LOW", requiresStreetClosure: false, requiresPublicWorks: false };

    const created = await call("POST", `/api/trees/${treeId}/surveys`, undefined, survey);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ treeId, inspectorId: "field-crew-leader-route" });

    const denied = await call("POST", `/api/trees/${treeId}/surveys`, limitedOfficeCookie, survey);
    expect(denied.status).toBe(403);
  });

  it("rejects a Field crew session authorizing a tree intervention with the real 403", async () => {
    const response = await call("POST", "/api/tree-interventions/any/authorize", crewCookie, { authorizedByUserId: "office-duty-queue" });

    expect(response.status).toBe(403);
  });

  it("rejects a Field crew session creating a green space and a green point with the real 403", async () => {
    expect((await call("POST", "/api/green-spaces", crewCookie, {})).status).toBe(403);
    expect((await call("POST", "/api/green-points", crewCookie, {})).status).toBe(403);
  });

  it("serves the green space and green point lists", async () => {
    expect((await (await call("GET", "/api/green-spaces")).json()).data.length).toBeGreaterThan(0);
    expect((await (await call("GET", "/api/green-points")).json()).data.length).toBeGreaterThan(0);
  });
});
