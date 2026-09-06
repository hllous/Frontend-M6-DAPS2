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

  describe("reportOverflow", () => {
    it("reports overflow sending no body and transitions ACTIVE -> OVERFLOWED", async () => {
      let capturedBody: unknown = "uninitialized";
      server.use(
        http.post("*/api/containers/:id/report-overflow", async ({ params, request }) => {
          capturedBody = await request.text();
          return HttpResponse.json({
            id: params.id,
            code: "CONT-001",
            containerType: "HOUSEHOLD",
            zoneId: "zone-1",
            address: "Av. Rivadavia 1200",
            lat: -34.6083,
            lng: -58.3712,
            capacityLiters: 1100,
            status: "OVERFLOWED",
          });
        }),
      );

      const result = await containersAdapter.reportOverflow("cont-1");
      expect(result.status).toBe("OVERFLOWED");
      expect(result.id).toBe("cont-1");
      // No invented payload sent
      expect(capturedBody).toBe("");
    });

    it("surfaces 409 conflict when attempting transition on a non-ACTIVE container", async () => {
      server.use(
        http.post("*/api/containers/:id/report-overflow", () =>
          HttpResponse.json(
            {
              statusCode: 409,
              message: "Solo se puede reportar desborde en contenedores activos.",
              error: "Conflict",
              timestamp: new Date().toISOString(),
              path: "/api/containers/cont-2/report-overflow",
            },
            { status: 409 },
          ),
        ),
      );

      await expect(containersAdapter.reportOverflow("cont-2")).rejects.toMatchObject({
        name: "ContainerRequestError",
        status: 409,
        message: "Solo se puede reportar desborde en contenedores activos.",
      });
    });
  });

  describe("reportDamage", () => {
    it("reports damage capturing damageType, severity, and requiresPublicWorks", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post("*/api/containers/:id/report-damage", async ({ params, request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            id: params.id,
            code: "CONT-001",
            containerType: "HOUSEHOLD",
            zoneId: "zone-1",
            address: "Av. Rivadavia 1200",
            lat: -34.6083,
            lng: -58.3712,
            capacityLiters: 1100,
            status: "DAMAGED",
            damageType: "VANDALIZED",
            severity: "HIGH",
            requiresPublicWorks: true,
          });
        }),
      );

      const result = await containersAdapter.reportDamage("cont-1", {
        damageType: "VANDALIZED",
        severity: "HIGH",
        requiresPublicWorks: true,
      });

      expect(result.status).toBe("DAMAGED");
      expect(result.damageType).toBe("VANDALIZED");
      expect(result.severity).toBe("HIGH");
      expect(result.requiresPublicWorks).toBe(true);
      expect(capturedPayload).toEqual({
        damageType: "VANDALIZED",
        severity: "HIGH",
        requiresPublicWorks: true,
      });
    });

    it("defaults requiresPublicWorks to false", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post("*/api/containers/:id/report-damage", async ({ params, request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            id: params.id,
            code: "CONT-001",
            containerType: "HOUSEHOLD",
            zoneId: "zone-1",
            address: "Av. Rivadavia 1200",
            lat: -34.6083,
            lng: -58.3712,
            capacityLiters: 1100,
            status: "DAMAGED",
            damageType: "LID_BROKEN",
            severity: "LOW",
            requiresPublicWorks: false,
          });
        }),
      );

      const result = await containersAdapter.reportDamage("cont-1", {
        damageType: "LID_BROKEN",
        severity: "LOW",
      });

      expect(result.status).toBe("DAMAGED");
      expect(result.requiresPublicWorks).toBe(false);
      expect(capturedPayload).toEqual({
        damageType: "LID_BROKEN",
        severity: "LOW",
        requiresPublicWorks: false,
      });
    });

    it("rejects invalid damage payload with ContainerContractError before network request", async () => {
      // @ts-expect-error testing invalid damageType
      await expect(containersAdapter.reportDamage("cont-1", { damageType: "EXPLODED", severity: "LOW" }))
        .rejects.toBeInstanceOf(ContainerContractError);
    });
  });

  describe("uploadEvidence and getEvidence", () => {
    it("uploads evidence with ownerType=CONTAINER and returns Attachment", async () => {
      let capturedHeaders: Headers | null = null;
      server.use(
        http.post("*/api/evidence", async ({ request }) => {
          capturedHeaders = request.headers;
          const formData = await request.formData();
          expect(formData.get("ownerType")).toBe("CONTAINER");
          expect(formData.get("ownerId")).toBe("cont-1");
          return HttpResponse.json({
            id: "att-cont-1",
            url: "/mock/evidence/foto-desborde.jpg",
            filename: "foto-desborde.jpg",
            contentType: "image/jpeg",
            uploadedAt: "2026-09-06T12:00:00.000Z",
          });
        }),
      );

      const file = new File(["dummy"], "foto-desborde.jpg", { type: "image/jpeg" });
      const att = await containersAdapter.uploadEvidence({
        file,
        containerId: "cont-1",
        idempotencyKey: "test-key-uuid-1",
      });

      expect(att).toMatchObject({
        id: "att-cont-1",
        filename: "foto-desborde.jpg",
        contentType: "image/jpeg",
      });
      expect(capturedHeaders!.get("Idempotency-Key")).toBe("test-key-uuid-1");
    });

    it("retrieves flat list of container evidence via getEvidence", async () => {
      server.use(
        http.get("*/api/evidence", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("ownerType")).toBe("CONTAINER");
          expect(url.searchParams.get("ownerId")).toBe("cont-1");
          return HttpResponse.json([
            {
              id: "att-cont-1",
              url: "/mock/evidence/foto-desborde.jpg",
              filename: "foto-desborde.jpg",
              contentType: "image/jpeg",
              uploadedAt: "2026-09-06T12:00:00.000Z",
            },
          ]);
        }),
      );

      const list = await containersAdapter.getEvidence("cont-1");
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("att-cont-1");
    });
  });
});
