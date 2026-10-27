import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { disposalSiteFixtures, resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetDisposalSiteFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



describe("/api/disposal-sites", () => {
  it("requires an active session", async () => {
    expect((await GET(new Request("http://localhost/api/disposal-sites"))).status).toBe(401);
  });

  it("lists filtered sites for authenticated Field actors", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/disposal-sites?active=true&siteType=TRANSFER_STATION&search=norte", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(expect.arrayContaining([expect.objectContaining({ siteType: "TRANSFER_STATION", active: true })]));
  });

  it("requires Office plus the disposalSite:manage hypothesis capability to create", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const fieldResponse = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "LANDFILL", name: "Nuevo" }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "LANDFILL", name: "Nuevo" }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ code: "NEW", active: true });
    expect(disposalSiteFixtures).toHaveLength(4);
  });

  it("rejects invalid site types", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/disposal-sites", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", siteType: "UNKNOWN", name: "Nuevo" }) }));
    expect(response.status).toBe(400);
  });

  it("forwards an authenticated backend disposal-site list with GET", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));

    const response = await GET(new Request("http://localhost/api/disposal-sites", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/disposal-sites");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
