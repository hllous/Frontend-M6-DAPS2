import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { EMPTY_ZONES_QUERY } from "./zones-fixtures";
import { ZoneContractError, ZoneRequestError, zonesAdapter } from "./zones";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("zones adapter", () => {
  it("normalizes a successful paginated response into frontend-owned shapes", async () => {
    const page = await zonesAdapter.list();

    expect(page.zones.length).toBeGreaterThan(0);
    expect(page.zones[0]).toMatchObject({ code: expect.any(String), name: expect.any(String) });
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: expect.any(Number) });
  });

  it("normalizes the named empty-results scenario", async () => {
    const page = await zonesAdapter.list(EMPTY_ZONES_QUERY);

    expect(page.zones).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("fails explicitly on a malformed success payload instead of returning partial data", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ zones: "not-an-envelope" })));

    await expect(zonesAdapter.list()).rejects.toBeInstanceOf(ZoneContractError);
  });

  it("surfaces a documented error response as a typed request error", async () => {
    server.use(
      http.get("*/api/zones", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/zones",
          },
          { status: 401 },
        ),
      ),
    );

    const error = await zonesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ZoneRequestError);
    expect((error as ZoneRequestError).status).toBe(401);
  });

  it("fails explicitly when an error response does not respect the documented error contract", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ oops: true }, { status: 500 })));

    await expect(zonesAdapter.list()).rejects.toBeInstanceOf(ZoneContractError);
  });
});
