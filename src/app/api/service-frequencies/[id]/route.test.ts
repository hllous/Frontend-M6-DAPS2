import { afterEach, describe, expect, it, vi } from "vitest";

import { resetServiceFrequencyFixtures, serviceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  resetServiceFrequencyFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
  vi.useRealTimers();
});



describe("/api/service-frequencies/:id", () => {
  it("returns 401 without a session", async () => {
    const response = await GET(new Request("http://localhost/api/service-frequencies/freq-1"), { params: Promise.resolve({ id: "freq-1" }) });
    expect(response.status).toBe(401);
  });

  it("rejects immutable serviceTypeId and routeId in PATCH", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/service-frequencies/freq-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ serviceTypeId: "st-cleaning-route", routeId: "route-2" }) }), { params: Promise.resolve({ id: "freq-1" }) });
    expect(response.status).toBe(400);
    expect(serviceFrequencyFixtures[0]).toMatchObject({ serviceTypeId: "st-waste-route", routeId: "route-1" });
  });

  it("closes a future rule at validFrom and leaves its service records untouched", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const servicesBefore = serviceFrequencyFixtures.map((frequency) => frequency.id);
    const response = await DELETE(new Request("http://localhost/api/service-frequencies/freq-2", { method: "DELETE", headers: { cookie } }), { params: Promise.resolve({ id: "freq-2" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "freq-2", validFrom: "2026-09-10T00:00:00.000Z", validTo: "2026-09-10T00:00:00.000Z" });
    expect(serviceFrequencyFixtures.map((frequency) => frequency.id)).toEqual(servicesBefore);
  });
});
