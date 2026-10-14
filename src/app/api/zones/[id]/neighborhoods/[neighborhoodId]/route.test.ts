import { afterEach, describe, expect, it } from "vitest";

import { resetZoneFixtures, getZoneFixture } from "@/lib/zones-fixtures";
import { DELETE } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
});


describe("DELETE /api/zones/[id]/neighborhoods/[neighborhoodId]", () => {
  it("blocks Field actors with 403", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await DELETE(
      new Request("http://localhost/api/zones/zone-1/neighborhoods/barrio-1", { headers: { cookie } }),
      { params: Promise.resolve({ id: "zone-1", neighborhoodId: "barrio-1" }) },
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
      new Request("http://localhost/api/zones/zone-1/neighborhoods/barrio-1", { headers: { cookie } }),
      { params: Promise.resolve({ id: "zone-1", neighborhoodId: "barrio-1" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).neighborhoodIds).toEqual(["barrio-2"]);
    expect(getZoneFixture("zone-1")?.neighborhoodIds).toEqual(["barrio-2"]);
  });
});
