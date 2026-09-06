import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { DELETE, GET, PATCH } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

const params = Promise.resolve({ id: "vehicle-1" });

describe("vehicle detail BFF route", () => {
  it("returns a vehicle detail to authenticated actors", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/vehicles/vehicle-1", { headers: { cookie } }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "vehicle-1", plate: expect.any(String) });
  });

  it("updates and logically deletes a vehicle only for Office", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const update = await PATCH(new Request("http://localhost/api/vehicles/vehicle-1", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ capacity: 18 }),
    }), { params });
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ id: "vehicle-1", capacity: 18 });

    const removal = await DELETE(new Request("http://localhost/api/vehicles/vehicle-1", { method: "DELETE", headers: { cookie } }), { params });
    expect(removal.status).toBe(200);
    expect(await removal.json()).toMatchObject({ id: "vehicle-1", active: false });
  });

  it("rejects Field edits and missing vehicles", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-member-route");
    const forbidden = await PATCH(new Request("http://localhost/api/vehicles/vehicle-1", {
      method: "PATCH",
      headers: { cookie: fieldCookie, "content-type": "application/json" },
      body: JSON.stringify({ capacity: 12 }),
    }), { params });
    expect(forbidden.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const missing = await GET(new Request("http://localhost/api/vehicles/missing", { headers: { cookie: officeCookie } }), { params: Promise.resolve({ id: "missing" }) });
    expect(missing.status).toBe(404);
  });
});
