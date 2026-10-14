import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => { delete process.env.M6_AUTH_MODE; vi.restoreAllMocks(); });


describe("crew detail BFF route", () => {
  it("allows Field to read its own crew and denies another crew", async () => {
    const sessionCookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const own = await GET(new Request("http://localhost/api/crews/crew-b", { headers: { cookie: sessionCookie } }), { params: { id: "crew-b" } });
    expect(own.status).toBe(200);
    const other = await GET(new Request("http://localhost/api/crews/crew-a", { headers: { cookie: sessionCookie } }), { params: { id: "crew-a" } });
    expect(other.status).toBe(403);
  });

  it("allows Office to update and logically delete a crew", async () => {
    const sessionCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const input = { name: "Cuadrilla actualizada", leaderUserId: "user-maria", organizationId: "org-municipal", defaultShift: "MORNING", active: true };
    const update = await PATCH(new Request("http://localhost/api/crews/crew-a", { method: "PATCH", headers: { cookie: sessionCookie, "content-type": "application/json" }, body: JSON.stringify(input) }), { params: { id: "crew-a" } });
    expect(update.status).toBe(200);
    const removal = await DELETE(new Request("http://localhost/api/crews/crew-a", { method: "DELETE", headers: { cookie: sessionCookie } }), { params: { id: "crew-a" } });
    expect(removal.status).toBe(200);
    expect(await removal.json()).toMatchObject({ active: false });
  });
});
