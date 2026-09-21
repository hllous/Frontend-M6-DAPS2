import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import {
  GreenSpaceContractError,
  GreenSpaceRequestError,
  greenSpacesAdapter,
  updateGreenSpaceInputSchema,
} from "./green-spaces";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("green spaces adapter", () => {
  it("accepts a null area from the backend", async () => {
    server.use(http.get("*/api/green-spaces", () => HttpResponse.json({
      data: [{ id: "green-space-null", name: "Plaza sin mensura", spaceType: "SQUARE", areaM2: null, zoneId: "zone-1", lat: null, lng: null, active: true }],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    })));

    await expect(greenSpacesAdapter.list()).resolves.toMatchObject({
      greenSpaces: [{ id: "green-space-null", areaM2: null }],
    });
  });

  it("normalizes the documented paginated response and filters", async () => {
    const page = await greenSpacesAdapter.list({ active: true, spaceType: "PARK", zoneId: "zone-1" });

    expect(page.greenSpaces).toEqual([
      expect.objectContaining({
        id: "green-space-108-1",
        name: "Parque del Bicentenario",
        spaceType: "PARK",
        areaM2: expect.any(Number),
        zoneId: "zone-1",
        lat: -34.5605,
        lng: -58.4525,
        active: true,
      }),
    ]);
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: 1, totalPages: 1 });
  });

  it("gets a GreenSpace using the documented response shape", async () => {
    await expect(greenSpacesAdapter.get("green-space-108-1")).resolves.toMatchObject({
      id: "green-space-108-1",
      name: expect.any(String),
      spaceType: "PARK",
      areaM2: expect.any(Number),
      zoneId: "zone-1",
      active: true,
    });
  });

  it("creates a GreenSpace with only the documented creation fields", async () => {
    await expect(
      greenSpacesAdapter.create({
        name: "Cantero de prueba #108",
        spaceType: "PLANTER",
        areaM2: 42.5,
        zoneId: "zone-2",
      }),
    ).resolves.toMatchObject({
      name: "Cantero de prueba #108",
      spaceType: "PLANTER",
      areaM2: 42.5,
      zoneId: "zone-2",
      active: true,
    });
  });

  it("updates and logically deletes a GreenSpace", async () => {
    await expect(
      greenSpacesAdapter.update("green-space-108-2", { name: "Rambla renovada #108", areaM2: 1300 }),
    ).resolves.toMatchObject({ id: "green-space-108-2", name: "Rambla renovada #108", areaM2: 1300 });

    await expect(greenSpacesAdapter.remove("green-space-108-2")).resolves.toMatchObject({
      id: "green-space-108-2",
      active: false,
    });
  });

  it("fails explicitly on malformed success payloads", async () => {
    server.use(http.get("*/api/green-spaces", () => HttpResponse.json({ greenSpaces: "not-an-envelope" })));

    await expect(greenSpacesAdapter.list()).rejects.toBeInstanceOf(GreenSpaceContractError);
  });

  it("surfaces documented request errors and network failures", async () => {
    server.use(
      http.get("*/api/green-spaces", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/api/green-spaces",
          },
          { status: 401 },
        ),
      ),
    );
    await expect(greenSpacesAdapter.list()).rejects.toBeInstanceOf(GreenSpaceRequestError);

    server.use(http.get("*/api/green-spaces", () => HttpResponse.error()));
    await expect(greenSpacesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
  });

  it("treats spaceType as immutable: the update contract drops it", () => {
    const parsed = updateGreenSpaceInputSchema.parse({ name: "Plaza Norte", spaceType: "PARK", areaM2: 10, zoneId: "zone-1" });
    expect(parsed).not.toHaveProperty("spaceType");
    expect(parsed).toMatchObject({ name: "Plaza Norte", areaM2: 10, zoneId: "zone-1" });
  });
});
