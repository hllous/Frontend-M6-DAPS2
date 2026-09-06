import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetRepairRequestFixtures, repairRequestFixtures } from "@/lib/repair-request-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetRepairRequestFixtures());
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_BACKEND_ORIGIN;
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

function createRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/repair-requests", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("repair request BFF collection routes", () => {
  it("requires a session", async () => {
    const response = await GET(new Request("http://localhost/api/repair-requests"));
    expect(response.status).toBe(401);
  });

  it("scopes Field list and create to the actor's assigned crew", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const assigned = await GET(new Request("http://localhost/api/repair-requests?detectedInId=SVC-1050", { headers: { cookie: fieldCookie } }));
    expect(assigned.status).toBe(200);
    expect((await assigned.json()).data).toEqual([
      expect.objectContaining({ detectedInId: "SVC-1050" }),
    ]);

    const otherCrew = await GET(new Request("http://localhost/api/repair-requests?detectedInId=SVC-1042", { headers: { cookie: fieldCookie } }));
    expect(otherCrew.status).toBe(403);

    const unscoped = await GET(new Request("http://localhost/api/repair-requests", { headers: { cookie: fieldCookie } }));
    expect(unscoped.status).toBe(403);

    const created = await POST(createRequest(fieldCookie, {
      damageType: "BROKEN_SIDEWALK",
      address: "Av. Rivadavia 2200",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1050",
    }));
    expect(created.status).toBe(201);

    const forbiddenCreate = await POST(createRequest(fieldCookie, {
      damageType: "BROKEN_SIDEWALK",
      address: "Calle 1",
      severity: "LOW",
      publicSafetyRisk: false,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1042",
    }));
    expect(forbiddenCreate.status).toBe(403);
  });

  it("lists fixtures and creates a pending Service-sourced referral", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const list = await GET(new Request("http://localhost/api/repair-requests", { headers: { cookie } }));
    expect((await list.json()).meta).toMatchObject({ total: 1, page: 1 });

    const response = await POST(createRequest(cookie, {
      damageType: "BROKEN_SIDEWALK",
      address: "Av. Rivadavia 2200",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1043",
    }));

    expect(response.status).toBe(201);
    expect((await response.json())).toMatchObject({ status: "REQUESTED", detectedInId: "SVC-1043" });
    expect(repairRequestFixtures).toHaveLength(2);
  });

  it("rejects an EnvironmentalInspection source in the Service-sourced phase", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(createRequest(cookie, {
      damageType: "BLOCKED_DRAIN",
      address: "Calle 1",
      severity: "MEDIUM",
      publicSafetyRisk: false,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1",
    }));
    expect(response.status).toBe(400);
  });
});
