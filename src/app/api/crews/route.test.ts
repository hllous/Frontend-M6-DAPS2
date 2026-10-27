import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



describe("crews BFF route", () => {
  it("scopes Field list reads to the actor's own crew", async () => {
    const response = await GET(new Request("http://localhost/api/crews", { headers: { cookie: await loginAs("field-crew-member-route", { mode: "mock" }) } }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([expect.objectContaining({ id: "crew-b" })]);
  });

  it("keeps creation Office-only and requires the hypothesis capability", async () => {
    const response = await POST(new Request("http://localhost/api/crews", { method: "POST", headers: { cookie: await loginAs("field-crew-leader-route", { mode: "mock" }), "content-type": "application/json" }, body: JSON.stringify({ name: "Nueva", crewType: "MUNICIPAL", leaderUserId: "user-maria", organizationId: "org-municipal", defaultShift: "MORNING" }) }));
    expect(response.status).toBe(403);
  });

  it("forwards an authenticated backend crew list with GET", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));

    const response = await GET(new Request("http://localhost/api/crews", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/crews");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
