import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { resetCrewFixtures } from "./crew-fixtures";
import { CrewContractError } from "./crews";
import { crewZoneAssignmentsAdapter, createCrewZoneAssignmentInputSchema, CrewZoneAssignmentRequestError } from "./crew-zone-assignments";
import { handlers } from "@/mocks/handlers";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetCrewFixtures(); });
afterAll(() => server.close());

describe("crew zone assignments adapter", () => {
  it("lists the moves of a crew, newest first", async () => {
    const moves = await crewZoneAssignmentsAdapter.list("crew-c");
    expect(moves.map((move) => move.id)).toEqual(["move-crew-c-active", "move-crew-c-past"]);
  });

  it("creates a move and returns it first in the history", async () => {
    const created = await crewZoneAssignmentsAdapter.create("crew-a", { zoneId: "zone-2", validFrom: "2099-01-01", validTo: "2099-01-10", reason: "Refuerzo por evento" });
    expect(created).toMatchObject({ crewId: "crew-a", zoneId: "zone-2", validFrom: "2099-01-01", validTo: "2099-01-10", reason: "Refuerzo por evento" });
    expect((await crewZoneAssignmentsAdapter.list("crew-a"))[0]?.id).toBe(created.id);
  });

  it("rejects a missing reason or an end date before the start before sending", async () => {
    expect(createCrewZoneAssignmentInputSchema.safeParse({ zoneId: "zone-2", validFrom: "2099-01-01", reason: "  " }).success).toBe(false);
    expect(createCrewZoneAssignmentInputSchema.safeParse({ zoneId: "zone-2", validFrom: "2099-01-10", validTo: "2099-01-01", reason: "x" }).success).toBe(false);
    await expect(crewZoneAssignmentsAdapter.create("crew-a", { zoneId: "zone-2", validFrom: "2099-01-01", reason: "" })).rejects.toBeInstanceOf(CrewContractError);
  });

  it("surfaces the overlap message from a 409", async () => {
    const error = await crewZoneAssignmentsAdapter.create("crew-c", { zoneId: "zone-2", validFrom: "2000-01-01", reason: "Pisa la vigente" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CrewZoneAssignmentRequestError);
    expect(error).toMatchObject({ status: 409, message: expect.stringContaining("se superpone") });
  });

  it("accepts a bare array or a data envelope from the backend", async () => {
    const wire = { id: "m1", crewId: "crew-a", zoneId: "zone-1", validFrom: "2026-01-01", validTo: null, reason: "x", createdBy: "3", createdAt: "2026-01-01T00:00:00.000Z" };
    server.use(http.get("*/api/crews/crew-a/zone-assignments", () => HttpResponse.json({ data: [wire] })));
    expect(await crewZoneAssignmentsAdapter.list("crew-a")).toHaveLength(1);
    server.use(http.get("*/api/crews/crew-a/zone-assignments", () => HttpResponse.json([wire])));
    expect(await crewZoneAssignmentsAdapter.list("crew-a")).toHaveLength(1);
  });
});
