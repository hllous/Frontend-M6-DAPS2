import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET, POST } from "./route";

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

describe("vehicles BFF route", () => {
  it("requires an active session", async () => {
    const response = await GET(new Request("http://localhost/api/vehicles"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ statusCode: 401, error: "Unauthorized", path: "/api/vehicles" });
  });

  it("lists vehicles for an authenticated Field actor because assignment reads are not Office-only", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/vehicles?active=true&vehicleType=VAN", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([expect.objectContaining({ vehicleType: "VAN", active: true })]);
  });

  it("keeps vehicle management Office-only", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ plate: "AA 000 AA", vehicleType: "VAN", capacity: 5 }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/Oficina/i);
  });

  it("creates a vehicle for Office and returns the documented resource", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ plate: "AA 222 CC", vehicleType: "VAN", capacity: 5 }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ plate: "AA 222 CC", vehicleType: "VAN", capacity: 5, active: true });
  });
});
