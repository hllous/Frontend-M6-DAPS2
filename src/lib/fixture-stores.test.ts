import { beforeEach, describe, expect, it } from "vitest";

import {
  addAttachmentToInspection,
  environmentalInspectionFixtures,
  getInspectionAttachments,
  linkEnvironmentalInspectionService,
  resetEnvironmentalReportFixtures,
  updateEnvironmentalInspectionFixture,
} from "./environmental-report-fixtures";
import { addRouteFixture, getRouteFixture, getRouteReferences, resetRouteFixtures, updateRouteFixture } from "./routes-fixtures";
import { addZoneFixture, getZoneReferences, resetZoneFixtures, updateZoneFixture, zoneFixtures } from "./zones-fixtures";

beforeEach(() => {
  resetZoneFixtures();
  resetRouteFixtures();
  resetEnvironmentalReportFixtures();
});

describe("zone fixtures", () => {
  it("updates a zone but never its immutable code", () => {
    const original = zoneFixtures[0]!;
    const updated = updateZoneFixture(original.id, { name: "Nombre nuevo", code: "OTRO-CODIGO", active: false });
    expect(updated).toMatchObject({ id: original.id, code: original.code, name: "Nombre nuevo", active: false });
    expect(zoneFixtures[0]).toEqual(updated);
    expect(updateZoneFixture("zone-inexistente", { name: "x" })).toBeNull();
  });

  it("adds a zone and drops it on reset", () => {
    const before = zoneFixtures.length;
    addZoneFixture({ ...zoneFixtures[0]!, id: "zone-extra", code: "EXTRA" });
    expect(zoneFixtures).toHaveLength(before + 1);
    resetZoneFixtures();
    expect(zoneFixtures).toHaveLength(before);
  });

  it("reports the references that block deactivating the first two zones and none for the rest", () => {
    expect(getZoneReferences("zone-1")).toMatchObject({ containersCount: 3, treesCount: 12, greenSpacesCount: 2, totalReferences: 18 });
    expect(getZoneReferences("zone-1").activeRoutes.map((route) => route.code)).toEqual(["R-01"]);
    expect(getZoneReferences("zone-2")).toMatchObject({ totalReferences: 7 });
    expect(getZoneReferences("zone-9")).toMatchObject({ activeRoutes: [], totalReferences: 0 });
  });
});

describe("route fixtures", () => {
  it("updates a route without touching its code and refreshes updatedAt", () => {
    const original = getRouteFixture("route-1")!;
    const updated = updateRouteFixture("route-1", { name: "Recorrido renombrado", code: "XX" })!;
    expect(updated.code).toBe(original.code);
    expect(updated.name).toBe("Recorrido renombrado");
    expect(updated.updatedAt >= original.updatedAt).toBe(true);
    expect(updateRouteFixture("route-x", { name: "y" })).toBeNull();
  });

  it("adds a route and finds it", () => {
    addRouteFixture({ ...getRouteFixture("route-1")!, id: "route-extra" });
    expect(getRouteFixture("route-extra")).not.toBeNull();
  });

  it("lists the service frequencies that reference a route", () => {
    expect(getRouteReferences("route-1")).toMatchObject({ totalReferences: 1, activeServiceFrequencies: [{ id: "freq-1", shift: "MAÑANA" }] });
    expect(getRouteReferences("route-2").activeServiceFrequencies[0]).toMatchObject({ id: "freq-2", shift: "NOCHE" });
    expect(getRouteReferences("route-9")).toEqual({ routeId: "route-9", activeServiceFrequencies: [], totalReferences: 0 });
  });
});

describe("environmental inspection fixtures", () => {
  it("returns null attachments for an unknown inspection and adds one to a known inspection", () => {
    const inspection = environmentalInspectionFixtures[0]!;
    const before = getInspectionAttachments(inspection.id)!.length;
    expect(getInspectionAttachments("insp-inexistente")).toBeNull();
    expect(addAttachmentToInspection("insp-inexistente", { id: "a" } as never)).toBe(false);

    expect(addAttachmentToInspection(inspection.id, { id: "att-nuevo", fileName: "acta.pdf" } as never)).toBe(true);
    const after = getInspectionAttachments(inspection.id)!;
    expect(after).toHaveLength(before + 1);
    expect(after.at(-1)).toMatchObject({ id: "att-nuevo" });
  });

  it("links a service to an inspection and keeps the checklist when updating", () => {
    const inspection = environmentalInspectionFixtures[0]!;
    const linked = linkEnvironmentalInspectionService(inspection.id, "SVC-1234")!;
    expect(linked.serviceId).toBe("SVC-1234");
    expect(linked.checklist).toEqual(inspection.checklist);
    expect(linkEnvironmentalInspectionService("insp-x", "SVC-1")).toBeNull();
    expect(updateEnvironmentalInspectionFixture("insp-x", {})).toBeNull();
  });
});
