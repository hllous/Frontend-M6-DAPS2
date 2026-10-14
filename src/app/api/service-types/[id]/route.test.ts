import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetServiceTypeFixtures, serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetServiceTypeFixtures());
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
});



describe("/api/service-types/[id]", () => {
  it("returns the requested service type", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/service-types/st-waste-route", { headers: { cookie } }), { params: { id: "st-waste-route" } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "st-waste-route", code: "WASTE-ROUTE", name: "Recolección domiciliaria" });
  });

  it("does not allow a Field actor to edit or deactivate", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const request = new Request("http://localhost/api/service-types/st-waste-route", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Cambio", requiresVehicle: true, active: true }) });
    expect((await PATCH(request, { params: { id: "st-waste-route" } })).status).toBe(403);
    const deleteResponse = await DELETE(new Request(request, { method: "DELETE" }), { params: { id: "st-waste-route" } });
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
    const response = await PATCH(new Request("http://localhost/api/service-types/st-waste-route", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Recolección nocturna", requiresVehicle: true, active: true }) }), { params: { id: "st-waste-route" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: "WASTE-ROUTE", category: "WASTE_COLLECTION", mode: "ROUTE", name: "Recolección nocturna" });

    const deleteResponse = await DELETE(new Request("http://localhost/api/service-types/st-waste-route", { method: "DELETE", headers: { cookie } }), { params: { id: "st-waste-route" } });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toMatchObject({ id: "st-waste-route", active: false });
  });
});
