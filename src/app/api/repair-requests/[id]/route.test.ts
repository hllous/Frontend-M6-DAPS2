import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvironmentalInspectionFixtures } from "@/lib/environmental-report-fixtures";
import { addRepairRequestFixture, getRepairRequestFixture, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { POST as start } from "./start/route";
import { POST as close } from "./close/route";
import { GET } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => {
  resetRepairRequestFixtures();
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
});
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
});



function transitionRequest(path: string, cookie: string, body: unknown = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("repair request BFF detail and recovery routes", () => {
  it("returns canonical source detail and supports Office recovery transitions", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const detail = await GET(new Request("http://localhost/api/repair-requests/RR-1001", { headers: { cookie } }), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(detail.status).toBe(200);
    expect((await detail.json()).sourceContext).toMatchObject({ type: "SERVICE", id: "SVC-1050" });

    const started = await start(transitionRequest("/api/repair-requests/RR-1001/start", cookie, { workOrderId: "WO-3001" }), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(started.status).toBe(200);
    expect(getRepairRequestFixture("RR-1001")?.status).toBe("IN_PROGRESS");

    const closed = await close(transitionRequest("/api/repair-requests/RR-1001/close", cookie, { workOrderId: "WO-3001" }), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(closed.status).toBe(200);
    expect(getRepairRequestFixture("RR-1001")?.status).toBe("CLOSED");
  });

  it("denies Field recovery and missing referrals", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await start(transitionRequest("/api/repair-requests/RR-1001/start", fieldCookie), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(response.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const missing = await GET(new Request("http://localhost/api/repair-requests/RR-404", { headers: { cookie: officeCookie } }), { params: Promise.resolve({ id: "RR-404" }) });
    expect(missing.status).toBe(404);
  });

  it("lets Field inspect only referrals attached to its assigned Services", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const assigned = await GET(new Request("http://localhost/api/repair-requests/RR-1001", { headers: { cookie: fieldCookie } }), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(assigned.status).toBe(200);
    expect((await assigned.json()).detectedInId).toBe("SVC-1050");

    const foreign = await GET(new Request("http://localhost/api/repair-requests/RR-404", { headers: { cookie: fieldCookie } }), { params: Promise.resolve({ id: "RR-404" }) });
    expect(foreign.status).toBe(403);
  });

  it("lets Field inspect an inspection referral only through its linked crew", async () => {
    addRepairRequestFixture({
      id: "RR-INS-1012",
      damageType: "BLOCKED_DRAIN",
      address: "Av. Brasil 2450",
      severity: "LOW",
      publicSafetyRisk: false,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
      sourceContext: {
        type: "INSPECTION",
        id: "INS-1012",
        label: "Inspección INS-1012 · ER-1012",
        href: "/app?destination=environment&detail=ER-1012&inspectionId=INS-1012",
      },
      status: "REQUESTED",
      workOrderId: null,
      requestedAt: "2026-09-05T08:00:00.000Z",
    });
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const assigned = await GET(new Request("http://localhost/api/repair-requests/RR-INS-1012", { headers: { cookie: fieldCookie } }), { params: Promise.resolve({ id: "RR-INS-1012" }) });
    expect(assigned.status).toBe(200);

    addRepairRequestFixture({
      id: "RR-INS-1005",
      damageType: "BLOCKED_DRAIN",
      address: "Av. Costanera km 3",
      severity: "HIGH",
      publicSafetyRisk: true,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1005",
      sourceContext: {
        type: "INSPECTION",
        id: "INS-1005",
        label: "Inspección INS-1005 · ER-1005",
        href: "/app?destination=environment&detail=ER-1005&inspectionId=INS-1005",
      },
      status: "REQUESTED",
      workOrderId: null,
      requestedAt: "2026-09-05T08:00:00.000Z",
    });
    const forbidden = await GET(new Request("http://localhost/api/repair-requests/RR-INS-1005", { headers: { cookie: fieldCookie } }), { params: Promise.resolve({ id: "RR-INS-1005" }) });
    expect(forbidden.status).toBe(403);
  });

  it("forwards an authenticated backend repair request detail with its id and GET method", async () => {
    const id = "RR-encoded_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, status: "REQUESTED" }));

    const response = await GET(
      new Request(`http://localhost/api/repair-requests/${id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/repair-requests/${id}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it.each([
    ["start", start],
    ["close", close],
  ] as const)("forwards the backend repair request %s action using POST", async (action, handler) => {
    const id = "RR-encoded_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, status: "IN_PROGRESS" }));

    const response = await handler(transitionRequest(`/api/repair-requests/${id}/${action}`, cookie), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/repair-requests/${id}/${action}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual({});
  });
});
