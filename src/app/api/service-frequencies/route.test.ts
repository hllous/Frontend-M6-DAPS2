import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { serviceFixtures, resetServiceFixtures } from "@/lib/services-fixtures";
import { resetServiceFrequencyFixtures, serviceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { GET, POST } from "./route";

afterEach(() => {
  resetServiceFrequencyFixtures();
  resetServiceFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/service-frequencies", () => {
  it("requires a session for reads", async () => {
    expect((await GET(new Request("http://localhost/api/service-frequencies"))).status).toBe(401);
  });

  it("lists with the confirmed serviceTypeId, routeId, shift, weekday and validOn filters", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/service-frequencies?serviceTypeId=st-waste-route&routeId=route-1&shift=MORNING&weekday=3&validOn=2026-09-03", { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([expect.objectContaining({ id: "freq-1" })]);
  });

  it("allows only Office with the hypothesis capability to create", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const fieldResponse = await POST(new Request("http://localhost/api/service-frequencies", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ serviceTypeId: "st-waste-route", routeId: "route-1", weekdays: [1], shift: "MORNING", validFrom: "2026-09-07" }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/service-frequencies", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ serviceTypeId: "st-waste-route", routeId: "route-1", weekdays: [1, 5], shift: "MORNING", validFrom: "2026-09-07" }) }));
    expect(response.status).toBe(201);
    expect((await response.json())).toMatchObject({ serviceTypeId: "st-waste-route", routeId: "route-1", validTo: null });
  });

  it("mirrors the backend validation that rejects a non-ROUTE service type", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/service-frequencies", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ serviceTypeId: "st-container-point", routeId: "route-1", weekdays: [1], shift: "MORNING", validFrom: "2026-09-07" }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("ROUTE");
  });

  it("keeps stored services untouched when a frequency is edited or closed", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const before = structuredClone(serviceFixtures);
    const editResponse = await fetchFrequency("PATCH", "freq-1", cookie, { weekdays: [2, 4], validFrom: "2026-09-02", validTo: null });
    expect(editResponse.status).toBe(200);
    const closeResponse = await fetchFrequency("DELETE", "freq-1", cookie);
    expect(closeResponse.status).toBe(200);
    expect(serviceFixtures).toEqual(before);
    expect(serviceFrequencyFixtures.find((item) => item.id === "freq-1")?.validTo).toBeDefined();
  });
});

async function fetchFrequency(method: "PATCH" | "DELETE", id: string, cookie: string, body?: object) {
  const { PATCH, DELETE } = await import("./[id]/route");
  return method === "PATCH"
    ? PATCH(new Request(`http://localhost/api/service-frequencies/${id}`, { method, headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
    : DELETE(new Request(`http://localhost/api/service-frequencies/${id}`, { method, headers: { cookie } }), { params: Promise.resolve({ id }) });
}
