import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { disposalSiteFixtures, resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { DELETE, PATCH } from "./route";

beforeEach(() => resetDisposalSiteFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/disposal-sites/[id]", () => {
  it("does not allow Field actors to edit or deactivate", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await PATCH(new Request("http://localhost/api/disposal-sites/ds-transfer-north", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Cambio", siteType: "TRANSFER_STATION", active: true }) }), { params: { id: "ds-transfer-north" } });
    expect(response.status).toBe(403);
    const deleteResponse = await DELETE(new Request("http://localhost/api/disposal-sites/ds-transfer-north", { method: "DELETE", headers: { cookie } }), { params: { id: "ds-transfer-north" } });
    expect(deleteResponse.status).toBe(403);
  });

  it("updates editable fields and only performs a logical delete", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PATCH(new Request("http://localhost/api/disposal-sites/ds-transfer-north", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Estación Norte actualizada", siteType: "TRANSFER_STATION", active: true }) }), { params: Promise.resolve({ id: "ds-transfer-north" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: "RS-01", name: "Estación Norte actualizada" });

    const deleteResponse = await DELETE(new Request("http://localhost/api/disposal-sites/ds-transfer-north", { method: "DELETE", headers: { cookie } }), { params: { id: "ds-transfer-north" } });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toMatchObject({ id: "ds-transfer-north", active: false });
    expect(disposalSiteFixtures.find((item) => item.id === "ds-transfer-north")).toMatchObject({ active: false });
  });
});
