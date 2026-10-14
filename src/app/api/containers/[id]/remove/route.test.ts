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



describe("POST /api/containers/[id]/remove BFF route", () => {
  it("removes a damaged container and leaves it terminal", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/remove", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "cont-3",
      status: "REMOVED",
    });

    const secondAttempt = await POST(
      new Request("http://localhost/api/containers/cont-3/remove", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );
    expect(secondAttempt.status).toBe(409);
  });

  it("allows only Office actors with container:manage", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/remove", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(403);
  });

  it("rejects removal from any state other than damaged", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/remove", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "Conflict" });
  });
});
