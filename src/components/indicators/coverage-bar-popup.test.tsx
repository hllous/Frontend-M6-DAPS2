import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IndicatorPoint } from "@/lib/indicators";

import { CoverageBreakdownTable } from "./coverage-breakdown-table";

const point: IndicatorPoint = {
  id: "zone-3",
  label: "Norte",
  value: 50,
  unit: "%",
  details: [
    { label: "Atendidos", value: 1, unit: "objetivos" },
    { label: "Parciales", value: 1, unit: "objetivos" },
    { label: "No atendidos", value: 2, unit: "objetivos" },
    { label: "Pendientes", value: 4, unit: "objetivos" },
    { label: "Programados", value: 8, unit: "objetivos" },
  ],
};
const props = { nameHeading: "Zona", noun: "zonas", title: "Cobertura por zona", initialDirection: "asc" as const, period: { from: "2026-08-08", to: "2026-09-06" }, onSelect: () => {}, points: [point] };

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-08-20T15:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("Barras de cobertura: cuadro con el detalle por tramo", () => {
  it("se abre al enfocar la barra y muestra el porcentaje de cada tramo", async () => {
    render(<CoverageBreakdownTable {...props} />);
    const trigger = screen.getAllByRole("button").find((button) => /Porcentajes de Norte/.test(button.getAttribute("aria-label") ?? ""))!;
    act(() => trigger.focus());
    const popup = await screen.findByRole("dialog", { name: /Norte/ });
    for (const [name, pct] of [["Atendidos", "12,5"], ["Parciales", "12,5"], ["No atendidos", "25"], ["Pendientes", "50"]]) {
      expect(within(popup).getByRole("link", { name: new RegExp(`${name}.*${pct} %`) })).toBeVisible();
    }
  });

  it("se abre al pasar el mouse y al tocar", async () => {
    const user = userEvent.setup();
    render(<CoverageBreakdownTable {...props} />);
    const trigger = screen.getByRole("button", { name: /Porcentajes de Norte/ });
    await user.hover(trigger);
    expect(await screen.findByRole("dialog", { name: /Norte/ })).toBeVisible();
    await user.keyboard("{Escape}");
    await user.unhover(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: /Norte/ })).toBeVisible();
  });

  it("cada tramo abre Servicios con la zona, el período exacto y el estado", async () => {
    render(<CoverageBreakdownTable {...props} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Porcentajes de Norte/ }));
    const popup = await screen.findByRole("dialog", { name: /Norte/ });
    const href = (name: RegExp) => within(popup).getByRole("link", { name }).getAttribute("href")!;
    const base = "/app?destination=services";
    expect(href(/^Atendidos/)).toBe(`${base}&status=COMPLETED&zone=zone-3&from=2026-08-08&to=2026-09-06`);
    expect(href(/^Parciales/)).toBe(`${base}&status=PARTIALLY_COMPLETED&zone=zone-3&from=2026-08-08&to=2026-09-06`);
    expect(href(/^No atendidos/)).toBe(`${base}&status=CANCELLED&status=SUSPENDED&zone=zone-3&from=2026-08-08&to=2026-09-06`);
    // Pendientes: lo futuro es «Programado a futuro», así que el rango termina hoy.
    expect(href(/^Pendientes/)).toBe(`${base}&status=SCHEDULED&status=RESCHEDULED&status=IN_PROGRESS&zone=zone-3&from=2026-08-08&to=2026-08-20`);
  });

  it("en tipos de servicio filtra por serviceType", async () => {
    render(<CoverageBreakdownTable {...props} nameHeading="Tipo de servicio" noun="tipos de servicio" title="Cobertura por tipo de servicio" points={[{ ...point, id: "st-waste-route", label: "Recolección" }]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Porcentajes de Recolección/ }));
    const popup = await screen.findByRole("dialog");
    expect(within(popup).getByRole("link", { name: /^Atendidos/ })).toHaveAttribute("href", expect.stringContaining("serviceType=st-waste-route"));
  });

  it("no ofrece enlace en un tramo sin objetivos", async () => {
    const empty = { ...point, details: point.details!.map((detail) => detail.label === "Parciales" ? { ...detail, value: 0 } : detail) };
    render(<CoverageBreakdownTable {...props} points={[empty]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Porcentajes de Norte/ }));
    const popup = await screen.findByRole("dialog");
    expect(within(popup).queryByRole("link", { name: /^Parciales/ })).not.toBeInTheDocument();
    expect(within(popup).getByText(/Parciales/)).toBeVisible();
  });
});
