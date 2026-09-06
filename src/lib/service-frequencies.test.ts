import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { serviceFrequencyFixtures, resetServiceFrequencyFixtures } from "./service-frequency-fixtures";
import {
  ServiceFrequencyContractError,
  ServiceFrequencyRequestError,
  serviceFrequenciesAdapter,
} from "./service-frequencies";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetServiceFrequencyFixtures();
});
afterAll(() => server.close());

describe("service frequencies adapter", () => {
  it("normalizes the confirmed paginated contract and query filters", async () => {
    const page = await serviceFrequenciesAdapter.list({ routeId: "route-1", shift: "MORNING", weekday: 3, validOn: "2026-09-03" });

    expect(page.serviceFrequencies).toEqual([
      expect.objectContaining({
        id: "freq-1",
        serviceTypeId: "st-waste-route",
        routeId: "route-1",
        weekdays: [1, 3, 5],
        shift: "MORNING",
        validFrom: "2026-09-01",
        validTo: null,
      }),
    ]);
    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 1 });
  });

  it("sends create with route-mode ids and receives the resource shape", async () => {
    let requestBody: unknown;
    server.use(http.post("*/api/service-frequencies", async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json({ id: "freq-new", ...requestBody as object, validTo: null }, { status: 201 });
    }));

    const created = await serviceFrequenciesAdapter.create({
      serviceTypeId: "st-waste-route",
      routeId: "route-1",
      weekdays: [1, 5],
      shift: "AFTERNOON",
      validFrom: "2026-09-07",
    });

    expect(requestBody).toEqual({
      serviceTypeId: "st-waste-route",
      routeId: "route-1",
      weekdays: [1, 5],
      shift: "AFTERNOON",
      validFrom: "2026-09-07",
    });
    expect(created).toMatchObject({ id: "freq-new", validTo: null });
  });

  it("uses PATCH for editable fields only and DELETE for Cerrar vigencia", async () => {
    let patchBody: unknown;
    let deleteMethod = "";
    server.use(
      http.patch("*/api/service-frequencies/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...serviceFrequencyFixtures[0], ...(patchBody as object) });
      }),
      http.delete("*/api/service-frequencies/:id", ({ request }) => {
        deleteMethod = request.method;
        return HttpResponse.json({ ...serviceFrequencyFixtures[0], validTo: "2026-09-06" });
      }),
    );

    await serviceFrequenciesAdapter.update("freq-1", { weekdays: [2, 4], shift: "NIGHT", validFrom: "2026-09-02", validTo: null });
    const closed = await serviceFrequenciesAdapter.close("freq-1");

    expect(patchBody).toEqual({ weekdays: [2, 4], shift: "NIGHT", validFrom: "2026-09-02", validTo: null });
    expect(deleteMethod).toBe("DELETE");
    expect(closed.validTo).toBe("2026-09-06");
  });

  it("rejects malformed success and error payloads explicitly", async () => {
    server.use(http.get("*/api/service-frequencies", () => HttpResponse.json({ data: "invalid" })));
    await expect(serviceFrequenciesAdapter.list()).rejects.toBeInstanceOf(ServiceFrequencyContractError);

    server.resetHandlers();
    server.use(http.get("*/api/service-frequencies", () => HttpResponse.json({ nope: true }, { status: 500 })));
    await expect(serviceFrequenciesAdapter.list()).rejects.toBeInstanceOf(ServiceFrequencyContractError);
  });

  it("surfaces a retryable network failure", async () => {
    server.use(http.get("*/api/service-frequencies", () => HttpResponse.error()));
    await expect(serviceFrequenciesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
  });

  it("surfaces a documented request error as typed", async () => {
    server.use(http.get("*/api/service-frequencies", () => HttpResponse.json({ statusCode: 403, message: "No autorizado", error: "Forbidden", timestamp: new Date().toISOString(), path: "/api/service-frequencies" }, { status: 403 })));
    const error = await serviceFrequenciesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceFrequencyRequestError);
    expect((error as ServiceFrequencyRequestError).status).toBe(403);
  });
});
