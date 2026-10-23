import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { resetGreenSpaceFixtures } from "@/lib/green-space-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";

const server = setupServer(...handlers);

const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const limitedOfficeCookie = createSessionCookie("office-limited-intake", { mode: "mock" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetTreeFixtures();
  resetTreeSurveyFixtures();
  resetTreeInterventionFixtures();
  resetGreenSpaceFixtures();
  resetGreenPointFixtures();
});
afterAll(() => server.close());

function call(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : SESSION_MUTATION_HEADERS), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("tree, green space and green point handlers delegate to the real BFF routes", () => {
  it.each([
    ["HIGH", ["intervention-1"]],
    ["MEDIUM", ["intervention-2"]],
    ["CRITICAL", ["intervention-3"]],
    ["LOW", []],
  ])("filters intervention priority %s before pagination", async (priority, ids) => {
    const list = await (await call("GET", `/api/tree-interventions?priority=${priority}&pageSize=1`)).json();
    expect(list.data.map((item: { id: string }) => item.id)).toEqual(ids);
    expect(list.meta.total).toBe(ids.length);
  });

  it("combines intervention priority with type and status", async () => {
    const list = await (await call("GET", "/api/tree-interventions?priority=HIGH&interventionType=REMOVAL&status=REQUESTED")).json();
    expect(list.data).toEqual([]);
    expect(list.meta.total).toBe(0);
    const all = await (await call("GET", "/api/tree-interventions")).json();
    expect(all.meta.total).toBe(3);
  });

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

  it("walks a removal through submit, authorize and assign-service with the real transitions", async () => {
    const submitted = await call("POST", "/api/tree-interventions/intervention-3/submit-for-authorization");
    expect(await submitted.json()).toMatchObject({ status: "PENDING_AUTHORIZATION" });

    // El autorizante sale de la sesión; un authorizedByUserId en el cuerpo se ignora (Backend #161).
    const authorized = await call("POST", "/api/tree-interventions/intervention-3/authorize", undefined, { authorizedByUserId: "user-carlos" });
    expect(await authorized.json()).toMatchObject({ status: "AUTHORIZED", authorizedByUserId: "user-lucia" });

    const pointService = serviceFixtures.find((service) => service.mode === "POINT");
    const assigned = await call("POST", "/api/tree-interventions/intervention-3/assign-service", undefined, { serviceId: pointService?.id });
    expect(await assigned.json()).toMatchObject({ serviceId: pointService?.id });
  });

  it("rejects a pending removal and answers a real 409 when it is not pending", async () => {
    await call("POST", "/api/tree-interventions/intervention-3/submit-for-authorization");

    const rejected = await call("POST", "/api/tree-interventions/intervention-3/reject");
    expect(await rejected.json()).toMatchObject({ status: "REJECTED" });
    expect((await call("POST", "/api/tree-interventions/intervention-3/reject")).status).toBe(409);
  });

  it("creates a tree intervention and answers a real 400 for an invalid payload", async () => {
    expect((await call("POST", "/api/tree-interventions", undefined, {})).status).toBe(400);
    const created = await call("POST", "/api/tree-interventions", undefined, {
      interventionType: "TREATMENT",
      treeIds: ["tree-1"],
      address: "Av. Mitre 1140",
      requiresStreetClosure: false,
      priority: "LOW",
    });
    expect(created.status).toBe(201);
  });

  it("updates and deactivates a tree, a green space and a green point", async () => {
    const tree = (await (await call("GET", "/api/trees")).json()).data[0];
    const space = (await (await call("GET", "/api/green-spaces")).json()).data[0];
    const point = (await (await call("GET", "/api/green-points")).json()).data[0];

    expect((await call("PATCH", `/api/trees/${tree.id}`, undefined, { species: "Jacarandá" })).status).toBe(200);
    expect((await call("DELETE", `/api/trees/${tree.id}`)).status).toBeLessThan(300);
    expect((await call("PATCH", `/api/green-spaces/${space.id}`, undefined, { name: "Plaza renovada" })).status).toBe(200);
    expect((await call("DELETE", `/api/green-spaces/${space.id}`)).status).toBeLessThan(300);
    expect((await call("PATCH", `/api/green-points/${point.id}`, undefined, { name: "Punto renovado" })).status).toBe(200);
    expect((await call("DELETE", `/api/green-points/${point.id}`)).status).toBeLessThan(300);
  });
});
