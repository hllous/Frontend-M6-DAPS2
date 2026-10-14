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



describe("POST /api/containers/[id]/relocate BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/relocate", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("blocks Field actors without container:manage with 403", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/relocate", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("blocks Office actor without container:manage with 403", async () => {
    const cookie = await loginAs("office-limited-intake", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/relocate", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows Office actor with container:manage to initiate relocation on an ACTIVE container", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    // cont-1 is initialized in ACTIVE state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/relocate", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-1",
      status: "RELOCATING",
    });
  });

  it("returns 409 Conflict when attempting to relocate a non-ACTIVE container", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    // cont-2 is initialized in OVERFLOWED state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-2/relocate", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-2" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/activos/i);
  });

  it("returns 404 when container is not found", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/nonexistent/relocate", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );

    expect(response.status).toBe(404);
  });
});
