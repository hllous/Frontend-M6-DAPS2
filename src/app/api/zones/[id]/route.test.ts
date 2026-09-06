import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { DELETE, GET, PATCH } from "./route";

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("authenticated zones [id] BFF route", () => {
  describe("GET", () => {
    it("requires an active session and returns 401", async () => {
      const response = await GET(new Request("http://localhost/api/zones/zone-1"), {
        params: Promise.resolve({ id: "zone-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when zone is not found", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await GET(
        new Request("http://localhost/api/zones/nonexistent", {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("returns the zone for an authenticated actor", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await GET(
        new Request("http://localhost/api/zones/zone-1", {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        id: "zone-1",
        code: "Z-01",
        name: "Zona Norte",
      });
    });
  });

  describe("PATCH", () => {
    it("requires an active session and returns 401", async () => {
      const response = await PATCH(
        new Request("http://localhost/api/zones/zone-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await PATCH(
        new Request("http://localhost/api/zones/zone-1", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.statusCode).toBe(403);
      expect(body.message).toContain("Oficina");
    });

    it("returns 404 when updating a nonexistent zone", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await PATCH(
        new Request("http://localhost/api/zones/nonexistent", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("updates name and active status, and guarantees code is immutable", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await PATCH(
        new Request("http://localhost/api/zones/zone-1", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          // Attempting to change code should have no effect
          body: JSON.stringify({ name: "Zona Norte Renombrada", code: "HACKED" }),
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe("Zona Norte Renombrada");
      expect(body.code).toBe("Z-01"); // Remains Z-01
    });
  });

  describe("DELETE", () => {
    it("requires an active session and returns 401", async () => {
      const response = await DELETE(
        new Request("http://localhost/api/zones/zone-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await DELETE(
        new Request("http://localhost/api/zones/zone-1", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.statusCode).toBe(403);
      expect(body.message).toContain("Oficina");
    });

    it("returns 404 when deleting a nonexistent zone", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await DELETE(
        new Request("http://localhost/api/zones/nonexistent", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("deactivates zone logically (active = false) for Office actor", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await DELETE(
        new Request("http://localhost/api/zones/zone-1", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.active).toBe(false);

      // Verify in fixture
      const fixture = zoneFixtures.find((z) => z.id === "zone-1");
      expect(fixture?.active).toBe(false);
    });
  });
});
