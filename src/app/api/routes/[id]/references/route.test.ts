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

describe("authenticated routes [id]/references BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await GET(
      new Request("http://localhost/api/routes/route-1/references"),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when route is not found", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/missing/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns reference frequencies for route-1", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/route-1/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBe(1);
    expect(body.activeServiceFrequencies.length).toBe(1);
    expect(body.activeServiceFrequencies[0]).toMatchObject({
      id: "freq-1",
      serviceTypeName: "Recolección Domiciliaria",
    });
  });

  it("returns empty reference report for route-3", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/route-3/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "route-3" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBe(0);
    expect(body.activeServiceFrequencies).toEqual([]);
  });
});
