import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { IndicatorPoint } from "@/lib/indicators";

import { CoverageBreakdownTable } from "./coverage-breakdown-table";

const point: IndicatorPoint = {
  id: "z1",
  label: "Zona 01",
  value: 50,
  unit: "%",
  details: [
    { label: "Atendidos", value: 5, unit: "objetivos" },
    { label: "Parciales", value: 1, unit: "objetivos" },
    { label: "No atendidos", value: 2, unit: "objetivos" },
    { label: "Pendientes", value: 3, unit: "objetivos" },
    { label: "Programados", value: 11, unit: "objetivos" },
  ],
};

const props = { nameHeading: "Zona", noun: "zonas", title: "Cobertura por zona", initialDirection: "asc" as const, period: { from: "2026-08-08", to: "2026-09-06" }, onSelect: () => {} };

describe("CoverageBreakdownTable: cuadro de porcentajes con teclado", () => {
  it("abre al pasar el mouse y se cierra con Escape devolviendo el foco a la barra", async () => {
    const user = userEvent.setup();
    render(<CoverageBreakdownTable {...props} points={[point]} />);
    const trigger = screen.getByRole("button", { name: "Porcentajes de Zona 01" });

    await user.hover(trigger);
    expect(await screen.findByRole("dialog")).toBeVisible();

    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
