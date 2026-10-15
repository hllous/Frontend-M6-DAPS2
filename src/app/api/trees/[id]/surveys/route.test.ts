import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTreeSurveyFixtures, treeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => { vi.restoreAllMocks(); delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });



const validInput = {
  surveyedAt: "2026-09-07T12:00:00.000Z",
  healthStatus: "HEALTHY",
  riskLevel: "LOW",
  requiresStreetClosure: false,
  requiresPublicWorks: false,
  notes: "Copa estable.",
};

describe("/api/trees/[id]/surveys", () => {

  it.each([
    ["?pageSize=101", "?pageSize=100"],
    ["?page=0&pageSize=abc", "?page=1"],
    ["?healthStatus=HEALTHY&evil=1", "?healthStatus=HEALTHY"],
  ])("normalises backend list queries %s", async (query, expected) => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_DEV_JWT = devJwt;
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [], meta: { total: 0 } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const response = await GET(new Request(`http://localhost/trees/abc/surveys${query}`, { headers: { cookie } }), { params: Promise.resolve({ id: "abc" }) });
    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/trees/abc/surveys${expected}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });


  it.each(["GET", "POST"])("uses a valid tree path id for backend %s", async (method) => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_DEV_JWT = devJwt;
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const request = new Request("http://localhost/api/trees/arbol-abc/surveys", { method, headers: { cookie, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify(validInput) } : {}) });
    await (method === "GET" ? GET : POST)(request, { params: Promise.resolve({ id: "arbol-abc" }) });
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/trees/arbol-abc/surveys");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe(method);
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    if (method === "POST") {
      expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json");
      expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual(validInput);
    }
  });

  it("lists newest-first history with documented filters for any authenticated actor", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/trees/tree-2/surveys?healthStatus=WEAKENED&riskLevel=HIGH&pageSize=10", { headers: { cookie } }), { params: Promise.resolve({ id: "tree-2" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0]).toMatchObject({ id: "survey-2", riskLevel: "HIGH" });
    expect(body.meta.pageSize).toBe(10);
  });

  it("allows Field and Office with tree:survey to create an ambient record without a Service", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const fieldResponse = await POST(new Request("http://localhost/api/trees/tree-2/surveys", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }), { params: Promise.resolve({ id: "tree-2" }) });
    expect(fieldResponse.status).toBe(201);
    expect(await fieldResponse.json()).toMatchObject({ treeId: "tree-2", riskLevel: "LOW" });
    expect(treeSurveyFixtures.every((survey) => !("serviceId" in survey))).toBe(true);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const officeResponse = await POST(new Request("http://localhost/api/trees/tree-1/surveys", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, surveyedAt: "2026-09-07T13:00:00.000Z" }) }), { params: Promise.resolve({ id: "tree-1" }) });
    expect(officeResponse.status).toBe(201);
  });

  it("rejects a high-risk submission without riskType at the route boundary", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/trees/tree-2/surveys", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, riskLevel: "CRITICAL" }) }), { params: Promise.resolve({ id: "tree-2" }) });
    expect(response.status).toBe(400);
  });
});
