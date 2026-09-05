import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { EMPTY_SERVICES_QUERY } from "./services-fixtures";
import { ServiceContractError, ServiceRequestError, servicesAdapter } from "./services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("services adapter", () => {
  it("normalizes a successful paginated response into frontend-owned shapes", async () => {
    const page = await servicesAdapter.list();

    expect(page.services.length).toBeGreaterThan(0);
    const first = page.services[0];
    expect(first).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      mode: expect.stringMatching(/ROUTE|POINT/),
      status: expect.stringMatching(/SCHEDULED|RESCHEDULED|IN_PROGRESS|SUSPENDED|COMPLETED|PARTIALLY_COMPLETED|CANCELLED/),
      zoneIds: expect.any(Array),
    });
    expect(page).toMatchObject({
      page: 1,
      pageSize: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("normalizes the named empty-results scenario", async () => {
    const page = await servicesAdapter.list(EMPTY_SERVICES_QUERY);

    expect(page.services).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("fetches a single service by ID and validates its contract", async () => {
    const service = await servicesAdapter.get("SVC-1042");

    expect(service.id).toBe("SVC-1042");
    expect(service.title).toContain("Recolección");
    expect(service.mode).toBe("ROUTE");
  });

  it("fails explicitly on a malformed success payload instead of returning partial data", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({ services: "not-an-envelope" })));

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("surfaces a documented error response as a typed request error", async () => {
    server.use(
      http.get("*/api/services", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/services",
          },
          { status: 401 },
        ),
      ),
    );

    const error = await servicesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceRequestError);
    expect((error as ServiceRequestError).status).toBe(401);
  });

  it("fails explicitly when an error response does not respect the documented error contract", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({ oops: true }, { status: 500 })));

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("exposes a transport failure as a retryable network error and records allowlisted telemetry", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.error()));
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);

    expect(infoSpy).toHaveBeenCalledWith(
      "[m6-telemetry]",
      { name: "request_network_failure", resource: "services" },
    );
  });
});
