import { afterEach, describe, expect, it, vi } from "vitest";

import { complianceIndicatorFixture, coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "./indicator-fixtures";
import { indicatorQueryErrorMessage, indicatorQuerySchema, indicatorsAdapter, IndicatorContractError, INVERTED_RANGE_MESSAGE, resolveIndicatorQuery } from "./indicators";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("indicatorsAdapter", () => {
  it("accepts null as the backend bucket for no not-serviced reason", async () => {
    const response = structuredClone(complianceIndicatorFixture);
    response.notServicedRanking[0].reasons = [{ reason: null as never, count: 1 }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(response)));

    const result = await indicatorsAdapter.getCompliance({});

    expect(result.breakdowns[1]?.points[0]).toMatchObject({
      note: "Sin motivo registrado",
      details: [{ label: "Sin motivo registrado", value: 1, unit: "objetivos" }],
    });
  });

  it("rejects an inverted date range with a message on the `to` field", () => {
    const result = indicatorQuerySchema.safeParse({ from: "2026-09-20", to: "2026-09-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["to"], message: INVERTED_RANGE_MESSAGE });
    expect(indicatorQueryErrorMessage(result.error!)).toBe(INVERTED_RANGE_MESSAGE);
  });

  it("accepts equal, open-ended and ordered ranges and still rejects unknown keys", () => {
    expect(indicatorQuerySchema.safeParse({ from: "2026-09-01", to: "2026-09-01" }).success).toBe(true);
    expect(indicatorQuerySchema.safeParse({ from: "2026-09-01" }).success).toBe(true);
    expect(indicatorQuerySchema.safeParse({ to: "2026-09-01" }).success).toBe(true);
    expect(indicatorQuerySchema.safeParse({ from: "2026-09-01", to: "2026-09-20" }).success).toBe(true);
    expect(indicatorQuerySchema.safeParse({ from: "2026-09-01", extra: "x" }).success).toBe(false);
  });

  it("does not call the backend for an inverted range", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(indicatorsAdapter.getCoverage({ from: "2026-09-20", to: "2026-09-01" })).rejects.toThrow(INVERTED_RANGE_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

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

    expect(coverage).toMatchObject({ family: "coverage", primary: { value: 82.2, unit: "%" } });
    expect(coverage.summaryMetrics).toEqual([
      { label: "Atendidos", value: 388, unit: "objetivos" },
      { label: "Parciales", value: 30, unit: "objetivos" },
      { label: "Pendientes", value: 30, unit: "objetivos" },
      { label: "Programados", value: 472, unit: "objetivos" },
    ]);
    // El punto conserva el id de zona del backend: el mapa cruza la cobertura por ese id.
    expect(coverage.breakdowns[0]?.points[0]).toMatchObject({
      id: "zone-1",
      label: "Centro",
      value: 89.7,
      note: "140 de 156 objetivos",
      details: [
        { label: "Atendidos", value: 140, unit: "objetivos" },
        { label: "Parciales", value: 6, unit: "objetivos" },
        { label: "No atendidos", value: 4, unit: "objetivos" },
        { label: "Pendientes", value: 6, unit: "objetivos" },
        { label: "Programados", value: 156, unit: "objetivos" },
      ],
    });
    expect(compliance.breakdowns[1]?.points[0]).toMatchObject({
      id: "zone-3",
      label: "Norte",
      value: 12,
      note: "Cuadrilla no disponible · Condición meteorológica",
    });
    expect(compliance.summaryMetrics).toEqual([
      { label: "Finalizados", value: 390, unit: "servicios" },
      { label: "En fecha", value: 344, unit: "servicios" },
      { label: "Demorados", value: 46, unit: "servicios" },
    ]);
    expect(incidents.primary).toMatchObject({ value: 2.4, unit: "días" });
    // El riesgo de arbolado se ordena de crítico a sin riesgo, no como llega.
    expect(incidents.breakdowns.find((item) => item.id === "tree-risk")?.points.map((point) => point.label))
      .toEqual(["Crítico", "Alto", "Medio", "Bajo", "Sin riesgo"]);
    expect(incidents.breakdowns.find((item) => item.id === "report-status")?.points[0])
      .toMatchObject({ label: "Recibido", value: 8 });
    expect(waste).toMatchObject({ family: "waste", primary: { value: 42.7, unit: "%" } });
    expect(waste.breakdowns[0]?.points[0]).toMatchObject({ label: "Domiciliarios", value: 9300, unit: "kg" });
    expect(waste.breakdowns[1]?.points[0]).toMatchObject({ label: "Centro de recuperación", value: 10620 });
  });

  it("rejects a malformed family response at runtime", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ malformed: true }), { status: 200 }));
    await expect(indicatorsAdapter.getCoverage()).rejects.toBeInstanceOf(IndicatorContractError);
  });
});
