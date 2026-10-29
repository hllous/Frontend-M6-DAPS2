import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import {
  getStreetClosureRequestFixture,
  resetStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "./street-closure-request-fixtures";
import { resetTreeInterventionFixtures } from "./tree-intervention-fixtures";
import {
  streetClosureRequestSchema,
  StreetClosureRequestContractError,
  StreetClosureRequestError,
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

function streetClosureRequestFixturesSnapshot(id: string) {
  return structuredClone(getStreetClosureRequestFixture(id)!);
}

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
    expect(created.sourceContext?.sourceId).toBe("SVC-1050");
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

  it("preserves the backend message and status for a 409 recovery conflict", async () => {
    server.use(
      http.post("*/api/street-closure-requests/SCR-1001/approve", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "El corte de calle ya fue finalizado por M7.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/street-closure-requests/SCR-1001/approve",
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      streetClosureRequestsAdapter.approve("SCR-1001", { closureId: "M7-C-882" }),
    ).rejects.toMatchObject({
      name: "StreetClosureRequestError",
      status: 409,
      message: "El corte de calle ya fue finalizado por M7.",
    } satisfies Partial<StreetClosureRequestError>);
  });

  it.each([
    ["REQUESTED", "blocked"],
    ["APPROVED", "allowed"],
    ["REJECTED", "rejected"],
    ["ENDED", "released"],
    ["EXPIRED", "expired"],
  ] as const)("resolves a Service dependency from the linked request: %s is %s", async (status, outcome) => {
    updateStreetClosureRequestFixture("SCR-1001", { status });

    await expect(streetClosureRequestsAdapter.getForService("SVC-1050")).resolves.toMatchObject({
      request: expect.objectContaining({ status }),
      outcome,
    });
  });

  it("lets Office end an EXPIRED closure (late ENDED from M7)", async () => {
    updateStreetClosureRequestFixture("SCR-1001", { status: "EXPIRED" });

    await expect(streetClosureRequestsAdapter.end("SCR-1001")).resolves.toMatchObject({ status: "ENDED" });
  });

  it("accepts EXPIRED in the list response and as the status filter", async () => {
    updateStreetClosureRequestFixture("SCR-1001", { status: "EXPIRED" });

    const page = await streetClosureRequestsAdapter.list({ status: "EXPIRED" });

    expect(page.requests).toEqual([expect.objectContaining({ id: "SCR-1001", status: "EXPIRED" })]);
    expect(page.invalid).toBe(0);
  });

  it("skips records with an unknown status, counts them and keeps the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    server.use(http.get("*/api/street-closure-requests", () => {
      return HttpResponse.json({
        data: [
          { ...streetClosureRequestFixturesSnapshot("SCR-1001"), status: "SUSPENDED_BY_ALIEN" },
          streetClosureRequestFixturesSnapshot("SCR-1002"),
        ],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    }));

    const page = await streetClosureRequestsAdapter.list();

    expect(page.requests.map((request) => request.id)).toEqual(["SCR-1002"]);
    expect(page.invalid).toBe(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SCR-1001"));
  });

  it("refuses to resolve a Service dependency when a linked record is unreadable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    server.use(http.get("*/api/street-closure-requests", () => HttpResponse.json({
      data: [{ ...streetClosureRequestFixturesSnapshot("SCR-1001"), status: "FUTURE_STATE" }],
      meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
    })));

    await expect(streetClosureRequestsAdapter.getForService("SVC-1050")).rejects.toBeInstanceOf(
      StreetClosureRequestContractError,
    );
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

// #735: Backend's real StreetClosureRequestResponseDto, with the keys openapi.json leaves optional absent.
describe("wire shape of StreetClosureRequestResponseDto", () => {
  const wire = {
    id: "ce0bbfaa-8720-4566-b9d1-738cb37a689b", sourceType: "SERVICE", sourceId: "ceec08ae-67e7-4739-9677-150f5085bb1a",
    reason: "Trabajo en vía pública",
    sections: [{ id: "6f0a6c52-3d0e-4e6b-9d69-2d2c1c0f6a11", streetName: "Rivadavia", fromCross: "Mitre", toCross: "San Martín" }],
    status: "REQUESTED", createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
  };

  it("parses a record with closureId, closureFrom, closureTo and closureType ABSENT", () => {
    expect(streetClosureRequestSchema.parse(wire)).toMatchObject({
      sourceModule: "M6", closureId: null, closureType: null, requestedFrom: null, requestedTo: null,
      affectedSections: [{ streetName: "Rivadavia", fromCross: "Mitre", toCross: "San Martín" }],
    });
  });

  it("maps the wire aliases when they are present", () => {
    expect(streetClosureRequestSchema.parse({ ...wire, closureFrom: "2026-10-01T09:00:00.000Z", closureTo: "2026-10-01T12:00:00.000Z", closureType: "TOTAL", closureId: "M7-1" }))
      .toMatchObject({ requestedFrom: "2026-10-01T09:00:00.000Z", requestedTo: "2026-10-01T12:00:00.000Z", closureType: "TOTAL", closureId: "M7-1" });
  });

  it.each([
    ["empty sections", { sections: [] }],
    ["sections that is not an array", { sections: "x" }],
    ["an unknown status", { status: "FOO" }],
    ["a foreign sourceModule", { sourceModule: "M2" }],
  ])("rejects %s", (_name, override) => {
    expect(streetClosureRequestSchema.safeParse({ ...wire, ...override }).success).toBe(false);
  });

  it("does not overwrite fields already in the internal shape (mixed record)", () => {
    const parsed = streetClosureRequestSchema.parse({
      ...wire, sections: [], affectedSections: [{ streetName: "Internal", fromCross: "A", toCross: "B" }],
      requestedFrom: "2026-10-02T08:00", requestedTo: "2026-10-02T10:00", closureFrom: "ignored", closureTo: "ignored",
    });
    expect(parsed).toMatchObject({ affectedSections: [{ streetName: "Internal" }], requestedFrom: "2026-10-02T08:00", requestedTo: "2026-10-02T10:00" });
  });

  it("resolves a Service dependency from a wire-shaped record (the Servicios workspace path)", async () => {
    server.use(http.get("*/api/street-closure-requests", () => HttpResponse.json({
      data: [{ ...wire, status: "APPROVED", closureId: "M7-1" }],
      meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
    })));

    await expect(streetClosureRequestsAdapter.getForService(wire.sourceId)).resolves.toMatchObject({
      request: { status: "APPROVED" },
      outcome: "allowed",
    });
  });
});
