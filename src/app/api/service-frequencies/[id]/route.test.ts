import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetServiceFrequencyFixtures, serviceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { DELETE, GET, PATCH } from "./route";

afterEach(() => {
  resetServiceFrequencyFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/service-frequencies/:id", () => {
  it("returns 401 without a session", async () => {
    const response = await GET(new Request("http://localhost/api/service-frequencies/freq-1"), { params: Promise.resolve({ id: "freq-1" }) });
    expect(response.status).toBe(401);
  });

  it("rejects immutable serviceTypeId and routeId in PATCH", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PATCH(new Request("http://localhost/api/service-frequencies/freq-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ serviceTypeId: "st-cleaning-route", routeId: "route-2" }) }), { params: Promise.resolve({ id: "freq-1" }) });
    expect(response.status).toBe(400);
    expect(serviceFrequencyFixtures[0]).toMatchObject({ serviceTypeId: "st-waste-route", routeId: "route-1" });
  });

  it("closes a future rule at validFrom and leaves its service records untouched", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const servicesBefore = serviceFrequencyFixtures.map((frequency) => frequency.id);
    const response = await DELETE(new Request("http://localhost/api/service-frequencies/freq-2", { method: "DELETE", headers: { cookie } }), { params: Promise.resolve({ id: "freq-2" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "freq-2", validFrom: "2026-09-10", validTo: "2026-09-10" });
    expect(serviceFrequencyFixtures.map((frequency) => frequency.id)).toEqual(servicesBefore);
  });
});
