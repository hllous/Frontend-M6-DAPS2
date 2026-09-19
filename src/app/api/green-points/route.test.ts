import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { greenPointFixtures, resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetGreenPointFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/green-points", () => {
  it("lists filtered points for authenticated Field actors", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/green-points?active=true&zoneId=zone-1&wasteType=RECYCLABLE&search=Mitre&pageSize=100", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(100);
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ code: "GP-001", active: true })]));
  });

  it("requires Office plus greenPoint:manage to create", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const fieldResponse = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: ["GREEN"] }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: ["GREEN"] }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ code: "GP-NEW", active: true, wasteTypes: ["GREEN"] });
    expect(greenPointFixtures).toHaveLength(4);
  });

  it("rejects an empty accepted-waste set", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: [] }) }));
    expect(response.status).toBe(400);
  });
});
