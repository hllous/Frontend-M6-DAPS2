import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import {
  clearFieldDraft,
  getFieldDraft,
  hasServiceDrifted,
  resubmitFieldAction,
  retryFieldDraft,
  saveFieldDraft,
  snapshotService,
  submitFieldAction,
  type FieldDraft,
} from "./field-drafts";
import type { Service } from "./services";
import { NetworkFailureError } from "./authenticated-fetch";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "SVC-9001",
    serviceTypeId: "st-street-cleaning",
    serviceTypeName: "Barrido mecánico",
    title: "Test service",
    mode: "ROUTE",
    status: "IN_PROGRESS",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    scheduledDate: "2026-09-05",
    windowFrom: "08:00",
    windowTo: "12:00",
    crewId: "crew-a",
    crewName: "Cuadrilla A",
    vehicleId: "veh-101",
    vehiclePlate: "AF 123 CD",
    coordinates: { x: 10, y: 10 },
    attachments: [],
    history: [],
    updatedAt: "2026-09-05T08:00:00.000Z",
    ...overrides,
  };
}

describe("field-drafts storage primitives", () => {
  it("round-trips a draft through save/get/clear", () => {
    const service = makeService();
    const draft: FieldDraft<{ note: string }> = {
      serviceId: service.id,
      actionType: "suspend",
      payload: { note: "grúa solicitada" },
      composedAgainst: snapshotService(service),
      savedAt: "2026-09-05T09:00:00.000Z",
    };

    saveFieldDraft(draft);
    expect(getFieldDraft(service.id, "suspend")).toEqual(draft);

    clearFieldDraft(service.id, "suspend");
    expect(getFieldDraft(service.id, "suspend")).toBeNull();
  });

  it("scopes drafts of the same action type by an explicit scope (e.g. zoneId)", () => {
    const service = makeService();
    saveFieldDraft({
      serviceId: service.id,
      actionType: "zoneResult",
      scope: "zone-1",
      payload: { status: "SERVICED" },
      composedAgainst: snapshotService(service),
      savedAt: "2026-09-05T09:00:00.000Z",
    });
    saveFieldDraft({
      serviceId: service.id,
      actionType: "zoneResult",
      scope: "zone-2",
      payload: { status: "PARTIAL" },
      composedAgainst: snapshotService(service),
      savedAt: "2026-09-05T09:00:00.000Z",
    });

    expect(getFieldDraft(service.id, "zoneResult", "zone-1")?.payload).toEqual({ status: "SERVICED" });
    expect(getFieldDraft(service.id, "zoneResult", "zone-2")?.payload).toEqual({ status: "PARTIAL" });

    clearFieldDraft(service.id, "zoneResult", "zone-1");
    expect(getFieldDraft(service.id, "zoneResult", "zone-1")).toBeNull();
    expect(getFieldDraft(service.id, "zoneResult", "zone-2")).not.toBeNull();
  });

  it("detects drift only when updatedAt differs", () => {
    const service = makeService();
    const snapshot = snapshotService(service);
    expect(hasServiceDrifted(snapshot, service)).toBe(false);
    expect(hasServiceDrifted(snapshot, { ...service, updatedAt: "2026-09-05T10:00:00.000Z" })).toBe(
      true,
    );
  });
});

