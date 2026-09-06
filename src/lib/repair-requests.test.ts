import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { resetRepairRequestFixtures } from "./repair-request-fixtures";
import {
  REPAIR_DAMAGE_TYPE_LABEL,
  RepairRequestContractError,
  repairRequestsAdapter,
  type CreateRepairRequestInput,
} from "./repair-requests";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRepairRequestFixtures();
});
afterAll(() => server.close());

const validInput: CreateRepairRequestInput = {
  damageType: "BROKEN_SIDEWALK",
  address: "Av. Rivadavia 2200",
  severity: "LOW",
  publicSafetyRisk: true,
  detectedInType: "SERVICE",
  detectedInId: "SVC-1043",
};

describe("repair requests adapter", () => {
  it("normalizes a paginated list and keeps the Service Referral context", async () => {
    const page = await repairRequestsAdapter.list();

    expect(page.total).toBeGreaterThan(0);
    expect(page.repairRequests[0]).toMatchObject({
      detectedInType: "SERVICE",
      sourceContext: expect.objectContaining({ type: "SERVICE", id: expect.any(String) }),
    });
  });

  it("creates a pending RepairRequest with independent severity and public safety risk", async () => {
    const created = await repairRequestsAdapter.create(validInput);

    expect(created).toMatchObject({
      damageType: "BROKEN_SIDEWALK",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1043",
      status: "REQUESTED",
      sourceContext: { id: "SVC-1043" },
    });
  });

  it("rejects malformed success payloads at the adapter boundary", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.json({ broken: true }, { status: 201 })));

    await expect(repairRequestsAdapter.create(validInput)).rejects.toBeInstanceOf(
      RepairRequestContractError,
    );
  });

  it("surfaces network failure for the caller to retain as an Unsent referral", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.error()));

    await expect(repairRequestsAdapter.create(validInput)).rejects.toBeInstanceOf(NetworkFailureError);
  });

  it("posts recovery identifiers through start and close adapter methods", async () => {
    const started = await repairRequestsAdapter.start("RR-1001", { workOrderId: "WO-3001" });
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.workOrderId).toBe("WO-3001");

    const closed = await repairRequestsAdapter.close("RR-1001", { workOrderId: "WO-3001" });
    expect(closed.status).toBe("CLOSED");
  });

  it("exposes Spanish labels for closed enum families", () => {
    expect(REPAIR_DAMAGE_TYPE_LABEL.BROKEN_PAVEMENT).toBe("Pavimento roto");
  });
});
