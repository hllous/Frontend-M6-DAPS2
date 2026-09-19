import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetEnvironmentalInspectionFixtures } from "@/lib/environmental-report-fixtures";
import { addRepairRequestFixture, getRepairRequestFixture, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { POST as start } from "./start/route";
import { POST as close } from "./close/route";
import { GET } from "./route";

beforeEach(() => {
  resetRepairRequestFixtures();
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
});
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

function transitionRequest(path: string, cookie: string, body: unknown = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("repair request BFF detail and recovery routes", () => {
  it("returns canonical source detail and supports Office recovery transitions", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
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
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const response = await start(transitionRequest("/api/repair-requests/RR-1001/start", fieldCookie), { params: Promise.resolve({ id: "RR-1001" }) });
    expect(response.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const missing = await GET(new Request("http://localhost/api/repair-requests/RR-404", { headers: { cookie: officeCookie } }), { params: Promise.resolve({ id: "RR-404" }) });
    expect(missing.status).toBe(404);
  });

  it("lets Field inspect only referrals attached to its assigned Services", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
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
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
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
});
