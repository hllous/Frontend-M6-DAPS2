import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { coverageIndicatorFixture, incidentsIndicatorFixture } from "@/lib/indicator-fixtures";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";
import { IndicatorVariation } from "./indicator-variation";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

const previousPeriod = { from: "2026-07-09", to: "2026-08-07" };

function coverageWithDelta(delta: number | null) {
  return {
    ...coverageIndicatorFixture,
    previous: { ...coverageIndicatorFixture.previous!, period: previousPeriod },
    delta: { ...coverageIndicatorFixture.delta!, coveragePct: delta },
  };
}

function incidentsWithDelta(delta: number | null) {
  return {
    ...incidentsIndicatorFixture,
    previous: { ...incidentsIndicatorFixture.previous!, period: previousPeriod },
    delta: { ...incidentsIndicatorFixture.delta!, avgResolutionDays: delta },
  };
}

async function variationCard(label: string) {
  return screen.findByRole("button", { name: `${label}: seleccionar familia` });
}

describe("variación de las tarjetas de indicadores", () => {
  it("marca como mejor un aumento de cobertura y muestra las fechas anteriores", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(coverageWithDelta(2.2))));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Cobertura");
    expect(within(card).getByText("+2,2 p. p.")).toBeVisible();
    expect(within(card).getByText("Mejor")).toBeVisible();
    expect(within(card).getByText("Período anterior: 09/07/2026 – 07/08/2026")).toBeVisible();
  });

  it.each([
    { delta: -2.2, amount: "-2,2 p. p.", label: "Peor" },
    { delta: 0, amount: "0 p. p.", label: "Sin cambios" },
  ])("interpreta $delta p. p. para una meta min como $label", async ({ delta, amount, label }) => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(coverageWithDelta(delta))));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Cobertura");
    expect(await within(card).findByText(amount)).toBeVisible();
    expect(within(card).getByText(label)).toBeVisible();
  });

  it("uses a missing-data message when a min comparison has a null delta", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(coverageWithDelta(null))));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Cobertura");
    expect(await within(card).findByText("Sin datos del período anterior")).toBeVisible();
    expect(within(card).getByText("Período anterior: 09/07/2026 – 07/08/2026")).toBeVisible();
  });

  it("uses a missing-data message when the comparison is absent", async () => {
    const comparison = { ...coverageIndicatorFixture };
    delete comparison.delta;
    delete comparison.previous;
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(comparison)));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Cobertura");
    expect(await within(card).findByText("Sin datos del período anterior")).toBeVisible();
    expect(within(card).queryByText(/Período anterior:/)).not.toBeInTheDocument();
  });

  it.each([
    { delta: -0.6, amount: "-0,6 días", label: "Mejor" },
    { delta: 0.6, amount: "+0,6 días", label: "Peor" },
    { delta: 0, amount: "0 días", label: "Sin cambios" },
  ])("interprets $delta días for a max target as $label", async ({ delta, amount, label }) => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(incidentsWithDelta(delta))));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Incidencias");
    expect(await within(card).findByText(amount)).toBeVisible();
    expect(within(card).getByText(label)).toBeVisible();
  });

  it("uses a missing-data message for a max comparison with a null delta", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(incidentsWithDelta(null))));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Incidencias");
    expect(await within(card).findByText("Sin datos del período anterior")).toBeVisible();
    expect(within(card).getByText("Período anterior: 09/07/2026 – 07/08/2026")).toBeVisible();
  });

  it("marks a decrease as better for a down target without a numeric goal", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({
      ...coverageWithDelta(-2.2),
      targets: { coveragePct: { direction: "down", value: null } },
    })));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const card = await variationCard("Cobertura");
    expect(await within(card).findByText("-2,2 p. p.")).toBeVisible();
    expect(within(card).getByText("Mejor")).toBeVisible();
    expect(within(card).getByText("Tendencia descendente")).toBeVisible();
  });

  it("uses units for count changes in the reusable variation", () => {
    render(<IndicatorVariation delta={-2} direction="down" unitKind="count" />);

    expect(screen.getByText("-2 unidades")).toBeVisible();
    expect(screen.getByText("Mejor")).toBeVisible();
  });

  it("uses the singular unit for a count change of one", () => {
    render(<IndicatorVariation delta={-1} direction="down" unitKind="count" />);

    expect(screen.getByText("-1 unidad")).toBeVisible();
  });
});
