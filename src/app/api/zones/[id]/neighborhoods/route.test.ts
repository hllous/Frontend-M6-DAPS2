import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetZoneFixtures, getZoneFixture } from "@/lib/zones-fixtures";
import { POST } from "./route";

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("POST /api/zones/[id]/neighborhoods", () => {
  it("requires an active session", async () => {
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("enforces the Office-only gate", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("silently ignores duplicate assignments and returns the updated Zone", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: ["barrio-1", "barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).neighborhoodIds).toEqual(["barrio-1", "barrio-2", "barrio-4"]);
    expect(getZoneFixture("zone-1")?.neighborhoodIds).toEqual(["barrio-1", "barrio-2", "barrio-4"]);
  });

  it("proxies the assignment to the backend in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "http://backend-test";
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "zone-1", code: "Z-01", name: "Zona Norte", active: true, neighborhoodIds: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/zones/zone-1/neighborhoods", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ neighborhoodIds: ["barrio-4"] }),
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    const [targetUrl, requestInit] = fetchSpy.mock.calls[0] as [URL | string, RequestInit];
    expect(String(targetUrl)).toBe("http://backend-test/zones/zone-1/neighborhoods");
    expect(requestInit.method).toBe("POST");
  });
});
