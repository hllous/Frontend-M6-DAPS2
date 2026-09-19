import { describe, expect, it } from "vitest";

import type { CoverageIndicator } from "./indicators";
import type { OperationalZone } from "./operational-zones";
import { buildCoverageZoneOverlays, coverageBandForRate } from "./map-coverage";

const zones: OperationalZone[] = [
  {
    code: "Z-BEL",
    name: "Belgrano",
    sourceName: "Belgrano",
    coordinates: [[[-34.55, -58.45]]],
    center: [-34.55, -58.45],
    zone: { id: "zone-bel", code: "Z-BEL", name: "Belgrano", active: true, neighborhoodIds: [] },
  },
  {
    code: "Z-PAL",
    name: "Palermo",
    sourceName: "Palermo",
    coordinates: [[[-34.57, -58.42]]],
    center: [-34.57, -58.42],
    zone: { id: "zone-pal", code: "Z-PAL", name: "Palermo", active: true, neighborhoodIds: [] },
  },
];

const coverage: CoverageIndicator = {
  family: "coverage",
  period: { from: "2026-08-10", to: "2026-09-10" },
  freshness: { updatedAt: "2026-09-10T12:00:00.000Z" },
  primary: { value: 84.2, label: "Cobertura de objetivos", unit: "%" },
  summaryMetrics: [],
  breakdowns: [
    {
      id: "zones",
      title: "Cobertura por zona",
      description: "Objetivos atendidos sobre objetivos programados.",
      points: [
        {
          id: "zone-bel",
          label: "Belgrano",
          value: 92.5,
          unit: "%",
          note: "148 de 160 objetivos",
        },
      ],
    },
  ],
};

describe("map coverage", () => {
  it("joins coverage points to the four-zone geometry and preserves missing data", () => {
    const result = buildCoverageZoneOverlays(zones, coverage);

    expect(result).toEqual([
      expect.objectContaining({
        zoneCode: "Z-BEL",
        zoneName: "Belgrano",
        rate: 92.5,
        note: "148 de 160 objetivos",
        band: "high",
      }),
      expect.objectContaining({
        zoneCode: "Z-PAL",
        zoneName: "Palermo",
        rate: null,
        note: "Sin datos para el período",
        band: "no-data",
      }),
    ]);
  });

  it.each([
    [null, "no-data"],
    [59.9, "low"],
    [60, "partial"],
    [80, "good"],
    [90, "high"],
  ] as const)("maps %s%% to the %s semantic band", (rate, expected) => {
    expect(coverageBandForRate(rate)).toBe(expected);
  });
});
