import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceTypeFixtures, serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetServiceTypeFixtures());
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("/api/service-types/[id]", () => {
  it("returns the requested service type", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/service-types/st-waste-route", { headers: { cookie } }), { params: Promise.resolve({ id: "st-waste-route" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "st-waste-route", code: "WASTE-ROUTE", name: "Recolección domiciliaria" });
  });

  it("does not allow a Field actor to edit or deactivate", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const request = new Request("http://localhost/api/service-types/st-waste-route", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Cambio", requiresVehicle: true, active: true }) });
    expect((await PATCH(request, { params: Promise.resolve({ id: "st-waste-route" }) })).status).toBe(403);
    const deleteResponse = await DELETE(new Request(request, { method: "DELETE" }), { params: Promise.resolve({ id: "st-waste-route" }) });
    expect(deleteResponse.status).toBe(403);
  });

  it("rejects immutable fields instead of accepting a retroactive edit", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/service-types/st-waste-route", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ code: "OTHER", name: "Cambio", category: "TREES", mode: "POINT", requiresVehicle: false, active: true }) }), { params: Promise.resolve({ id: "st-waste-route" }) });
    expect(response.status).toBe(400);
    expect(serviceTypeFixtures[0].code).toBe("WASTE-ROUTE");
  });

  it("updates only editable fields and makes DELETE a logical deactivation", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/service-types/st-waste-route", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Recolección nocturna", requiresVehicle: true, active: true }) }), { params: Promise.resolve({ id: "st-waste-route" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: "WASTE-ROUTE", category: "WASTE_COLLECTION", mode: "ROUTE", name: "Recolección nocturna" });

    const deleteResponse = await DELETE(new Request("http://localhost/api/service-types/st-waste-route", { method: "DELETE", headers: { cookie } }), { params: Promise.resolve({ id: "st-waste-route" }) });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toMatchObject({ id: "st-waste-route", active: false });
  });

  it("forwards an authorized backend service-type deactivation with its id and DELETE method", async () => {
    const id = "st-encoded_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, active: false }));

    const response = await DELETE(
      new Request(`http://localhost/api/service-types/${id}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/service-types/${id}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it("denies a backend session without serviceType:manage before forwarding", async () => {
    const cookie = await loginAs("office-limited-intake", {
      mode: "backend-development",
      devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch");

    const response = await PATCH(
      new Request("http://localhost/api/service-types/st-waste-route", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "Cambio rechazado" }),
      }),
      { params: Promise.resolve({ id: "st-waste-route" }) },
    );

    expect(response.status).toBe(403);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
