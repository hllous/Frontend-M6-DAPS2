import { describe, expect, it } from "vitest";

import { addCrewMembersInputSchema, createCrewInputSchema, updateCrewInputSchema } from "./crews";
import { cancelServiceInputSchema, createServiceInputSchema, rescheduleServiceInputSchema } from "./services";
import { treeInterventionAuthorizeInputSchema, treeInterventionCreateInputSchema } from "./tree-interventions";
import { assignNeighborhoodsInputSchema } from "./zones";

const ids = (count: number, length = 5) => Array.from({ length: count }, (_, index) => `${index}`.padStart(length, "x"));
const service = {
  serviceTypeId: "st-1",
  origin: "PLANNED",
  zoneIds: ["zone-1"],
  scheduledDate: "2026-09-25",
  timeWindow: { start: "08:00", end: "12:00" },
};
const crew = { name: "Cuadrilla", crewType: "MUNICIPAL", leaderUserId: "user-1", organizationId: "org-1", defaultShift: "MORNING" };

describe("service notes, ticketId and reasons (#251)", () => {
  it("notes: 2000 caracteres si, 2001 no", () => {
    expect(createServiceInputSchema.safeParse({ ...service, notes: "n".repeat(2000) }).success).toBe(true);
    const result = createServiceInputSchema.safeParse({ ...service, notes: "n".repeat(2001) });
    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0]?.message).toBe("Las notas no pueden superar los 2000 caracteres.");
  });

  it("ticketId: 64 caracteres si, 65 no (CreateServiceDto)", () => {
    expect(createServiceInputSchema.safeParse({ ...service, origin: "TICKET", ticketId: "t".repeat(64) }).success).toBe(true);
    expect(createServiceInputSchema.safeParse({ ...service, origin: "TICKET", ticketId: "t".repeat(65) }).success).toBe(false);
  });

  it.each([
    ["cancelar", cancelServiceInputSchema],
    ["reprogramar", rescheduleServiceInputSchema],
  ])("motivo al %s: 500 caracteres si, 501 no", (_name, schema) => {
    expect(schema.safeParse({ reason: "r".repeat(500) }).success).toBe(true);
    expect(schema.safeParse({ reason: "r".repeat(501) }).success).toBe(false);
  });
});

describe("ids and arrays (#251)", () => {
  it("leaderUserId y organizationId: 100 si, 101 no, en create y update", () => {
    expect(createCrewInputSchema.safeParse({ ...crew, leaderUserId: "u".repeat(100) }).success).toBe(true);
    expect(createCrewInputSchema.safeParse({ ...crew, leaderUserId: "u".repeat(101) }).success).toBe(false);
    expect(createCrewInputSchema.safeParse({ ...crew, organizationId: "o".repeat(101) }).success).toBe(false);
    expect(updateCrewInputSchema.safeParse({ name: crew.name, leaderUserId: crew.leaderUserId, defaultShift: crew.defaultShift, active: true, organizationId: "o".repeat(101) }).success).toBe(false);
  });

  it("integrantes de cuadrilla: 100 si, 101 no, y cada id hasta 100 caracteres", () => {
    expect(addCrewMembersInputSchema.safeParse({ memberUserIds: ids(100) }).success).toBe(true);
    expect(addCrewMembersInputSchema.safeParse({ memberUserIds: ids(101) }).success).toBe(false);
    expect(addCrewMembersInputSchema.safeParse({ memberUserIds: ["u".repeat(100)] }).success).toBe(true);
    expect(addCrewMembersInputSchema.safeParse({ memberUserIds: ["u".repeat(101)] }).success).toBe(false);
    expect(addCrewMembersInputSchema.safeParse({ memberUserIds: [] }).success).toBe(false);
  });

  it("barrios de una zona: 100 si, 101 no, y cada id hasta 100 caracteres", () => {
    expect(assignNeighborhoodsInputSchema.safeParse({ neighborhoodIds: ids(100) }).success).toBe(true);
    expect(assignNeighborhoodsInputSchema.safeParse({ neighborhoodIds: ids(101) }).success).toBe(false);
    expect(assignNeighborhoodsInputSchema.safeParse({ neighborhoodIds: ["b".repeat(101)] }).success).toBe(false);
  });

  it("arboles de una intervencion y persona autorizante", () => {
    const intervention = { interventionType: "SAFETY_PRUNING", address: "Calle 1", requiresStreetClosure: false, priority: "MEDIUM" };
    expect(treeInterventionCreateInputSchema.safeParse({ ...intervention, treeIds: ids(100) }).success).toBe(true);
    expect(treeInterventionCreateInputSchema.safeParse({ ...intervention, treeIds: ids(101) }).success).toBe(false);
    expect(treeInterventionAuthorizeInputSchema.safeParse({ authorizedByUserId: "a".repeat(100) }).success).toBe(true);
    expect(treeInterventionAuthorizeInputSchema.safeParse({ authorizedByUserId: "a".repeat(101) }).success).toBe(false);
  });
});
