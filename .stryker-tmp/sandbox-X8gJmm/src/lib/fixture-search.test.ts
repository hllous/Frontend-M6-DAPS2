// @ts-nocheck
import { describe, expect, it } from "vitest";

import { filterContainerFixtures } from "./containers-fixtures";
import { filterDisposalSiteFixtures } from "./disposal-site-fixtures";
import { environmentalReportFixtures, filterEnvironmentalReportFixtures } from "./environmental-report-fixtures";
import { matchesSearch } from "./fixture-search";
import { filterGreenPointFixtures } from "./green-point-fixtures";
import { filterRouteFixtures, routeFixtures } from "./routes-fixtures";
import { filterServiceTypeFixtures } from "./service-type-fixtures";
import { filterTreeFixtures } from "./tree-fixtures";

describe("matchesSearch", () => {
  it("matches any field, partially and case-insensitively", () => {
    expect(matchesSearch("rivA", ["Av. Rivadavia 100", null])).toBe(true);
    expect(matchesSearch("tk-2026", [null, "TK-2026-000048"])).toBe(true);
    expect(matchesSearch("zzz", ["Av. Rivadavia 100", undefined])).toBe(false);
  });

  it("does not filter when search is empty or blank", () => {
    expect(matchesSearch(undefined, [])).toBe(true);
    expect(matchesSearch("   ", [null])).toBe(true);
  });

  it("does not match across the boundary of two fields, like the Backend", () => {
    expect(matchesSearch("2100 arb", ["Av. Cabildo 2100", "ARB-00442"])).toBe(false);
  });
});

// Los mismos campos que el `search` del Backend (hllous/Backend-M6-DAPS2#677).
describe("fixture search mirrors the Backend fields", () => {
  it("environmental reports: address, caseNumber and publicId, not description or ids", () => {
    const report = environmentalReportFixtures.find((item) => item.publicId && item.caseNumber)!;
    expect(filterEnvironmentalReportFixtures({ search: report.caseNumber!.toLowerCase() }).map((item) => item.id)).toContain(report.id);
    expect(filterEnvironmentalReportFixtures({ search: report.publicId!.toLowerCase() }).map((item) => item.id)).toContain(report.id);
    expect(filterEnvironmentalReportFixtures({ search: report.id })).toEqual([]);
    expect(filterEnvironmentalReportFixtures({ search: report.ticketId! })).toEqual([]);
  });

  it("containers: code or address", () => {
    expect(filterContainerFixtures({ search: "zzz-no" })).toEqual([]);
    const [first] = filterContainerFixtures({});
    expect(filterContainerFixtures({ search: first.code.toLowerCase() })).toContainEqual(first);
  });

  it("disposal sites and service types: code or name", () => {
    const [site] = filterDisposalSiteFixtures({});
    expect(filterDisposalSiteFixtures({ search: site.code.toLowerCase() })).toContainEqual(site);
    const [type] = filterServiceTypeFixtures({});
    expect(filterServiceTypeFixtures({ search: type.code.toLowerCase() })).toContainEqual(type);
  });

  it("routes: code or name", () => {
    const [route] = routeFixtures;
    expect(filterRouteFixtures({ search: route.code.toLowerCase() })).toContainEqual(route);
  });

  it("trees: surveyCode, species or address", () => {
    expect(filterTreeFixtures({ search: "arb-00442" }).map((tree) => tree.id)).toEqual(["tree-1"]);
  });

  it("green points: code, name or address", () => {
    expect(filterGreenPointFixtures({ search: "gp-002" }).map((point) => point.id)).toEqual(["green-point-2"]);
  });
});
