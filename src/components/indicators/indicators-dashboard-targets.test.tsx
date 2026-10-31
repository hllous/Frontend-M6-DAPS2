import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  window.history.replaceState(null, "", "/");
  olvidarCatalogoDeEtiquetas();
});
afterAll(() => server.close());

function rowFor(table: HTMLElement, label: string) {
  const row = within(table).getAllByRole("row").find((candidate) =>
    within(candidate).queryByRole("rowheader")?.textContent?.includes(label),
  );

  if (!row) throw new Error(`No se encontró la fila «${label}».`);
  return within(row);
}

describe("metas de las tablas de cobertura", () => {
  it("marca bajo la meta en las tablas por zona y tipo de servicio", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const zones = await screen.findByRole("table", { name: /Cobertura por zona/ });
    const serviceTypes = await screen.findByRole("table", { name: /Cobertura por tipo de servicio/ });

    const detailRegion = screen.getByRole("region", { name: "Detalle de Cobertura" });
    expect(within(detailRegion).getAllByText("Meta ≥ 95 %")).toHaveLength(2);

    for (const [table, belowLabel, atLabel, aboveLabel, noScheduledLabel] of [
      [zones, "Zona con cobertura baja", "Zona en meta", "Zona sobre meta", "Zona sin programados"],
      [serviceTypes, "Tipo con cobertura baja", "Tipo en meta", "Tipo sobre meta", "Tipo sin programados"],
    ] as const) {
      const below = rowFor(table, belowLabel);
      expect(below.getByText("Bajo la meta")).toBeVisible();
      expect(below.getByText("Pocos programados")).toBeVisible();
      expect(below.getByText("50 %")).toBeVisible();

      const at = rowFor(table, atLabel);
      expect(at.getByText("95 %")).toBeVisible();
      expect(at.queryByText("Bajo la meta")).not.toBeInTheDocument();

      const above = rowFor(table, aboveLabel);
      expect(above.getByText("98 %")).toBeVisible();
      expect(above.queryByText("Bajo la meta")).not.toBeInTheDocument();

      const withoutScheduled = rowFor(table, noScheduledLabel);
      expect(withoutScheduled.getByText("Sin programados")).toBeVisible();
      expect(withoutScheduled.queryByText("Bajo la meta")).not.toBeInTheDocument();
    }
  });
});
