import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { POST } from "./route";

beforeEach(() => {
  resetContainerFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
  resetContainerFixtures();
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

describe("POST /api/containers/[id]/report-overflow BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-overflow", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("blocks actors without container:report with 403", async () => {
    const cookie = await authenticatedCookie("office-limited-intake");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("allows Field crew member to report overflow without service assignment", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-1",
      status: "OVERFLOWED",
    });
  });

  it("allows Office duty queue actor to report overflow", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("OVERFLOWED");
  });

  it("returns 409 Conflict when attempting to report overflow on non-ACTIVE container", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    // cont-2 is initialized as OVERFLOWED
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Conflict");
    expect(body.message).toMatch(/activos/i);
  });

  it("returns 404 for non-existent container", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-non-existent/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-non-existent" }) },
    );

    expect(response.status).toBe(404);
  });
});
