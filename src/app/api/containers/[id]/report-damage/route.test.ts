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



describe("POST /api/containers/[id]/report-damage BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-damage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ damageType: "BURNT", severity: "HIGH" }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("blocks actors without container:report with 403", async () => {
    const cookie = await loginAs("office-limited-intake", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ damageType: "BURNT", severity: "HIGH" }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("validates payload and returns 400 on invalid input", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ damageType: "INVALID_TYPE", severity: "HIGH" }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("allows Field crew member to report damage with default requiresPublicWorks=false", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ damageType: "LID_BROKEN", severity: "LOW" }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-1",
      status: "DAMAGED",
      damageType: "LID_BROKEN",
      severity: "LOW",
      requiresPublicWorks: false,
    });
  });

  it("allows Office to report damage with requiresPublicWorks=true", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          damageType: "STRUCTURAL",
          severity: "CRITICAL",
          requiresPublicWorks: true,
        }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-1",
      status: "DAMAGED",
      damageType: "STRUCTURAL",
      severity: "CRITICAL",
      requiresPublicWorks: true,
    });
  });

  it("returns 409 Conflict when container is not in ACTIVE state", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    // cont-3 is initialized as DAMAGED
    const response = await POST(
      new Request("http://localhost/api/containers/cont-3/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ damageType: "BURNT", severity: "HIGH" }),
      }),
      { params: Promise.resolve({ id: "cont-3" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Conflict");
    expect(body.message).toMatch(/activos/i);
  });

  it("returns 404 for non-existent container", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-non-existent/report-damage", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ damageType: "BURNT", severity: "HIGH" }),
      }),
      { params: Promise.resolve({ id: "cont-non-existent" }) },
    );

    expect(response.status).toBe(404);
  });

  it("forwards an authorized backend damage report with its id, method, and payload", async () => {
    const id = "container_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const payload = { damageType: "STRUCTURAL", severity: "CRITICAL", requiresPublicWorks: true };
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, status: "DAMAGED", ...payload }));

    const response = await POST(
      new Request(`http://localhost/api/containers/${id}/report-damage`, {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/containers/${id}/report-damage`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual(payload);
  });
});
