import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import {
  ContainerContractError,
  ContainerRequestError,
  containersAdapter,
  type CreateContainerInput,
  type UpdateContainerInput,
} from "./containers";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("containers adapter", () => {
  it("normalizes the documented paginated response and filters", async () => {
    const page = await containersAdapter.list({
      status: "ACTIVE",
      containerType: "HOUSEHOLD",
      zoneId: "zone-1",
    });

    expect(page.containers.length).toBeGreaterThan(0);
    expect(page.containers[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        code: expect.any(String),
        containerType: "HOUSEHOLD",
        zoneId: "zone-1",
        status: "ACTIVE",
        address: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
        capacityLiters: expect.any(Number),
      }),
    );
    expect(page).toMatchObject({
      page: 1,
      pageSize: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("filters by search term", async () => {
    const page = await containersAdapter.list({ search: "CONT-001" });
    expect(page.containers.some((c) => c.code === "CONT-001")).toBe(true);
  });

  it("gets a Container using the documented response shape", async () => {
    const container = await containersAdapter.get("cont-1");
    expect(container).toMatchObject({
      id: "cont-1",
      code: "CONT-001",
      containerType: "HOUSEHOLD",
      zoneId: "zone-1",
      status: "ACTIVE",
      address: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
      capacityLiters: expect.any(Number),
    });
  });

  it("gets a damaged Container with damage details", async () => {
    const container = await containersAdapter.get("cont-3");
    expect(container).toMatchObject({
      id: "cont-3",
      code: "CONT-003",
      containerType: "BULKY",
      status: "DAMAGED",
      damageType: "LID_BROKEN",
      severity: "MEDIUM",
      requiresPublicWorks: false,
    });
  });

  it("creates a Container with documented creation fields starting in ACTIVE", async () => {
    const input: CreateContainerInput = {
      code: "CONT-NEW-01",
      containerType: "RECYCLABLE",
      zoneId: "zone-2",
      address: "Av. San Martín 1500",
      lat: -34.601,
      lng: -58.42,
      capacityLiters: 2400,
    };

    const created = await containersAdapter.create(input);
    expect(created).toMatchObject({
      code: "CONT-NEW-01",
      containerType: "RECYCLABLE",
      zoneId: "zone-2",
      address: "Av. San Martín 1500",
      lat: -34.601,
      lng: -58.42,
      capacityLiters: 2400,
      status: "ACTIVE",
    });
  });

  it("updates allowed fields and enforces immutable fields", async () => {
    const input: UpdateContainerInput = {
      zoneId: "zone-2",
      address: "Av. Rivadavia 2000",
      capacityLiters: 3200,
    };

    const updated = await containersAdapter.update("cont-1", input);
    expect(updated).toMatchObject({
      id: "cont-1",
      code: "CONT-001",
      containerType: "HOUSEHOLD",
      zoneId: "zone-2",
      address: "Av. Rivadavia 2000",
      capacityLiters: 3200,
    });
  });

  it("fails explicitly on malformed success payloads", async () => {
    server.use(
      http.get("*/api/containers", () =>
        HttpResponse.json({
          data: [{ id: "bad-container", code: 123 }],
          meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        }),
      ),
      http.get("*/api/containers/:id", () =>
        HttpResponse.json({ id: "bad-container", code: 123 }),
      ),
    );

    await expect(containersAdapter.list()).rejects.toBeInstanceOf(ContainerContractError);
    await expect(containersAdapter.get("cont-1")).rejects.toBeInstanceOf(ContainerContractError);
  });

  it("surfaces documented request errors and network failures", async () => {
    server.use(
      http.get("*/api/containers/:id", () =>
        HttpResponse.json(
          {
            statusCode: 404,
            message: "Contenedor no encontrado.",
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: "/api/containers/cont-missing",
          },
          { status: 404 },
        ),
      ),
    );

    await expect(containersAdapter.get("cont-missing")).rejects.toMatchObject({
      name: "ContainerRequestError",
      status: 404,
      message: "Contenedor no encontrado.",
    });

    server.use(
      http.get("*/api/containers", () => HttpResponse.error()),
    );

    await expect(containersAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
  });
});
