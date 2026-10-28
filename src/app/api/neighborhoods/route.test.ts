import { afterEach, describe, expect, it, vi } from "vitest";

import { loginAs } from "@/test/session";
import { GET } from "./route";

afterEach(() => {
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";

describe("GET /api/neighborhoods", () => {
  it("requires an active session", async () => {
    expect((await GET(new Request("http://localhost/api/neighborhoods"))).status).toBe(401);
  });

  it("serves the 64-barrio catalog in mock mode and applies the filters", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });

    const all = await (await GET(new Request("http://localhost/api/neighborhoods", { headers: { cookie } }))).json();
    const active = await (await GET(new Request("http://localhost/api/neighborhoods?soloActivos=true&zona=comuna-1", { headers: { cookie } }))).json();

    expect(all).toHaveLength(64);
    expect(active.map((barrio: { codigo: string }) => barrio.codigo).sort()).toEqual(["constitucion", "montserrat", "puerto-madero", "retiro", "san-nicolas", "san-telmo"]);
  });

  it("forwards the filters to the backend and relays its 503 when the M9 catalog is not loaded", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ statusCode: 503, message: "Catálogo de barrios no disponible" }, { status: 503 }),
    );

    const response = await GET(new Request("http://localhost/api/neighborhoods?soloActivos=true&zona=comuna-14&q=pal", { headers: { cookie } }));

    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/neighborhoods?soloActivos=true&zona=comuna-14&q=pal");
    expect(response.status).toBe(503);
  });
});
