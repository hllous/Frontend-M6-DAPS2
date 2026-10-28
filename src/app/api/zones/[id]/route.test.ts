import { afterEach, describe, expect, it, vi } from "vitest";

import { resetZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("authenticated zones [id] BFF route", () => {
  describe("GET", () => {
    it("requires an active session and returns 401", async () => {
      const response = await GET(new Request("http://localhost/api/zones/zone-1"), {
        params: Promise.resolve({ id: "zone-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when zone is not found", async () => {
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
      const response = await GET(
        new Request("http://localhost/api/zones/nonexistent", {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("returns the zone for an authenticated actor", async () => {
      const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
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
        code: "belgrano",
        name: "Belgrano",
        commune: { code: "comuna-13", name: "Comuna 13" },
        neighborhood: { codigo: "belgrano", nombre: "Belgrano" },
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
      const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
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
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
      expect(body.code).toBe("belgrano"); // Remains belgrano
    });
  });

  describe("PATCH commune", () => {
    it("answers 400 when the commune does not exist and lets null clear it", async () => {
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
      const patch = (communeId: string | null) => PATCH(
        new Request("http://localhost/api/zones/zone-1", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ communeId }) }),
        { params: Promise.resolve({ id: "zone-1" }) },
      );

      expect((await patch("c0a80101-0000-4000-8000-0000000000ff")).status).toBe(400);
      const cleared = await patch(null);
      expect(cleared.status).toBe(200);
      expect((await cleared.json()).commune).toBeNull();
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
      const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
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
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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

  it("forwards an authorized backend zone deactivation with its id and DELETE method", async () => {
    const id = "zone_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, active: false }));

    const response = await DELETE(
      new Request(`http://localhost/api/zones/${id}`, { method: "DELETE", headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/zones/${id}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
