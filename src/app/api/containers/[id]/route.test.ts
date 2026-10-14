import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



const params = Promise.resolve({ id: "cont-1" });

describe("Container detail BFF route", () => {
  it("returns Container detail to any authenticated actor", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(
      new Request("http://localhost/api/containers/cont-1", {
        headers: { cookie },
      }),
      { params },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: "cont-1",
      code: "CONT-001",
      containerType: "HOUSEHOLD",
      status: "ACTIVE",
    });
  });

  it("updates Container fields for Office without allowing code/type mutations", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const update = await PATCH(
      new Request("http://localhost/api/containers/cont-1", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          zoneId: "zone-2",
          address: "Nueva Dirección 456",
          capacityLiters: 1500,
          code: "ATTEMPTED-CHANGE",
          containerType: "BULKY",
        }),
      }),
      { params },
    );

    expect(update.status).toBe(200);
    const body = await update.json();
    expect(body).toMatchObject({
      id: "cont-1",
      code: "CONT-001", // preserved
      containerType: "HOUSEHOLD", // preserved
      zoneId: "zone-2",
      address: "Nueva Dirección 456",
      capacityLiters: 1500,
    });
  });

  it("rejects Field edits to Containers", async () => {
    const fieldCookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const forbidden = await PATCH(
      new Request("http://localhost/api/containers/cont-1", {
        method: "PATCH",
        headers: { cookie: fieldCookie, "content-type": "application/json" },
        body: JSON.stringify({ capacityLiters: 2000 }),
      }),
      { params },
    );

    expect(forbidden.status).toBe(403);
  });

  it("returns 404 for missing Containers", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const missing = await GET(
      new Request("http://localhost/api/containers/missing-id", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "missing-id" }) },
    );

    expect(missing.status).toBe(404);
  });
});