describe("submitFieldAction", () => {
  it("clears any existing draft and returns success when the submit call succeeds", async () => {
    const service = makeService();
    saveFieldDraft({
      serviceId: service.id,
      actionType: "start",
      payload: null,
      composedAgainst: snapshotService(service),
      savedAt: "2026-09-05T09:00:00.000Z",
    });

    const outcome = await submitFieldAction({
      service,
      actionType: "start",
      payload: null,
      submit: async () => ({ ...service, status: "IN_PROGRESS" }),
    });

    expect(outcome.kind).toBe("success");
    expect(getFieldDraft(service.id, "start")).toBeNull();
  });

  it("saves a local draft on a real network failure instead of surfacing a generic error", async () => {
    const service = makeService();

    const outcome = await submitFieldAction({
      service,
      actionType: "suspend",
      payload: { reason: "VEHICLE_BREAKDOWN", note: "no arranca" },
      submit: async () => {
        throw new NetworkFailureError();
      },
    });

    expect(outcome.kind).toBe("draft-saved");
    const stored = getFieldDraft(service.id, "suspend");
    expect(stored?.payload).toEqual({ reason: "VEHICLE_BREAKDOWN", note: "no arranca" });
    expect(stored?.composedAgainst.updatedAt).toBe(service.updatedAt);
  });

  it("surfaces a normal error message for a non-network failure (no draft saved)", async () => {
    const service = makeService();

    const outcome = await submitFieldAction({
      service,
      actionType: "start",
      payload: null,
      submit: async () => {
        throw new Error("El tipo de servicio requiere un vehículo operativo asignado.");
      },
    });

    expect(outcome.kind).toBe("error");
    expect(getFieldDraft(service.id, "start")).toBeNull();
  });
});

describe("resubmitFieldAction / retryFieldDraft", () => {
  it("applies the draft when the Service is unchanged since it was composed", async () => {
    const service = makeService();
    server.use(
      http.get("*/api/services/:id", () => HttpResponse.json(service)),
    );

    const outcome = await resubmitFieldAction({
      serviceId: service.id,
      actionType: "resume",
      composedAgainst: snapshotService(service),
      payload: null,
      submit: async () => ({ ...service, status: "IN_PROGRESS", statusReason: null }),
    });

    expect(outcome.kind).toBe("success");
  });

  it("returns a conflict — never applying the draft — when the Service changed server-side", async () => {
    const service = makeService();
    const composedAgainst = snapshotService(service);
    const driftedService = { ...service, status: "CANCELLED" as const, updatedAt: "2026-09-05T11:00:00.000Z" };
    server.use(http.get("*/api/services/:id", () => HttpResponse.json(driftedService)));

    let submitCalled = false;
    const outcome = await resubmitFieldAction({
      serviceId: service.id,
      actionType: "resume",
      composedAgainst,
      payload: null,
      submit: async () => {
        submitCalled = true;
        return service;
      },
    });

    expect(outcome.kind).toBe("conflict");
    expect(submitCalled).toBe(false);
    if (outcome.kind === "conflict") {
      expect(outcome.current.status).toBe("CANCELLED");
    }
  });

  it("retryFieldDraft resubmits the stored draft verbatim and clears it on success", async () => {
    const service = makeService();
    server.use(http.get("*/api/services/:id", () => HttpResponse.json(service)));

    const draft: FieldDraft<{ note: string }> = {
      serviceId: service.id,
      actionType: "suspend",
      payload: { note: "grúa en camino" },
      composedAgainst: snapshotService(service),
      savedAt: "2026-09-05T09:00:00.000Z",
    };
    saveFieldDraft(draft);

    const outcome = await retryFieldDraft({
      draft,
      submit: async (payload) => ({ ...service, status: "SUSPENDED", statusReason: payload.note }),
    });

    expect(outcome.kind).toBe("success");
    expect(getFieldDraft(service.id, "suspend")).toBeNull();
  });

  it("keeps the draft pending (still-offline) when the resubmit itself fails to connect", async () => {
    const service = makeService();
    server.use(http.get("*/api/services/:id", () => HttpResponse.json(service)));

    const outcome = await resubmitFieldAction({
      serviceId: service.id,
      actionType: "resume",
      composedAgainst: snapshotService(service),
      payload: null,
      submit: async () => {
        throw new NetworkFailureError();
      },
    });

    expect(outcome.kind).toBe("still-offline");
    expect(getFieldDraft(service.id, "resume")).not.toBeNull();
  });
});
