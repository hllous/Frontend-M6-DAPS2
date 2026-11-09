import { describe, expect, it } from "vitest";

import { auditEntrySchema, inboxPageSchema, inboxQuerySchema, sourceModuleLabel, systemActorLabel } from "./integration-monitor";

describe("integration monitor labels (#875)", () => {
  it("names the area behind a system actor and leaves people alone", () => {
    expect(systemActorLabel("system:m3")).toBe("Sistema · Obras Públicas");
    expect(systemActorLabel("system:m7")).toBe("Sistema · Tránsito");
    expect(systemActorLabel("system:m4")).toBe("Sistema · Faltas");
    expect(systemActorLabel("system:weather")).toBe("Sistema · Alerta meteorológica");
    expect(systemActorLabel("system:zz")).toBe("Sistema · Otra área");
    expect(systemActorLabel("system:constructor")).toBe("Sistema · Otra área");
    expect(systemActorLabel("42")).toBeNull();
  });

  it("names the sending area of a received event without showing the module code", () => {
    expect(sourceModuleLabel("obras")).toBe("Obras Públicas");
    expect(sourceModuleLabel("Tickets")).toBe("Reclamos");
    expect(sourceModuleLabel("toString")).toBe("Otra área");
    expect(sourceModuleLabel(null)).toBe("—");
  });
});

describe("integration monitor contract (#875)", () => {
  it("accepts the inbox page the backend sends, with nullable optional fields", () => {
    const parsed = inboxPageSchema.safeParse({
      data: [
        { messageId: "a1", eventType: "ticketUpdated", sourceModule: null, status: "pending", receivedAt: "2026-11-05T18:20:00.000Z" },
        { messageId: "a2", eventType: "workOrderCompleted", sourceModule: "obras", status: "failed", receivedAt: "2026-11-05T18:20:00.000Z", processedAt: null, occurredAt: null, correlationId: null, error: "x" },
      ],
      meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
    });
    expect(parsed.success).toBe(true);
    expect(inboxPageSchema.safeParse({ data: [{ messageId: "a", eventType: "t", status: "SENT", receivedAt: "2026-11-05T18:20:00.000Z" }], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }).success).toBe(false);
  });

  it("rejects an inverted date range in the inbox query", () => {
    expect(inboxQuerySchema.safeParse({ from: "2026-11-06", to: "2026-11-01" }).success).toBe(false);
    expect(inboxQuerySchema.safeParse({ status: "failed", from: "2026-11-01", to: "2026-11-06" }).success).toBe(true);
  });

  it("keeps accepting audit rows about a Faltas resolution recorded by the system", () => {
    expect(auditEntrySchema.safeParse({
      id: "650e8400-e29b-41d4-a716-446655440060",
      entityType: "SANCTION_OUTCOME",
      entityId: "550e8400-e29b-41d4-a716-446655440061",
      action: "RECORD_OUTCOME",
      fromStatus: null,
      toStatus: "FINE_ISSUED",
      actorUserId: "system:m4",
      actorRoles: [],
      note: null,
      occurredAt: "2026-11-05T18:20:01.000Z",
    }).success).toBe(true);
  });
});
