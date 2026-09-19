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

describe("POST /api/containers/[id]/empty BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/empty", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );
    expect(response.status).toBe(401);
  });

  it("blocks Field actors without container:manage with 403", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/empty", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("blocks Office actor without container:manage with 403", async () => {
    const cookie = await authenticatedCookie("office-limited-intake");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/empty", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows Office actor with container:manage to empty an OVERFLOWED container", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    // cont-2 is initialized in OVERFLOWED state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/empty", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-2",
      status: "ACTIVE",
    });
  });

  it("returns 409 Conflict when attempting to empty a non-OVERFLOWED container", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    // cont-1 is initialized in ACTIVE state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/empty", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/desbordado/i);
  });

  it("returns 404 when container is not found", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers/nonexistent/empty", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );

    expect(response.status).toBe(404);
  });
});
