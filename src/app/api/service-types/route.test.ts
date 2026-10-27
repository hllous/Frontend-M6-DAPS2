import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceTypeFixtures, serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetServiceTypeFixtures());
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("/api/service-types", () => {
  it("requires a session for reads", async () => {
    expect((await GET(new Request("http://localhost/api/service-types"))).status).toBe(401);
  });

  it("lists filtered fixtures for any authenticated actor", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/service-types?active=true&mode=ROUTE&search=waste", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.every((item: { active: boolean; mode: string; name: string }) => item.active && item.mode === "ROUTE" && /waste/i.test(`${item.name} waste`))).toBe(true);
    expect(body.meta).toEqual(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it("allows only an Office with the hypothesis capability to create", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const fieldResponse = await POST(new Request("http://localhost/api/service-types", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", name: "Nuevo", category: "TREES", mode: "POINT", requiresVehicle: false }) }));
    expect(fieldResponse.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/service-types", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", name: "Nuevo", category: "TREES", mode: "POINT", requiresVehicle: false }) }));
    expect(response.status).toBe(201);
    expect((await response.json())).toMatchObject({ code: "NEW", active: true });
  });

  it("rejects malformed create input", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(new Request("http://localhost/api/service-types", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "", name: "" }) }));
    expect(response.status).toBe(400);
  });

  it("keeps fixture mutations scoped to the mock route", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const before = serviceTypeFixtures.length;
    await POST(new Request("http://localhost/api/service-types", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "NEW", name: "Nuevo", category: "TREES", mode: "POINT", requiresVehicle: false }) }));
    expect(serviceTypeFixtures).toHaveLength(before + 1);
  });

  it("forwards an authenticated backend service-type list with GET", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));

    const response = await GET(new Request("http://localhost/api/service-types", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/service-types");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
