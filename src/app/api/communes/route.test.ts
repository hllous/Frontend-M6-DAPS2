import { afterEach, describe, expect, it, vi } from "vitest";

import { loginAs } from "@/test/session";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/communes", () => {
  it("requires an active session", async () => {
    expect((await GET(new Request("http://localhost/api/communes"))).status).toBe(401);
  });

  it("serves the 15 communes with their zones in mock mode", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });

    const communes = await (await GET(new Request("http://localhost/api/communes", { headers: { cookie } }))).json();

    expect(communes).toHaveLength(15);
    expect(communes[0]).toMatchObject({ code: "comuna-1", name: "Comuna 1", zones: expect.any(Array) });
  });

  it("proxies GET /communes to the backend", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    const response = await GET(new Request("http://localhost/api/communes?active=true", { headers: { cookie } }));

    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/communes?active=true");
    expect(response.status).toBe(200);
  });
});
