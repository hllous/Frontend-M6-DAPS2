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

describe("vehicles BFF route pagination limits (#248)", () => {
  async function forwardedUrl(query: string) {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    const loginResponse = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    backendFetch.mockClear();
    await GET(new Request(`http://localhost/api/vehicles${query}`, { headers: { cookie } }));
    const url = backendFetch.mock.calls[0]?.[0] as URL;
    return url.searchParams;
  }

  it("clamps an out-of-range page and pageSize before calling the backend", async () => {
    const params = await forwardedUrl("?page=99999999&pageSize=1000");

    expect(params.get("page")).toBe("10000000");
    expect(params.get("pageSize")).toBe("100");
  });

  it("does not forward a non-numeric page", async () => {
    const params = await forwardedUrl("?page=abc&pageSize=0");

    expect(params.has("page")).toBe(false);
    expect(params.get("pageSize")).toBe("1");
  });
});
