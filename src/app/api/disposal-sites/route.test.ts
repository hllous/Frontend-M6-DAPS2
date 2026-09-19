import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { disposalSiteFixtures, resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetDisposalSiteFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/disposal-sites", () => {
  it("requires an active session", async () => {
    expect((await GET(new Request("http://localhost/api/disposal-sites"))).status).toBe(401);
  });

  it("lists filtered sites for authenticated Field actors", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/disposal-sites?active=true&siteType=TRANSFER_STATION&search=norte", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ siteType: "TRANSFER_STATION", active: true })]));
  });

  it("requires Office plus the disposalSite:manage hypothesis capability to create", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const fieldResponse = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "LANDFILL", name: "Nuevo" }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "LANDFILL", name: "Nuevo" }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ code: "NEW", active: true });
    expect(disposalSiteFixtures).toHaveLength(4);
  });

  it("rejects invalid site types", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "UNKNOWN", name: "Nuevo" }) }));
    expect(response.status).toBe(400);
  });
});
