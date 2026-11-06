import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { defaultIndicatorTarget, indicatorsAdapter } from "./indicators";
import { coverageIndicatorFixture, incidentsStage2NoDataFixture } from "./indicator-fixtures";
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
  it("usa días hábiles como resolución principal y conserva los días corridos", async () => {
    const incidents = await indicatorsAdapter.getIncidents();

    expect(incidents.primary).toEqual({ value: 1.8, label: "Resolución media de reportes", unit: "días hábiles" });
    expect(incidents.reports.avgResolutionDays).toBe(2.4);
  });

  it("conserva los valores nulos de etapa 2 y la fecha de inicio del historial", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(incidentsStage2NoDataFixture)));

    const incidents = await indicatorsAdapter.getIncidents();

    expect(incidents.reports.withinDeadline?.pct).toBeNull();
    expect(incidents.reports.overdue?.pct).toBeNull();
    expect(incidents.containers.history?.pendingDamage).toBeNull();
    expect(incidents.containers.history?.trackingSince).toBe("2026-10-30T15:00:00.000Z");
  });

  it("conserva comparaciones y metas sin número y pide series para incidencias", async () => {
    const requests: URL[] = [];
    const recordRequest = ({ request }: { request: Request }) => requests.push(new URL(request.url));
    server.events.on("request:start", recordRequest);
    const incidents = await indicatorsAdapter.getIncidents();
    const waste = await indicatorsAdapter.getWaste();
    server.events.removeListener("request:start", recordRequest);
    expect(incidents.targets?.overflowTrend).toEqual({ direction: "down", value: null });
    expect(incidents.containers.history?.pendingDamage).toBeNull();
    expect(requests.find((url) => url.pathname.endsWith("/incidents"))?.searchParams.get("bucket")).toBe("week");
    expect(incidents.series?.length).toBeGreaterThan(0);
    expect(incidents.delta?.pendingDamage).toBeNull();
    expect(waste.targets?.landfillDiversionPct).toBeNull();
    expect(waste.series).toBeUndefined();
    expect(requests.find((url) => url.pathname.endsWith("/waste"))?.searchParams.has("bucket")).toBe(false);
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

  it("mantiene la meta local en el detalle sin inventarla en los datos recibidos", async () => {
    const { series, previous, delta, targets, ...old } = coverageIndicatorFixture;
    void series; void previous; void delta; void targets;
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(old)));
    const result = await indicatorsAdapter.getCoverage();
    expect(result.targets).toBeUndefined();
    expect(result.breakdowns[0]?.target).toEqual(defaultIndicatorTarget("coverage"));
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

