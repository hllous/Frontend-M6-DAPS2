import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import {
  resetStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "./street-closure-request-fixtures";
import { resetTreeInterventionFixtures } from "./tree-intervention-fixtures";
import {
  StreetClosureRequestContractError,
  streetClosureRequestsAdapter,
} from "./street-closure-requests";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetStreetClosureRequestFixtures());
beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const createInput = {
  reason: "El recorrido requiere trabajar con circulación reducida.",
  sourceType: "SERVICE" as const,
  sourceId: "SVC-1050",
  sourceModule: "M6" as const,
  closureType: "PARTIAL" as const,
  requestedFrom: "2026-09-10T08:00",
  requestedTo: "2026-09-10T12:00",
  affectedSections: [
    { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12" },
  ],
};

describe("street closure request adapter", () => {
  it("normalizes a paginated list and preserves canonical Service context", async () => {
    const page = await streetClosureRequestsAdapter.list({ sourceId: "SVC-1050" });

    expect(page).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(page.requests[0]).toMatchObject({
      id: "SCR-1001",
      status: "REQUESTED",
      sourceType: "SERVICE",
      sourceId: "SVC-1050",
      sourceModule: "M6",
      sourceContext: { sourceId: "SVC-1050", title: expect.stringContaining("Barrido") },
    });
  });

  it("creates one or multiple structured sections and returns a pending request", async () => {
    const created = await streetClosureRequestsAdapter.create({
      ...createInput,
      affectedSections: [
        ...createInput.affectedSections,
        { streetName: "Calle 12", fromCross: "Bulevar Costero", toCross: "Av. Libertad" },
      ],
    });

    expect(created.status).toBe("REQUESTED");
    expect(created.affectedSections).toHaveLength(2);
    expect(created.sourceContext.sourceId).toBe("SVC-1050");
  });

  it("creates a TreeIntervention-sourced request with a compact canonical context", async () => {
    const created = await streetClosureRequestsAdapter.create({
      ...createInput,
      sourceType: "TREE_INTERVENTION",
      sourceId: "intervention-2",
    });

    expect(created).toMatchObject({
      status: "REQUESTED",
      sourceType: "TREE_INTERVENTION",
      sourceId: "intervention-2",
      sourceContext: {
        sourceType: "TREE_INTERVENTION",
        sourceId: "intervention-2",
        interventionType: "TREATMENT",
        address: "Av. Mitre 1140",
      },
    });
  });

  it("rejects an empty affected-section collection before submission", async () => {
    await expect(
      streetClosureRequestsAdapter.create({ ...createInput, affectedSections: [] }),
    ).rejects.toBeInstanceOf(StreetClosureRequestContractError);
  });

  it("supports adapter-only approve, reject, and end transitions", async () => {
    const rejected = await streetClosureRequestsAdapter.reject("SCR-1001");
    expect(rejected.status).toBe("REJECTED");

    const created = await streetClosureRequestsAdapter.create(createInput);
    const approved = await streetClosureRequestsAdapter.approve(created.id, { closureId: "M7-C-882" });
    expect(approved.status).toBe("APPROVED");
    expect(approved.closureId).toBe("M7-C-882");

    const ended = await streetClosureRequestsAdapter.end(created.id);
    expect(ended.status).toBe("ENDED");
  });

  it.each([
    ["REQUESTED", "blocked"],
    ["APPROVED", "allowed"],
    ["REJECTED", "rejected"],
    ["ENDED", "released"],
  ] as const)("resolves a Service dependency from the linked request: %s is %s", async (status, outcome) => {
    updateStreetClosureRequestFixture("SCR-1001", { status });

    await expect(streetClosureRequestsAdapter.getForService("SVC-1050")).resolves.toMatchObject({
      request: expect.objectContaining({ status }),
      outcome,
    });
  });

  it("returns no dependency when a Service has no closure request", async () => {
    await expect(streetClosureRequestsAdapter.getForService("SVC-1051")).resolves.toEqual({
      request: null,
      outcome: "none",
    });
  });

  it("fails explicitly on malformed success payloads", async () => {
    server.use(http.get("*/api/street-closure-requests", () => HttpResponse.json({ data: "not-an-array" })));

    await expect(streetClosureRequestsAdapter.list()).rejects.toBeInstanceOf(
      StreetClosureRequestContractError,
    );
  });

  it("surfaces network failures for the unsent-draft boundary", async () => {
    server.use(http.post("*/api/street-closure-requests", () => HttpResponse.error()));

    await expect(streetClosureRequestsAdapter.create(createInput)).rejects.toBeInstanceOf(
      NetworkFailureError,
    );
  });
});
