import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { indicatorsAdapter } from "./indicators";
import { coverageIndicatorFixture } from "./indicator-fixtures";
import { handlers } from "@/mocks/handlers";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
it("exposes the backend coverage target and low-sample and future counts", async () => {
  server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ ...coverageIndicatorFixture, totals: { ...coverageIndicatorFixture.totals, upcoming: 7 }, byZone: [{ ...coverageIndicatorFixture.byZone[0], upcoming: 3, lowSample: true }], targets: { coveragePct: { value: 90, direction: "min" } } })));
  const data = await indicatorsAdapter.getCoverage();
  expect(data.targets?.coveragePct).toEqual({ value: 90, direction: "min" });
  expect(data.summaryMetrics).toContainEqual({ label: "Programado a futuro", value: 7, unit: "objetivos" });
  expect(data.breakdowns[0].points[0]).toMatchObject({ lowSample: true });
});
import { describe } from "vitest";


describe("contrato de indicadores", () => {
  it("conserva series, comparación y metas sin número para las familias", async () => {
    const incidents = await indicatorsAdapter.getIncidents();
    const waste = await indicatorsAdapter.getWaste();
    expect(incidents.targets?.overflowTrend).toEqual({ direction: "down", value: null });
    expect(incidents.containers.history?.pendingDamage).toBeNull();
    expect(incidents.series?.[0].withinDeadline?.pct).toBe(100);
    expect(incidents.delta?.pendingDamage).toBeNull();
    expect(waste.targets?.landfillDiversionPct).toBeNull();
    expect(waste.series?.[0].divertedPct).toBe(42.7);
  });

  it("tolera bloques ausentes y direcciones desconocidas sin perder el valor", async () => {
    const { series, previous, delta, targets, ...old } = coverageIndicatorFixture;
    void series; void previous; void delta; void targets;
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ ...old, targets: { coveragePct: { value: 80, direction: "future" } } })));
    const result = await indicatorsAdapter.getCoverage();
    expect(result.primary.value).toBe(82.2);
    expect(result.series).toBeUndefined();
    expect(result.targets?.coveragePct?.direction).toBe("future");
  });

  it("usa la meta local cuando faltan los bloques opcionales", async () => {
    const { series, previous, delta, targets, ...old } = coverageIndicatorFixture;
    void series; void previous; void delta; void targets;
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(old)));
    const result = await indicatorsAdapter.getCoverage();
    expect(result.targets?.coveragePct).toEqual({ value: 95, direction: "min" });
    expect(result.previous).toBeUndefined();
    expect(result.delta).toBeUndefined();
  });

  it("propaga el mensaje del servidor cuando el rango supera el límite", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ statusCode: 400, message: "Demasiados intervalos" }, { status: 400 })));
    await expect(indicatorsAdapter.getCoverage()).rejects.toThrow("Demasiados intervalos");
  });

  it("solicita comparación y elige meses para más de noventa semanas", async () => {
    let actual = "";
    server.use(http.get("*/api/indicators/coverage", ({ request }) => { actual = request.url; return HttpResponse.json(coverageIndicatorFixture); }));
    await indicatorsAdapter.getCoverage({ from: "2020-01-01", to: "2022-01-01" });
    expect(new URL(actual).searchParams.get("bucket")).toBe("month");
    expect(new URL(actual).searchParams.get("compare")).toBe("previous");
  });
});

