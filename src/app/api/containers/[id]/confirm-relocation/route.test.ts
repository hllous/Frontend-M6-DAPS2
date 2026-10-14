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



describe("POST /api/containers/[id]/confirm-relocation BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/containers/cont-5/confirm-relocation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "cont-5" }) },
    );
    expect(response.status).toBe(401);
  });

  it("blocks Field actors without container:manage with 403", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-5/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "cont-5" }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("blocks Office actor without container:manage with 403", async () => {
    const cookie = await loginAs("office-limited-intake", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-5/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "cont-5" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 400 when body is invalid JSON or missing required fields", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/cont-5/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "", lat: "invalid" }),
      }),
      { params: Promise.resolve({ id: "cont-5" }) },
    );
    expect(response.status).toBe(400);
  });

  it("allows Office actor with container:manage to confirm relocation on a RELOCATING container", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    // cont-5 is initialized in RELOCATING state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-5/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "cont-5" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "cont-5",
      status: "ACTIVE",
      address: "Av. La Plata 1250",
      lat: -34.625,
      lng: -58.43,
    });
  });

  it("returns 409 Conflict when attempting to confirm relocation on a non-RELOCATING container", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    // cont-1 is initialized in ACTIVE state
    const response = await POST(
      new Request("http://localhost/api/containers/cont-1/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "cont-1" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/reubicación/i);
  });

  it("returns 404 when container is not found", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/containers/nonexistent/confirm-relocation", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ address: "Av. La Plata 1250", lat: -34.625, lng: -58.43 }),
      }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );

    expect(response.status).toBe(404);
  });
});
