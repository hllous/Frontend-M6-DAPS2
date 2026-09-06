import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("authenticated zones [id]/references BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await GET(
      new Request("http://localhost/api/zones/zone-1/references"),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when zone is not found", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/zones/missing/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns reference counts for zone-1", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/zones/zone-1/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBeGreaterThan(0);
    expect(body.activeRoutes.length).toBeGreaterThan(0);
    expect(body.containersCount).toBe(3);
    expect(body.treesCount).toBe(12);
    expect(body.greenSpacesCount).toBe(2);
  });
});
