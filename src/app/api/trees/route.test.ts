import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetTreeFixtures, treeFixtures } from "@/lib/tree-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetTreeFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/trees", () => {
  it("lists filtered trees for any authenticated actor", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/trees?active=true&zoneId=zone-1&search=Jacarand%C3%A1&pageSize=100", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(100);
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ surveyCode: "ARB-00442", active: true })]));
  });

  it("requires Office plus tree:manage to create and rejects duplicate survey codes", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const input = { surveyCode: "ARB-NEW", zoneId: "zone-1", species: "Ceibo", address: "Av. E2E 126", lat: -34.6, lng: -58.38, heightM: 7.5, diameterCm: 24 };
    const fieldResponse = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify(input) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify(input) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ surveyCode: "ARB-NEW", active: true });
    expect(treeFixtures).toHaveLength(5);
    const duplicate = await POST(new Request("http://localhost/api/trees", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...input, surveyCode: "arb-new" }) }));
    expect(duplicate.status).toBe(409);
  });
});
