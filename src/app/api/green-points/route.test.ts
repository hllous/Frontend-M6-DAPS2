import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { greenPointFixtures, resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetGreenPointFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });



describe("/api/green-points", () => {
  it("lists filtered points for authenticated Field actors", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/green-points?active=true&zoneId=zone-1&wasteType=RECYCLABLE&search=Mitre&pageSize=100", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(100);
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ code: "GP-001", active: true })]));
  });

  it("requires Office plus greenPoint:manage to create", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const fieldResponse = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: ["GREEN"] }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: ["GREEN"] }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ code: "GP-NEW", active: true, wasteTypes: ["GREEN"] });
    expect(greenPointFixtures).toHaveLength(4);
  });

  it("rejects an empty accepted-waste set", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/green-points", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "GP-NEW", name: "Nuevo", zoneId: "zone-1", wasteTypes: [] }) }));
    expect(response.status).toBe(400);
  });
});
