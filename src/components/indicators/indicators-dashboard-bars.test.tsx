import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

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

describe("IndicatorsDashboard: barras accesibles (#778)", () => {
  it("muestra la pista textual del tono junto a cada categoría", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    await user.click(within(familyBand).getByRole("button", { name: "Cumplimiento: seleccionar familia" }));

    const chart = await screen.findByRole("group", { name: "Barras de finalización en fecha" });
    expect(within(chart).getByText("Favorable")).toBeVisible();
    expect(within(chart).getByText("Atención")).toBeVisible();
  });

  it("permite seleccionar una barra de Cumplimiento con el teclado y cerrar su detalle con Escape", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    await user.click(within(familyBand).getByRole("button", { name: /Cumplimiento: seleccionar familia/i }));

    const chart = await screen.findByRole("group", { name: "Barras de finalización en fecha" });
    const bar = within(chart).getByRole("button", { name: /En fecha.*344 servicios/i });
    bar.focus();
    expect(bar).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(bar).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status", { name: "Detalle fijado de En fecha" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("status", { name: /Detalle .*En fecha/ })).not.toBeInTheDocument();
    expect(bar).toHaveFocus();
  });

  it.each([
    {
      family: "Cumplimiento",
      chart: "Barras de finalización en fecha",
      barName: /En fecha: 344 servicios/,
    },
    {
      family: "Incidencias",
      chart: "Barras de contenedores por zona",
      barName: /Centro: 8 incidentes/,
      recordName: /CONT-001/,
    },
    {
      family: "Residuos",
      chart: "Barras de residuos por destino",
      barName: /Centro de recuperación: 10\.620 kg/,
    },
  ])("mantiene accesibles las barras y la tabla alternativa de $family", async ({ family, chart: chartName, barName, recordName }) => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    await user.click(within(familyBand).getByRole("button", { name: `${family}: seleccionar familia` }));

    const chart = await screen.findByRole("group", { name: chartName });
    const bar = within(chart).getByRole("button", { name: barName });
    bar.focus();
    expect(bar).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(bar).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status", { name: /Detalle fijado de/ })).toBeVisible();
    if (recordName) expect(await screen.findByRole("row", { name: recordName })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("status", { name: /Detalle .*Centro/ })).not.toBeInTheDocument();
    expect(bar).toHaveFocus();
    expect(bar).toHaveAttribute("aria-pressed", "false");

    const viewToggle = screen.queryByRole("group", { name: "Vista" }) ?? screen.getByRole("group", { name: "Vista del detalle" });
    await user.click(within(viewToggle).getByRole("button", { name: "Tabla" }));
    const tableRegion = await screen.findByRole("region", { name: `Tabla de datos de ${family}` });
    expect(within(tableRegion).getAllByRole("table")[0]).toBeVisible();
  });
});
