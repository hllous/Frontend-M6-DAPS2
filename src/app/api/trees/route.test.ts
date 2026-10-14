import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetTreeFixtures, treeFixtures } from "@/lib/tree-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });



describe("/api/trees", () => {
  it("lists filtered trees for any authenticated actor", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/trees?active=true&zoneId=zone-1&search=Jacarand%C3%A1&pageSize=100", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(100);
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ surveyCode: "ARB-00442", active: true })]));
  });

  it("requires Office plus tree:manage to create and rejects duplicate survey codes", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const input = { surveyCode: "ARB-NEW", zoneId: "zone-1", species: "Ceibo", address: "Av. E2E 126", lat: -34.6, lng: -58.38, heightM: 7.5, diameterCm: 24 };
    const fieldResponse = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify(input) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify(input) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ surveyCode: "ARB-NEW", active: true });
    expect(treeFixtures).toHaveLength(5);
    const duplicate = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...input, surveyCode: "arb-new" }) }));
    expect(duplicate.status).toBe(409);
  });
});
