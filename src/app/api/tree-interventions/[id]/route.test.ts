import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { addTreeInterventionFixture, resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import type { TreeInterventionType } from "@/lib/tree-interventions";
import { GET } from "./route";
import { POST as authorize } from "./authorize/route";
import { POST as reject } from "./reject/route";
import { POST as submitForAuthorization } from "./submit-for-authorization/route";

beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie() {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: "office-duty-queue" }) }));
  return response.headers.get("set-cookie") ?? "";
}

function transitionRequest(id: string, action: string, cookie: string, body?: unknown) {
  return new Request(`http://localhost/api/tree-interventions/${id}/${action}`, {
    method: "POST",
    headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/tree-interventions/[id]", () => {
  it("returns detail with every linked tree", async () => {
    const cookie = await authenticatedCookie();
    const response = await GET(new Request("http://localhost/api/tree-interventions/intervention-1", { headers: { cookie } }), { params: Promise.resolve({ id: "intervention-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.treeIds).toEqual(["tree-2", "tree-4"]);
    expect(body.trees).toHaveLength(2);
    expect(body.trees.map((tree: { id: string }) => tree.id)).toEqual(["tree-2", "tree-4"]);
  });

  it("returns not found for an unknown intervention", async () => {
    const cookie = await authenticatedCookie();
    const response = await GET(new Request("http://localhost/api/tree-interventions/missing", { headers: { cookie } }), { params: { id: "missing" } });
    expect(response.status).toBe(404);
  });

  it("moves a removal through pending authorization and records the authoritative decision", async () => {
    const cookie = await authenticatedCookie();
    const pending = await submitForAuthorization(
      transitionRequest("intervention-3", "submit-for-authorization", cookie),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(pending.status).toBe(200);
    expect((await pending.json()).status).toBe("PENDING_AUTHORIZATION");

    const authorized = await authorize(
      transitionRequest("intervention-3", "authorize", cookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(authorized.status).toBe(200);
    expect(await authorized.json()).toMatchObject({
      status: "AUTHORIZED",
      authorizedByUserId: "user-lucia",
      authorizedAt: expect.any(String),
    });
  });

  it("authorizes non-removal interventions directly and rejects an invalid repeat transition", async () => {
    const cookie = await authenticatedCookie();
    const authorized = await authorize(
      transitionRequest("intervention-1", "authorize", cookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id: "intervention-1" }) },
    );
    expect(authorized.status).toBe(200);
    expect((await authorized.json()).status).toBe("AUTHORIZED");

    const repeated = await authorize(
      transitionRequest("intervention-1", "authorize", cookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id: "intervention-1" }) },
    );
    expect(repeated.status).toBe(409);
  });

  it.each([
    "FORMATION_PRUNING",
    "SAFETY_PRUNING",
    "REMOVAL",
    "PLANTING",
    "TREATMENT",
  ] as TreeInterventionType[])("uses the universal authorize action for %s", async (interventionType) => {
    const cookie = await authenticatedCookie();
    const id = `intervention-${interventionType.toLowerCase()}`;
    addTreeInterventionFixture({
      id,
      interventionType,
      treeIds: ["tree-1"],
      address: "Av. de prueba 100",
      requiresStreetClosure: false,
      priority: "MEDIUM",
      status: "REQUESTED",
      serviceId: null,
      justification: interventionType === "REMOVAL" ? "Justificación de prueba." : null,
      authorizedByUserId: null,
      authorizedAt: null,
    });

    if (interventionType === "REMOVAL") {
      const pending = await submitForAuthorization(
        transitionRequest(id, "submit-for-authorization", cookie),
        { params: Promise.resolve({ id }) },
      );
      expect(pending.status).toBe(200);
    }

    const response = await authorize(
      transitionRequest(id, "authorize", cookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      interventionType,
      status: "AUTHORIZED",
      authorizedByUserId: "user-lucia",
      authorizedAt: expect.any(String),
    });
  });

  it("rejects a pending removal terminally without persisting a rejection reason", async () => {
    const cookie = await authenticatedCookie();
    await submitForAuthorization(
      transitionRequest("intervention-3", "submit-for-authorization", cookie),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );

    const rejected = await reject(
      transitionRequest("intervention-3", "reject", cookie),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(rejected.status).toBe(200);
    expect(await rejected.json()).toMatchObject({ status: "REJECTED" });

    const repeated = await reject(
      transitionRequest("intervention-3", "reject", cookie),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(repeated.status).toBe(409);
    const detail = await GET(
      new Request("http://localhost/api/tree-interventions/intervention-3", { headers: { cookie } }),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    const body = await detail.json();
    expect(body).not.toHaveProperty("rejectionReason");
  });

  it("returns backend transition errors and denies Field authorization", async () => {
    const officeCookie = await authenticatedCookie();
    const invalidRemoval = await authorize(
      transitionRequest("intervention-3", "authorize", officeCookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(invalidRemoval.status).toBe(409);

    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: "field-crew-member-route" }) }));
    const fieldCookie = loginResponse.headers.get("set-cookie") ?? "";
    const forbidden = await authorize(
      transitionRequest("intervention-1", "authorize", fieldCookie, { authorizedByUserId: "user-sofia" }),
      { params: Promise.resolve({ id: "intervention-1" }) },
    );
    expect(forbidden.status).toBe(403);
  });
});
