import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { POST } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

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
    const cookie = await loginAs("office-limited-intake", { mode: "mock" });
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

  it("denies the Administrator: reporting is Field work and Office does not mix with it", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-overflow", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ROLE_REQUIRED" });
  });

  it("allows Field crew member to report overflow without service assignment", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
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

  it("allows the crew leader to report overflow", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
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
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
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
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-non-existent/report-overflow", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "cont-non-existent" }) },
    );

    expect(response.status).toBe(404);
  });

  it("forwards an authorized backend overflow report with its id and method", async () => {
    const id = "container_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = createSessionCookie("field-crew-leader-route", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, status: "OVERFLOWED" }));

    const response = await POST(
      new Request(`http://localhost/api/containers/${id}/report-overflow`, { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/containers/${id}/report-overflow`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
