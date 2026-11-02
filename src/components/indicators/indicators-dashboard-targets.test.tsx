import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import type { CoverageWire } from "@/lib/indicators";
import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

const targetBoundaryRows = {
  byZone: [
    { id: "zone-below-target", code: "TEST-BAJO", name: "Zona con cobertura baja", scheduled: 4, served: 2, partial: 0, notServiced: 0, pending: 2, upcoming: 3, lowSample: true, coveragePct: 50 },
    { id: "zone-at-target", code: "TEST-META", name: "Zona en meta", scheduled: 20, served: 19, partial: 0, notServiced: 0, pending: 1, coveragePct: 95 },
    { id: "zone-above-target", code: "TEST-SOBRE", name: "Zona sobre meta", scheduled: 100, served: 98, partial: 0, notServiced: 0, pending: 2, coveragePct: 98 },
    { id: "zone-no-scheduled", code: "TEST-SIN-PROGRAMAR", name: "Zona sin programados", scheduled: 0, served: 0, partial: 0, notServiced: 0, pending: 0, coveragePct: 0 },
  ],
  byServiceType: [
    { id: "st-below-target", code: "TEST-BAJO", name: "Tipo con cobertura baja", scheduled: 4, served: 2, partial: 0, notServiced: 0, pending: 2, upcoming: 3, lowSample: true, coveragePct: 50 },
    { id: "st-at-target", code: "TEST-META", name: "Tipo en meta", scheduled: 20, served: 19, partial: 0, notServiced: 0, pending: 1, coveragePct: 95 },
    { id: "st-above-target", code: "TEST-SOBRE", name: "Tipo sobre meta", scheduled: 100, served: 98, partial: 0, notServiced: 0, pending: 2, coveragePct: 98 },
    { id: "st-no-scheduled", code: "TEST-SIN-PROGRAMAR", name: "Tipo sin programados", scheduled: 0, served: 0, partial: 0, notServiced: 0, pending: 0, coveragePct: 0 },
  ],
} satisfies Pick<CoverageWire, "byZone" | "byServiceType">;

const targetCoverageFixture: CoverageWire = {
  ...coverageIndicatorFixture,
  byZone: [...coverageIndicatorFixture.byZone, ...targetBoundaryRows.byZone],
  byServiceType: [...coverageIndicatorFixture.byServiceType, ...targetBoundaryRows.byServiceType],
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(targetCoverageFixture)));
});
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
      expect(below.getByText("Muestra baja")).toBeVisible();
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

  it("usa la meta recibida del backend para la tarjeta y las filas", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ ...targetCoverageFixture, targets: { coveragePct: { value: 80, direction: "min" } } })));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const card = await screen.findByRole("button", { name: "Cobertura: seleccionar familia" });
    expect(await within(card).findByText("Meta ≥ 80 %")).toBeVisible();
    const zones = await screen.findByRole("table", { name: /Cobertura por zona/ });
    expect(rowFor(zones, "Zona con cobertura baja").getByText("Bajo la meta")).toBeVisible();
    expect(rowFor(zones, "Centro").queryByText("Bajo la meta")).not.toBeInTheDocument();
  });

  it("conserva el estado de cobertura y la exportación al cambiar a Tabla", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("table", { name: /Cobertura por zona/ });
    const coverageRegion = screen.getByRole("region", { name: "Detalle de Cobertura" });
    const viewToggle = within(coverageRegion).getByRole("group", { name: "Vista del detalle" });

    await user.click(within(viewToggle).getByRole("button", { name: "Tabla" }));

    const zones = within(coverageRegion).getByRole("table", { name: /Cobertura por zona/ });
    const serviceTypes = within(coverageRegion).getByRole("table", { name: /Cobertura por tipo de servicio/ });
    expect(rowFor(zones, "Zona con cobertura baja").getByText("Bajo la meta")).toBeVisible();
    expect(rowFor(serviceTypes, "Tipo con cobertura baja").getByText("Bajo la meta")).toBeVisible();
    expect(within(coverageRegion).getAllByRole("button", { name: "Exportar CSV" })).toHaveLength(2);
  });
});
