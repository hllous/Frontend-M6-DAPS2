import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { crewsAdapter, CrewContractError, CrewRequestError } from "./crews";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const createInput = {
  name: "Cuadrilla Centro",
  crewType: "MUNICIPAL" as const,
  leaderUserId: "user-maria",
  organizationId: "org-municipal",
  defaultShift: "MORNING" as const,
};

describe("crews adapter", () => {
  it("accepts the documented list response without detail-only member ids", async () => {
    server.use(http.get("*/api/crews", () => HttpResponse.json({
      data: [{
        id: "crew-real-list",
        name: "Cuadrilla Centro",
        crewType: "MUNICIPAL",
        defaultShift: "MORNING",
        leaderUserId: "user-maria",
        organizationId: "org-municipal",
        active: true,
        createdAt: "2026-09-20T10:00:00.000Z",
        updatedAt: "2026-09-20T10:00:00.000Z",
      }],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    })));

    await expect(crewsAdapter.list()).resolves.toMatchObject({
      crews: [{ id: "crew-real-list", name: "Cuadrilla Centro" }],
    });
  });

  it("normalizes the documented filtered paginated response", async () => {
    const page = await crewsAdapter.list({ active: true, crewType: "MUNICIPAL", defaultShift: "MORNING" });
    expect(page.crews.length).toBeGreaterThan(0);
    expect(page.crews[0]).toMatchObject({ name: expect.any(String), crewType: "MUNICIPAL", active: true });
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: expect.any(Number) });
  });

  it("accepts the real backend shapes: a list without members and a detail with members: [{userId}] (#239)", async () => {
    server.use(http.get("*/api/crews", () => HttpResponse.json({
      // Tal cual responde GET /crews del backend: sin miembros.
      data: [{ id: "crew-real", name: "Cooperativa Barrancas", crewType: "COOPERATIVE", defaultShift: "AFTERNOON", leaderUserId: "usr-m1-0211", organizationId: "org-coop", active: true, createdAt: "2026-09-20T00:28:42.248Z", updatedAt: "2026-09-20T00:28:42.248Z" }],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    })));
    const page = await crewsAdapter.list();
    expect(page.crews[0]).toMatchObject({ id: "crew-real", memberUserIds: [] });

    server.use(http.get("*/api/crews/crew-real", () => HttpResponse.json({
      id: "crew-real", name: "Cooperativa Barrancas", crewType: "COOPERATIVE", defaultShift: "AFTERNOON", leaderUserId: "usr-m1-0211", organizationId: "org-coop", active: true,
      members: [{ userId: "usr-m1-0211" }, { userId: "usr-m1-0212" }],
    })));
    await expect(crewsAdapter.get("crew-real")).resolves.toMatchObject({ memberUserIds: ["usr-m1-0211", "usr-m1-0212"] });
  });

  it("round-trips detail, create, update and logical delete without a membership call", async () => {
    await expect(crewsAdapter.get("crew-b")).resolves.toMatchObject({ id: "crew-b", memberUserIds: expect.any(Array) });
    const created = await crewsAdapter.create(createInput);
    expect(created).toMatchObject({ name: createInput.name, leaderUserId: createInput.leaderUserId, active: true });
    const updated = await crewsAdapter.update(created.id, { ...createInput, name: "Cuadrilla Centro actualizada", active: true });
    expect(updated).toMatchObject({ id: created.id, name: "Cuadrilla Centro actualizada" });
    await expect(crewsAdapter.remove(created.id)).resolves.toMatchObject({ id: created.id, active: false });
  });

  it("normalizes backend detail members into frontend member ids", async () => {
    server.use(http.get("*/api/crews/crew-real-detail", () => HttpResponse.json({
      id: "crew-real-detail",
      name: "Cuadrilla Centro",
      crewType: "MUNICIPAL",
      defaultShift: "MORNING",
      leaderUserId: "user-maria",
      organizationId: "org-municipal",
      active: true,
      members: [{ userId: "user-maria" }, { userId: "user-pedro" }],
      createdAt: "2026-09-20T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    })));

    await expect(crewsAdapter.get("crew-real-detail")).resolves.toMatchObject({
      id: "crew-real-detail",
      memberUserIds: ["user-maria", "user-pedro"],
    });
  });

  it("rejects malformed responses, documented errors and network failures explicitly", async () => {
    server.use(http.get("*/api/crews", () => HttpResponse.json({ data: "not-an-array" })));
    await expect(crewsAdapter.list()).rejects.toBeInstanceOf(CrewContractError);
    server.use(http.get("*/api/crews", () => HttpResponse.json({ statusCode: 401, message: "La sesión no está activa.", error: "Unauthorized", timestamp: new Date().toISOString(), path: "/api/crews" }, { status: 401 })));
    await expect(crewsAdapter.list()).rejects.toBeInstanceOf(CrewRequestError);
    server.use(http.get("*/api/crews", () => HttpResponse.error()));
    await expect(crewsAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
  });
});
