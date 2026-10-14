import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { greenPointFixtures, resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetGreenPointFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



describe("/api/green-points/[id]", () => {
  it("allows any authenticated actor to read detail", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/green-points/green-point-1", { headers: { cookie } }), { params: { id: "green-point-1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: "GP-001", wasteTypes: ["RECYCLABLE", "GREEN"] });
  });

  it("updates the full wasteTypes set and returns 204 for logical delete", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/green-points/green-point-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ wasteTypes: ["HOUSEHOLD"] }) }), { params: Promise.resolve({ id: "green-point-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ wasteTypes: ["HOUSEHOLD"] });

    const deleteResponse = await DELETE(new Request("http://localhost/api/green-points/green-point-1", { method: "DELETE", headers: { cookie } }), { params: { id: "green-point-1" } });
    expect(deleteResponse.status).toBe(204);
    expect(greenPointFixtures.find((point) => point.id === "green-point-1")).toMatchObject({ active: false, wasteTypes: ["HOUSEHOLD"] });
  });

  it("does not allow Field actors to edit or deactivate", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/green-points/green-point-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ wasteTypes: ["GREEN"] }) }), { params: { id: "green-point-1" } });
    expect(response.status).toBe(403);
    const deleteResponse = await DELETE(new Request("http://localhost/api/green-points/green-point-1", { method: "DELETE", headers: { cookie } }), { params: { id: "green-point-1" } });
    expect(deleteResponse.status).toBe(403);
  });

  it("forwards an authorized backend green-point deactivation with its id and DELETE method", async () => {
    const id = "green-point_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const response = await DELETE(
      new Request(`http://localhost/api/green-points/${id}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(204);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/green-points/${id}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
