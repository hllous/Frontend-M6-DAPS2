import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTreeInterventionFixtures, treeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => { vi.restoreAllMocks(); delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });



const validInput = {
  interventionType: "SAFETY_PRUNING",
  treeIds: ["tree-2", "tree-4"],
  address: "Parque del Bicentenario, sector norte",
  requiresStreetClosure: true,
  priority: "HIGH",
  justification: "Riesgo registrado en el relevamiento survey-2.",
};

describe("/api/tree-interventions", () => {

  it.each([
    ["?priority=HIGH&status=REQUESTED", "?status=REQUESTED&priority=HIGH"],
    ["?priority=URGENT", ""],
    ["?pageSize=101", "?pageSize=100"],
    ["?page=0&pageSize=abc", "?page=1"],
    ["?status=APPROVED&evil=1", ""],
    ["?status=AUTHORIZED&evil=1", "?status=AUTHORIZED"],
  ])("normalises backend list queries %s", async (query, expected) => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_DEV_JWT = devJwt;
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [], meta: { total: 0 } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const response = await GET(new Request(`http://localhost/tree-interventions${query}`, { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/tree-interventions${expected}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it("lists filtered requests for any authenticated actor", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/tree-interventions?interventionType=SAFETY_PRUNING&status=REQUESTED&pageSize=10", { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: "intervention-1", treeIds: ["tree-2", "tree-4"], status: "REQUESTED" })]));
  });

  it("allows the request capability to create a multi-tree intervention that starts requested", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ...validInput, status: "REQUESTED", serviceId: null, trees: expect.any(Array) });
    expect(treeInterventionFixtures).toHaveLength(4);
  });

  it("rejects creation without the request capability and removal without justification", async () => {
    const limitedCookie = await loginAs("office-limited-intake", { mode: "mock" });
    const forbidden = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie: limitedCookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }));
    expect(forbidden.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const invalid = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, interventionType: "REMOVAL", justification: undefined }) }));
    expect(invalid.status).toBe(400);
  });

  it("forwards validated backend intervention creation with the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "intervention-backend-1", ...validInput }, { status: 201 }));

    const response = await POST(new Request("http://localhost/api/tree-interventions", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify(validInput),
    }));

    expect(response.status).toBe(201);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/tree-interventions");
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual(validInput);
  });
});
