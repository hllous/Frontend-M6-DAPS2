import { afterEach, describe, expect, it, vi } from "vitest";

import { neighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { resetZoneFixtures, getZoneFixture } from "@/lib/zones-fixtures";
import { DELETE } from "./route";
import { loginAs } from "@/test/session";

const barrioId = (codigo: string) => neighborhoodFixtures.find((barrio) => barrio.codigo === codigo)!.id;

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});


describe("DELETE /api/zones/[id]/neighborhoods/[neighborhoodId]", () => {
  it("blocks Field actors with 403", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await DELETE(
      new Request(`http://localhost/api/zones/zone-1/neighborhoods/${barrioId("belgrano")}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: "zone-1", neighborhoodId: barrioId("belgrano") }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns the backend 404 when the neighborhood is not assigned", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await DELETE(
      new Request("http://localhost/api/zones/zone-1/neighborhoods/barrio-9", { headers: { cookie } }),
      { params: Promise.resolve({ id: "zone-1", neighborhoodId: "barrio-9" }) },
    );

    expect(response.status).toBe(404);
    expect((await response.json()).message).toContain("no está asignado");
  });

  it("removes an assigned neighborhood", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await DELETE(
      new Request(`http://localhost/api/zones/zone-1/neighborhoods/${barrioId("belgrano")}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: "zone-1", neighborhoodId: barrioId("belgrano") }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).neighborhoodIds).toEqual([]);
    expect(getZoneFixture("zone-1")?.neighborhoodIds).toEqual([]);
  });

  it("forwards an authorized backend neighborhood removal with both ids and DELETE method", async () => {
    const id = "zone_42.3~";
    const neighborhoodId = "neighborhood_84.6~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, neighborhoodIds: [] }));

    const response = await DELETE(
      new Request(`http://localhost/api/zones/${id}/neighborhoods/${neighborhoodId}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id, neighborhoodId }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/zones/${id}/neighborhoods/${neighborhoodId}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
