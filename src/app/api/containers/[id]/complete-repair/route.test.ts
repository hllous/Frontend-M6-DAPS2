import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { POST } from "./route";
import { loginAs } from "@/test/session";

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



describe("POST /api/containers/[id]/complete-repair BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-4/complete-repair", { method: "POST" }),
      { params: Promise.resolve({ id: "cont-4" }) },
    );

    expect(response.status).toBe(401);
  });

  it("transitions an under-repair container to active", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-4/complete-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-4" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "cont-4",
      status: "ACTIVE",
    });
  });

  it("rejects standalone completion outside the under-repair state", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/complete-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "Conflict" });
  });

  it("does not expose the standalone action to Field", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-4/complete-repair", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-4" }) },
    );

    expect(response.status).toBe(403);
  });
});
