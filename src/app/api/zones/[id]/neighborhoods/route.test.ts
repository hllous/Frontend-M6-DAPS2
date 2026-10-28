import { afterEach, describe, expect, it, vi } from "vitest";

import { neighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { resetZoneFixtures, getZoneFixture } from "@/lib/zones-fixtures";
import { POST } from "./route";
import { loginAs } from "@/test/session";

const barrioId = (codigo: string) => neighborhoodFixtures.find((barrio) => barrio.codigo === codigo)!.id;

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("POST /api/zones/[id]/neighborhoods", () => {
  it("requires an active session", async () => {
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("enforces the Office-only gate", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("silently ignores duplicate assignments and returns the updated Zone", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: [barrioId("belgrano"), barrioId("palermo")] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).neighborhoodIds).toEqual([barrioId("belgrano"), barrioId("palermo")]);
    expect(getZoneFixture("zone-1")?.neighborhoodIds).toEqual([barrioId("belgrano"), barrioId("palermo")]);
  });

  it("rejects with 400 a neighborhood that is not in the M9 catalog, including a codigo sent instead of the id", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    for (const neighborhoodId of ["barrio-palermo", "palermo"]) {
      const response = await POST(
        new Request("http://localhost/api/zones/zone-1/neighborhoods", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ neighborhoodIds: [neighborhoodId] }),
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(400);
    }
    expect(getZoneFixture("zone-1")?.neighborhoodIds).toEqual([barrioId("belgrano")]);
  });

  it("proxies the assignment to the backend in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "http://backend-test";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "zone-1", code: "Z-01", name: "Zona Norte", active: true, neighborhoodIds: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    const [targetUrl, requestInit] = fetchSpy.mock.calls[0] as [URL | string, RequestInit];
    expect(String(targetUrl)).toBe("http://backend-test/zones/zone-1/neighborhoods");
    expect(requestInit.method).toBe("POST");
  });
});
