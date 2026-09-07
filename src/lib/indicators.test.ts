import { afterEach, describe, expect, it, vi } from "vitest";

import { complianceIndicatorFixture, coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "./indicator-fixtures";
import { indicatorsAdapter, IndicatorContractError, resolveIndicatorQuery } from "./indicators";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("indicatorsAdapter", () => {
  it("uses the last 30 days when the period is omitted", () => {
    expect(resolveIndicatorQuery({}, new Date("2026-09-07T12:00:00.000Z"))).toEqual({ from: "2026-08-09", to: "2026-09-07" });
  });

  it("forwards coverage and compliance filters, but keeps snapshot families period-only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes("/coverage")) return new Response(JSON.stringify(coverageIndicatorFixture));
      if (path.includes("/compliance")) return new Response(JSON.stringify(complianceIndicatorFixture));
      if (path.includes("/incidents")) return new Response(JSON.stringify(incidentsIndicatorFixture));
      return new Response(JSON.stringify(wasteIndicatorFixture));
    });

    await indicatorsAdapter.getCoverage({ from: "2026-08-08", to: "2026-09-06", zoneId: "zone-2", serviceTypeId: "service-sweeping" });
    await indicatorsAdapter.getCompliance({ from: "2026-08-08", to: "2026-09-06", zoneId: "zone-2", serviceTypeId: "service-sweeping" });
    await indicatorsAdapter.getIncidents({ from: "2026-08-08", to: "2026-09-06", zoneId: "zone-2", serviceTypeId: "service-sweeping" });
    await indicatorsAdapter.getWaste({ from: "2026-08-08", to: "2026-09-06", zoneId: "zone-2", serviceTypeId: "service-sweeping" });

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/indicators/coverage?from=2026-08-08&to=2026-09-06&zoneId=zone-2&serviceTypeId=service-sweeping",
      "/api/indicators/compliance?from=2026-08-08&to=2026-09-06&zoneId=zone-2&serviceTypeId=service-sweeping",
      "/api/indicators/incidents?from=2026-08-08&to=2026-09-06",
      "/api/indicators/waste?from=2026-08-08&to=2026-09-06",
    ]);
  });

  it("normalizes the four validated families for the dashboard boundary", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes("/coverage")) return new Response(JSON.stringify(coverageIndicatorFixture));
      if (path.includes("/compliance")) return new Response(JSON.stringify(complianceIndicatorFixture));
      if (path.includes("/incidents")) return new Response(JSON.stringify(incidentsIndicatorFixture));
      return new Response(JSON.stringify(wasteIndicatorFixture));
    });

    const [coverage, compliance, incidents, waste] = await Promise.all([
      indicatorsAdapter.getCoverage(),
      indicatorsAdapter.getCompliance(),
      indicatorsAdapter.getIncidents(),
      indicatorsAdapter.getWaste(),
    ]);

    expect(coverage).toMatchObject({ family: "coverage", primary: { value: 88.6, unit: "%" } });
    expect(coverage.summaryMetrics).toEqual([
      { label: "Atendidos", value: 418, unit: "objetivos" },
      { label: "Programados", value: 472, unit: "objetivos" },
    ]);
    expect(coverage.breakdowns[0]?.points[0]).toMatchObject({
      label: "Centro",
      value: 93.6,
      details: [
        { label: "Atendidos", value: 146, unit: "objetivos" },
        { label: "Programados", value: 156, unit: "objetivos" },
      ],
    });
    expect(compliance.breakdowns[1]?.points[0]).toMatchObject({ label: "Norte", value: 12, note: "Falta de cuadrilla" });
    expect(compliance.summaryMetrics).toEqual([
      { label: "Finalizados", value: 390, unit: "servicios" },
      { label: "En fecha", value: 344, unit: "servicios" },
      { label: "Demorados", value: 46, unit: "servicios" },
    ]);
    expect(incidents.primary).toMatchObject({ value: 21.5, unit: "h" });
    expect(waste).toMatchObject({ family: "waste", primary: { value: 42.7, unit: "%" } });
  });

  it("rejects a malformed family response at runtime", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ malformed: true }), { status: 200 }));
    await expect(indicatorsAdapter.getCoverage()).rejects.toBeInstanceOf(IndicatorContractError);
  });
});
