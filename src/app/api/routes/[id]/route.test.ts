import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetRouteFixtures, routeFixtures } from "@/lib/routes-fixtures";
import { DELETE, GET, PATCH } from "./route";

afterEach(() => {
  resetRouteFixtures();
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

describe("authenticated routes [id] BFF route", () => {
  describe("GET", () => {
    it("requires an active session and returns 401", async () => {
      const response = await GET(new Request("http://localhost/api/routes/route-1"), {
        params: Promise.resolve({ id: "route-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when route is not found", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await GET(
        new Request("http://localhost/api/routes/nonexistent", {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("returns the route with its stops sequence for an authenticated actor", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await GET(
        new Request("http://localhost/api/routes/route-1", {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        id: "route-1",
        code: "REC-001",
        name: "Recorrido Casco Histórico",
        stops: expect.arrayContaining([
          expect.objectContaining({ sequence: 1, zoneId: "zone-1" }),
        ]),
      });
    });
  });

  describe("PATCH", () => {
    it("requires an active session and returns 401", async () => {
      const response = await PATCH(
        new Request("http://localhost/api/routes/route-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await PATCH(
        new Request("http://localhost/api/routes/route-1", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.statusCode).toBe(403);
      expect(body.message).toContain("Oficina");
    });

    it("returns 404 when route is not found", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await PATCH(
        new Request("http://localhost/api/routes/nonexistent", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ name: "Nuevo nombre" }),
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("updates route name and ensures code is immutable", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await PATCH(
        new Request("http://localhost/api/routes/route-1", {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ name: "Recorrido Casco Histórico Modificado", code: "HACKED" }),
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe("Recorrido Casco Histórico Modificado");
      expect(body.code).toBe("REC-001"); // Code must remain unchanged
    });
  });

  describe("DELETE", () => {
    it("requires an active session and returns 401", async () => {
      const response = await DELETE(
        new Request("http://localhost/api/routes/route-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
      const cookie = await authenticatedCookie("field-crew-member-route");
      const response = await DELETE(
        new Request("http://localhost/api/routes/route-1", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.statusCode).toBe(403);
      expect(body.message).toContain("Oficina");
    });

    it("returns 404 when deleting a nonexistent route", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await DELETE(
        new Request("http://localhost/api/routes/nonexistent", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
    });

    it("deactivates route logically (active = false) for Office actor", async () => {
      const cookie = await authenticatedCookie("office-duty-queue");
      const response = await DELETE(
        new Request("http://localhost/api/routes/route-1", {
          method: "DELETE",
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: "route-1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.active).toBe(false);

      const fixture = routeFixtures.find((r) => r.id === "route-1");
      expect(fixture?.active).toBe(false);
    });
  });
});
