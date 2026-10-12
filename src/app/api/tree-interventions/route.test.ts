import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetTreeInterventionFixtures, treeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => { vi.restoreAllMocks(); delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

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
    ["?pageSize=101", "?pageSize=100"],
    ["?page=0&pageSize=abc", "?page=1"],
    ["?status=APPROVED&evil=1", ""],
    ["?status=AUTHORIZED&evil=1", "?status=AUTHORIZED"],
  ])("normalises backend list queries %s", async (query, expected) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [], meta: { total: 0 } }));
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await GET(new Request(`http://localhost/tree-interventions${query}`, { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/tree-interventions${expected}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
  });

  it("lists filtered requests for any authenticated actor", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/tree-interventions?interventionType=SAFETY_PRUNING&status=REQUESTED&pageSize=10", { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: "intervention-1", treeIds: ["tree-2", "tree-4"], status: "REQUESTED" })]));
  });

  it("allows the request capability to create a multi-tree intervention that starts requested", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ...validInput, status: "REQUESTED", serviceId: null, trees: expect.any(Array) });
    expect(treeInterventionFixtures).toHaveLength(4);
  });

  it("rejects creation without the request capability and removal without justification", async () => {
    const limitedCookie = await authenticatedCookie("office-limited-intake");
    const forbidden = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie: limitedCookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }));
    expect(forbidden.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const invalid = await POST(new Request("http://localhost/api/tree-interventions", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, interventionType: "REMOVAL", justification: undefined }) }));
    expect(invalid.status).toBe(400);
  });
});
