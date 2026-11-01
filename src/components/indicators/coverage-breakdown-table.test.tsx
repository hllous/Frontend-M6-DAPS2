import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { IndicatorPoint } from "@/lib/indicators";

import { CoverageBreakdownTable } from "./coverage-breakdown-table";

const point = (index: number, scheduled = 20): IndicatorPoint => ({
  id: `z${index}`,
  label: `Zona ${String(index).padStart(2, "0")}`,
  value: scheduled === 0 ? 0 : index * 5,
  unit: "%",
  details: [
    { label: "Atendidos", value: index, unit: "objetivos" },
    { label: "Parciales", value: 1, unit: "objetivos" },
    { label: "No atendidos", value: 2, unit: "objetivos" },
    { label: "Pendientes", value: 3, unit: "objetivos" },
    { label: "Programados", value: scheduled, unit: "objetivos" },
  ],
});

const points = Array.from({ length: 12 }, (_, index) => point(index + 1));
const names = () => screen.getAllByRole("rowheader").map((header) => header.textContent);
const props = { nameHeading: "Zona", noun: "zonas", title: "Cobertura por zona", initialDirection: "asc" as const, period: { from: "2026-08-08", to: "2026-09-06" }, onSelect: () => {} };

describe("CoverageBreakdownTable", () => {
  it("shows the 10 worst first, expands to all and re-sorts by any column", async () => {
    const user = userEvent.setup();
    render(<CoverageBreakdownTable {...props} points={points} mapHref="/app?destination=map" />);

    expect(names()[0]).toBe("Zona 01");
    expect(names()).toHaveLength(10);
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 10 de 12");
    expect(screen.getByRole("link", { name: "Ver en el mapa" })).toHaveAttribute("href", "/app?destination=map");

    const more = screen.getByRole("button", { name: "Mostrar todas las zonas" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(more).toHaveAttribute("aria-controls", screen.getByRole("table").id);
    await user.click(more);
    expect(names()).toHaveLength(12);
    expect(more).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: /Ordenar por Zona/ }));
    expect(names()[0]).toBe("Zona 01");
    await user.click(screen.getByRole("button", { name: /Ordenar por Zona/ }));
    expect(names()[0]).toBe("Zona 12");
  });

  it("names the zone as the row header and hides the decorative bar from assistive technology", () => {
    const { container } = render(<CoverageBreakdownTable {...props} points={[point(1)]} />);
    expect(screen.getByRole("rowheader", { name: "Zona 01" })).toBeInTheDocument();
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"] span')).not.toBeNull();
  });

  it("sends zones without scheduled targets to the end in both directions, without a 0 % bar", async () => {
    const user = userEvent.setup();
    render(<CoverageBreakdownTable {...props} points={[point(9, 0), ...points.slice(0, 3)]} />);

    expect(names()).toEqual(["Zona 01", "Zona 02", "Zona 03", "Zona 09"]);
    expect(screen.getByText("Sin programados")).toBeVisible();
    expect(screen.queryByText("0 %")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Ordenar por Cobertura/ }));
    expect(names().at(-1)).toBe("Zona 09");
  });

  it("flags low samples with text outside the button and reports the selected row", async () => {
    const onSelect = vi.fn();
    render(<CoverageBreakdownTable {...props} points={[point(1, 2)]} onSelect={onSelect} />);

    expect(screen.getByText("Pocos programados")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Zona 01" }));
    expect(onSelect).toHaveBeenCalledWith("z1");
  });
});
