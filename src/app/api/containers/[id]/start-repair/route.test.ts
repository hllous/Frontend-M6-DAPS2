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

describe("POST /api/containers/[id]/start-repair BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/start-repair", { method: "POST" }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(401);
  });

  it("allows only Office actors with container:manage", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/start-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(403);
  });

  it("transitions a damaged container to under repair", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/start-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "cont-3",
      status: "UNDER_REPAIR",
    });
  });

  it("rejects a start request when the container is not damaged", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/start-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "Conflict" });
  });
});
