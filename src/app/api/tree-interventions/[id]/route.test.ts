import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { addTreeInterventionFixture, resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import type { TreeInterventionType } from "@/lib/tree-interventions";
import { GET } from "./route";
import { POST as authorize } from "./authorize/route";
import { POST as reject } from "./reject/route";
import { POST as submitForAuthorization } from "./submit-for-authorization/route";
import { POST as assignService } from "./assign-service/route";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { loginAs } from "@/test/session";

beforeEach(() => {
  resetTreeInterventionFixtures();
  resetServiceFixtures();
});
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



function transitionRequest(id: string, action: string, cookie: string, body?: unknown) {
  return new Request(`http://localhost/api/tree-interventions/${id}/${action}`, {
    method: "POST",
    headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/tree-interventions/[id]", () => {
  it("forwards backend intervention detail with the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "intervention-backend-1" }));

    const response = await GET(new Request("http://localhost/api/tree-interventions/intervention-backend-1", { headers: { cookie } }), {
      params: Promise.resolve({ id: "intervention-backend-1" }),
    });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/tree-interventions/intervention-backend-1");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it("forwards backend intervention transitions with their action paths and bodies", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ status: "PENDING_AUTHORIZATION" }))
      .mockResolvedValueOnce(Response.json({ status: "AUTHORIZED" }))
      .mockResolvedValueOnce(Response.json({ status: "REJECTED" }));
    const context = { params: Promise.resolve({ id: "intervention-backend-1" }) };

    const submitted = await submitForAuthorization(transitionRequest("intervention-backend-1", "submit-for-authorization", cookie), context);
    const authorized = await authorize(transitionRequest("intervention-backend-1", "authorize", cookie, { authorizedByUserId: "user-lucia" }), context);
    const rejected = await reject(transitionRequest("intervention-backend-1", "reject", cookie), context);

    expect([submitted.status, authorized.status, rejected.status]).toEqual([200, 200, 200]);
    expect(backendFetch.mock.calls.map(([url, init]) => [String(url), init?.method, init?.body])).toEqual([
      ["https://backend.internal/tree-interventions/intervention-backend-1/submit-for-authorization", "POST", undefined],
      ["https://backend.internal/tree-interventions/intervention-backend-1/authorize", "POST", JSON.stringify({ authorizedByUserId: "user-lucia" })],
      ["https://backend.internal/tree-interventions/intervention-backend-1/reject", "POST", undefined],
    ]);
    expect(backendFetch.mock.calls.every(([, init]) =>
      new Headers(init?.headers).get("authorization") === `Bearer ${devJwt}`,
    )).toBe(true);
  });

  it("forwards backend service assignment with the validated body and bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const input = { serviceId: "SVC-1043" };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "intervention-backend-1", ...input }));

    const response = await assignService(transitionRequest("intervention-backend-1", "assign-service", cookie, input), {
      params: Promise.resolve({ id: "intervention-backend-1" }),
    });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/tree-interventions/intervention-backend-1/assign-service");
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual(input);
  });

  it("returns detail with every linked tree", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/tree-interventions/intervention-1", { headers: { cookie } }), { params: Promise.resolve({ id: "intervention-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.treeIds).toEqual(["tree-2", "tree-4"]);
    expect(body.trees).toHaveLength(2);
    expect(body.trees.map((tree: { id: string }) => tree.id)).toEqual(["tree-2", "tree-4"]);
  });

  it("returns not found for an unknown intervention", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/tree-interventions/missing", { headers: { cookie } }), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("moves a removal through pending authorization and records the authoritative decision", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const invalidRemoval = await authorize(
      transitionRequest("intervention-3", "authorize", officeCookie, { authorizedByUserId: "user-lucia" }),
      { params: Promise.resolve({ id: "intervention-3" }) },
    );
    expect(invalidRemoval.status).toBe(409);

    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" }, body: JSON.stringify({ scenarioId: "field-crew-member-route" }) }));
    const fieldCookie = loginResponse.headers.get("set-cookie") ?? "";
    const forbidden = await authorize(
      transitionRequest("intervention-1", "authorize", fieldCookie, { authorizedByUserId: "user-sofia" }),
      { params: Promise.resolve({ id: "intervention-1" }) },
    );
    expect(forbidden.status).toBe(403);
  });

  it("links an authorized intervention to a POINT Service", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await assignService(
      transitionRequest("intervention-2", "assign-service", cookie, { serviceId: "SVC-1043" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "intervention-2", status: "AUTHORIZED", serviceId: "SVC-1043" });
  });

  it("gates linking by authorization, POINT mode and the unique existing link", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });

    const unauthorized = await assignService(
      transitionRequest("intervention-1", "assign-service", cookie, { serviceId: "SVC-1043" }),
      { params: Promise.resolve({ id: "intervention-1" }) },
    );
    expect(unauthorized.status).toBe(409);

    const wrongMode = await assignService(
      transitionRequest("intervention-2", "assign-service", cookie, { serviceId: "SVC-1042" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );
    expect(wrongMode.status).toBe(400);

    const linked = await assignService(
      transitionRequest("intervention-2", "assign-service", cookie, { serviceId: "SVC-1043" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );
    expect(linked.status).toBe(200);

    const duplicate = await assignService(
      transitionRequest("intervention-2", "assign-service", cookie, { serviceId: "SVC-1062" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );
    expect(duplicate.status).toBe(409);
  });

  it("denies service linking to an Office session without service scheduling capability and to Field", async () => {
    const limitedCookie = await loginAs("office-limited-intake", { mode: "mock" });
    const limited = await assignService(
      transitionRequest("intervention-2", "assign-service", limitedCookie, { serviceId: "SVC-1043" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );
    expect(limited.status).toBe(403);

    const fieldLogin = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ scenarioId: "field-crew-member-route" }),
    }));
    const fieldCookie = fieldLogin.headers.get("set-cookie") ?? "";
    const field = await assignService(
      transitionRequest("intervention-2", "assign-service", fieldCookie, { serviceId: "SVC-1043" }),
      { params: Promise.resolve({ id: "intervention-2" }) },
    );
    expect(field.status).toBe(403);
  });
});
