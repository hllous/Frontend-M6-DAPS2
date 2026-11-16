import { beforeEach, describe, expect, it } from "vitest";

import {
  addAttachmentToContainer,
  addContainerFixture,
  completeRepairFixture,
  confirmRelocationFixture,
  emptyContainerFixture,
  filterContainerFixtures,
  getContainerAttachments,
  getContainerFixture,
  paginateContainerFixtures,
  removeContainerFixture,
  reportDamageFixture,
  reportOverflowFixture,
  resetContainerFixtures,
  startRelocationFixture,
  startRepairFixture,
  updateContainerFixture,
} from "./containers-fixtures";

// Estados iniciales de los fixtures: cont-1 ACTIVE, cont-2 OVERFLOWED, cont-3 DAMAGED, cont-4 UNDER_REPAIR, cont-5 RELOCATING.
beforeEach(() => resetContainerFixtures());

describe("container fixture state machine", () => {
  it("reports overflow only on an active container", () => {
    expect(reportOverflowFixture("cont-1").status).toBe("OVERFLOWED");
    expect(() => reportOverflowFixture("cont-3")).toThrow(/INVALID_STATE_TRANSITION.*DAMAGED/);
  });

  it("reports damage on an active container and stores the details", () => {
    const damaged = reportDamageFixture("cont-1", { damageType: "LID_BROKEN", severity: "HIGH", requiresPublicWorks: true });
    expect(damaged).toMatchObject({ status: "DAMAGED", damageType: "LID_BROKEN", severity: "HIGH", requiresPublicWorks: true });

    const withoutFlag = reportDamageFixture("cont-7", { damageType: "LID_BROKEN", severity: "LOW" });
    expect(withoutFlag.requiresPublicWorks).toBe(false);
    expect(() => reportDamageFixture("cont-2", { damageType: "LID_BROKEN", severity: "LOW" })).toThrow(/INVALID_STATE_TRANSITION.*OVERFLOWED/);
  });

  it("walks a damaged container through repair back to active", () => {
    expect(startRepairFixture("cont-3").status).toBe("UNDER_REPAIR");
    expect(completeRepairFixture("cont-3").status).toBe("ACTIVE");
  });

  it("rejects repair transitions from the wrong state", () => {
    expect(() => startRepairFixture("cont-1")).toThrow(/INVALID_STATE_TRANSITION.*ACTIVE/);
    expect(() => completeRepairFixture("cont-1")).toThrow(/INVALID_STATE_TRANSITION.*ACTIVE/);
  });

  it("removes only damaged containers", () => {
    expect(removeContainerFixture("cont-3").status).toBe("REMOVED");
    expect(() => removeContainerFixture("cont-1")).toThrow(/INVALID_STATE_TRANSITION/);
  });

  it("empties only overflowed containers", () => {
    expect(emptyContainerFixture("cont-2").status).toBe("ACTIVE");
    expect(() => emptyContainerFixture("cont-1")).toThrow(/INVALID_STATE_TRANSITION/);
  });

  it("relocates an active container and confirms the new place", () => {
    expect(startRelocationFixture("cont-1").status).toBe("RELOCATING");
    const moved = confirmRelocationFixture("cont-1", { address: "Calle Nueva 123", lat: -34.6, lng: -58.4, zoneId: "zone-3" });
    expect(moved).toMatchObject({ status: "ACTIVE", address: "Calle Nueva 123", lat: -34.6, lng: -58.4, zoneId: "zone-3" });
  });

  it("keeps the zone when the relocation does not name one", () => {
    const moved = confirmRelocationFixture("cont-5", { address: "Otra calle 9", lat: -34.5, lng: -58.5 });
    expect(moved.zoneId).toBe("zone-1");
  });

  it("rejects relocation transitions from the wrong state", () => {
    expect(() => startRelocationFixture("cont-2")).toThrow(/INVALID_STATE_TRANSITION/);
    expect(() => confirmRelocationFixture("cont-1", { address: "x", lat: 0, lng: 0 })).toThrow(/INVALID_STATE_TRANSITION/);
  });

  it.each([
    ["reportOverflow", () => reportOverflowFixture("nope")],
    ["reportDamage", () => reportDamageFixture("nope", { damageType: "LID_BROKEN", severity: "LOW" })],
    ["startRepair", () => startRepairFixture("nope")],
    ["completeRepair", () => completeRepairFixture("nope")],
    ["remove", () => removeContainerFixture("nope")],
    ["empty", () => emptyContainerFixture("nope")],
    ["startRelocation", () => startRelocationFixture("nope")],
    ["confirmRelocation", () => confirmRelocationFixture("nope", { address: "x", lat: 0, lng: 0 })],
  ])("%s fails with a readable message for an unknown container", (_name, run) => {
    expect(run).toThrow("Contenedor nope no encontrado.");
  });
});

describe("container fixture store", () => {
  it("updates only the editable fields and keeps code and type", () => {
    const updated = updateContainerFixture("cont-1", { address: "Nueva 1", capacityLiters: 500 });
    expect(updated).toMatchObject({ code: "CONT-001", containerType: "HOUSEHOLD", address: "Nueva 1", capacityLiters: 500, zoneId: "zone-1" });
    expect(getContainerFixture("cont-1")).toEqual(updated);
    expect(updateContainerFixture("nope", { address: "x" })).toBeNull();
  });

  it("adds a container and finds it by id", () => {
    addContainerFixture({ id: "cont-new", code: "CONT-900", containerType: "GREEN", zoneId: "zone-1", address: "Calle 1", lat: 0, lng: 0, capacityLiters: 100, status: "ACTIVE" });
    expect(getContainerFixture("cont-new")?.code).toBe("CONT-900");
    expect(getContainerFixture("zzz")).toBeNull();
  });

  it("filters by status, type, zone and search text", () => {
    expect(filterContainerFixtures({ status: "OVERFLOWED" }).map((c) => c.id)).toEqual(["cont-2"]);
    expect(filterContainerFixtures({ containerType: "BULKY" }).every((c) => c.containerType === "BULKY")).toBe(true);
    expect(filterContainerFixtures({ zoneId: "zone-1" }).every((c) => c.zoneId === "zone-1")).toBe(true);
    expect(filterContainerFixtures({ search: "CONT-004" }).map((c) => c.id)).toEqual(["cont-4"]);
    expect(filterContainerFixtures({ search: "inexistente-xyz" })).toEqual([]);
  });

  it("paginates with sane defaults for invalid page numbers", () => {
    const all = filterContainerFixtures({});
    const first = paginateContainerFixtures(all, 1, 2);
    expect(first.data).toHaveLength(2);
    expect(first.meta).toEqual({ total: all.length, page: 1, pageSize: 2, totalPages: Math.ceil(all.length / 2) });
    expect(paginateContainerFixtures(all, 2, 2).data[0]).toEqual(all[2]);
    expect(paginateContainerFixtures(all, -3, 0).meta).toMatchObject({ page: 1, pageSize: 10 });
    expect(paginateContainerFixtures([], 1, 5).meta.totalPages).toBe(1);
  });

  it("keeps attachments per container and clears them on reset", () => {
    const attachment = { id: "att-1", fileName: "foto.png" } as never;
    expect(getContainerAttachments("cont-1")).toEqual([]);
    addAttachmentToContainer("cont-1", attachment);
    addAttachmentToContainer("cont-1", attachment);
    expect(getContainerAttachments("cont-1")).toHaveLength(2);
    expect(getContainerAttachments("cont-2")).toEqual([]);
    resetContainerFixtures();
    expect(getContainerAttachments("cont-1")).toEqual([]);
  });
});
