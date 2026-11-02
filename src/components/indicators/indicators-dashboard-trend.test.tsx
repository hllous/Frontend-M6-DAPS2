import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { coverageIndicatorFixture, coverageMonthlyFixture, coverageWeeklyFixture, coverageWithoutSeriesFixture } from "@/lib/indicator-fixtures";
import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const chart = this.closest<HTMLElement>('[data-slot="chart"]');
    if (!chart) return getBoundingClientRect.call(this);
    const height = Number.parseFloat(chart.style.height) || 56;
    return { x: 0, y: 0, width: 720, height, top: 0, right: 720, bottom: height, left: 0, toJSON: () => ({}) } as DOMRect;
  });
});
afterEach(() => {
  server.resetHandlers();
  olvidarCatalogoDeEtiquetas();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

function serveCoverage(body: object) {
  server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(body)));
}

async function renderTrend() {
  render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
  return screen.findByRole("region", { name: "Tendencia" });
}

describe("IndicatorsDashboard: tendencia semanal de cobertura (#780)", () => {
  it("dibuja un punto por semana con fechas argentinas y la meta como referencia", async () => {
    serveCoverage(coverageWeeklyFixture);
    const trend = await renderTrend();

    const chart = within(trend).getByRole("group", { name: "Cobertura por período" });
    expect(within(chart).getAllByRole("button")).toHaveLength(4);
    expect(within(chart).getByRole("button", { name: /03\/08\/2026 – 09\/08\/2026: 90 %/ })).toBeInTheDocument();
    expect(within(trend).getByText("Meta de cobertura ≥ 95 %")).toBeInTheDocument();
  });

  it("muestra una semana sin programados como «sin datos» y no como 0 %", async () => {
    serveCoverage(coverageWeeklyFixture);
    const trend = await renderTrend();

    const gap = within(trend).getByRole("button", { name: /17\/08\/2026 – 23\/08\/2026: sin datos/ });
    expect(gap.getAttribute("aria-label")).not.toMatch(/0 %/);
  });

  it("rotula por mes cuando el intervalo es mensual", async () => {
    serveCoverage(coverageMonthlyFixture);
    const trend = await renderTrend();

    expect(within(trend).getByRole("button", { name: /julio de 2026: 80 %/ })).toBeInTheDocument();
    expect(within(trend).getByRole("button", { name: /agosto de 2026: 95 %/ })).toBeInTheDocument();
  });

  it("no muestra la sección cuando el backend no devuelve serie", async () => {
    serveCoverage(coverageWithoutSeriesFixture);
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura por zona" });
    expect(screen.queryByRole("region", { name: "Tendencia" })).not.toBeInTheDocument();
  });

  it("avanza de a un período con las flechas y anuncia el valor", async () => {
    const user = userEvent.setup();
    serveCoverage(coverageWeeklyFixture);
    const trend = await renderTrend();
    const buttons = within(trend).getAllByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ });

    act(() => buttons[0].focus());
    expect(buttons[0]).toHaveFocus();
    expect(within(trend).getByRole("status")).toHaveTextContent("03/08/2026 – 09/08/2026");

    await user.keyboard("{ArrowRight}");
    expect(buttons[1]).toHaveFocus();
    expect(within(trend).getByRole("status")).toHaveTextContent("91,7 %");

    await user.keyboard("{ArrowRight}");
    expect(buttons[2]).toHaveFocus();
    expect(within(trend).getByRole("status")).toHaveTextContent("Sin datos");
    expect(within(trend).getByRole("status")).toHaveTextContent("6 programados a futuro");

    await user.keyboard("{End}");
    expect(buttons[3]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(buttons[0]).toHaveFocus();
  });

  it("ofrece la tabla con período, programados, atendidos, programado a futuro y cobertura", async () => {
    const user = userEvent.setup();
    serveCoverage(coverageWeeklyFixture);
    const trend = await renderTrend();

    await user.click(screen.getByRole("button", { name: "Tabla" }));
    const table = await within(trend).findByRole("table");
    for (const heading of ["Período", "Programados", "Atendidos", "Programado a futuro", "Cobertura"]) {
      expect(within(table).getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(5);
    expect(within(rows[3]).getByText("Sin datos")).toBeInTheDocument();
    expect(within(rows[1]).getByText("90 %")).toBeInTheDocument();
  });

  it("muestra el mensaje del backend si rechaza el rango y el resto de la familia sigue", async () => {
    server.use(http.get("*/api/indicators/coverage", ({ request }) => new URL(request.url).searchParams.get("bucket")
      ? HttpResponse.json({ statusCode: 400, message: "El rango supera el máximo de 90 intervalos." }, { status: 400 })
      : HttpResponse.json(coverageIndicatorFixture)));
    const trend = await renderTrend();

    expect(within(trend).getByRole("alert")).toHaveTextContent("El rango supera el máximo de 90 intervalos.");
    expect(await screen.findByRole("heading", { name: "Cobertura por zona" })).toBeInTheDocument();
  });

  it("pide la serie con los filtros aplicados", async () => {
    const urls: URL[] = [];
    server.use(http.get("*/api/indicators/coverage", ({ request }) => { urls.push(new URL(request.url)); return HttpResponse.json(coverageWeeklyFixture); }));
    window.history.replaceState(null, "", "/?zoneId=zone-1");
    await renderTrend();

    await waitFor(() => expect(urls.length).toBeGreaterThan(0));
    expect(urls[0].searchParams.get("bucket")).toBe("week");
    expect(urls[0].searchParams.get("zoneId")).toBe("zone-1");
  });
});
