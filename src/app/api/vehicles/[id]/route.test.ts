import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



const params = Promise.resolve({ id: "vehicle-1" });

describe("vehicle detail BFF route", () => {
  it("returns a vehicle detail to authenticated actors", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/vehicles/vehicle-1", { headers: { cookie } }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "vehicle-1", plate: expect.any(String) });
  });

  it("updates and logically deletes a vehicle only for Office", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const fieldCookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const forbidden = await PATCH(new Request("http://localhost/api/vehicles/vehicle-1", {
      method: "PATCH",
      headers: { cookie: fieldCookie, "content-type": "application/json" },
      body: JSON.stringify({ capacity: 12 }),
    }), { params });
    expect(forbidden.status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    const missing = await GET(new Request("http://localhost/api/vehicles/missing", { headers: { cookie: officeCookie } }), { params: Promise.resolve({ id: "missing" }) });
    expect(missing.status).toBe(404);
  });

  it("forwards an authorized backend vehicle deactivation with its id and DELETE method", async () => {
    const id = "vehicle_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, active: false }));

    const response = await DELETE(
      new Request(`http://localhost/api/vehicles/${id}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/vehicles/${id}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
