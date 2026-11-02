import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import {
  complianceIndicatorFixture,
  coverageIndicatorFixture,
  incidentsIndicatorFixture,
  wasteIndicatorFixture,
} from "@/lib/indicator-fixtures";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  olvidarCatalogoDeEtiquetas();
});
afterAll(() => server.close());

function familyCard(label: string) {
  return screen.getByRole("button", { name: `${label}: seleccionar familia` });
}

describe("metas de las tarjetas de indicadores", () => {
  it("muestra meta, sentido y estado para indicadores con meta, y aclara cuando falta", async () => {
    server.use(
      http.get("*/api/indicators/coverage", () => HttpResponse.json({
        ...coverageIndicatorFixture,
        totals: { ...coverageIndicatorFixture.totals, coveragePct: 96 },
      })),
      http.get("*/api/indicators/compliance", () => HttpResponse.json({
        ...complianceIndicatorFixture,
        finished: { ...complianceIndicatorFixture.finished, onTimePct: 82 },
      })),
      http.get("*/api/indicators/incidents", () => HttpResponse.json(incidentsIndicatorFixture)),
      http.get("*/api/indicators/waste", () => HttpResponse.json(wasteIndicatorFixture)),
    );

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const coverage = familyCard("Cobertura");
    expect(await within(coverage).findByText("Cumple la meta")).toBeVisible();
    expect(within(coverage).getByText("Meta ≥ 95 %")).toBeVisible();
    expect(within(coverage).getByText("más es mejor")).toBeVisible();

    const compliance = familyCard("Cumplimiento");
    expect(await within(compliance).findByText("Bajo la meta")).toBeVisible();
    expect(within(compliance).getByText("Meta ≥ 90 %")).toBeVisible();
    expect(within(compliance).getByText("más es mejor")).toBeVisible();

    const incidents = familyCard("Incidencias");
    expect(await within(incidents).findByText("Cumple la meta")).toBeVisible();
    expect(within(incidents).getByText("Meta ≤ 5 días")).toBeVisible();
    expect(within(incidents).getByText("menos es mejor")).toBeVisible();

    const waste = familyCard("Residuos");
    expect(await within(waste).findByText("Sin meta definida")).toBeVisible();
    expect(within(waste).queryByText("más es mejor")).not.toBeInTheDocument();
    expect(within(waste).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
  });

  it("marca sobre la meta cuando las incidencias superan el máximo", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json({
      ...incidentsIndicatorFixture,
      reports: { ...incidentsIndicatorFixture.reports, avgResolutionDays: 8.2 },
    })));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const incidents = familyCard("Incidencias");
    expect(await within(incidents).findByText("Sobre la meta")).toBeVisible();
    expect(within(incidents).getByText("Meta ≤ 5 días")).toBeVisible();
    expect(within(incidents).getByText("menos es mejor")).toBeVisible();
  });

  it("muestra los mismos datos de la familia seleccionada en la pestaña móvil Resumen", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(max-width: 760px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const incidents = familyCard("Incidencias");
    await within(incidents).findByText("Cumple la meta");
    await user.click(incidents);

    const summary = screen.getByRole("tabpanel");
    expect(within(summary).getByText("Meta ≤ 5 días")).toBeVisible();
    expect(within(summary).getByText("menos es mejor")).toBeVisible();
    expect(within(summary).getByText("Cumple la meta")).toBeVisible();
  });

  it("no muestra un estado mientras los datos de una familia cargan", () => {
    server.use(http.get("*/api/indicators/coverage", async () => {
      await delay("infinite");
      return HttpResponse.json(coverageIndicatorFixture);
    }));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const coverage = familyCard("Cobertura");
    expect(within(coverage).getByText("Meta ≥ 95 %")).toBeVisible();
    expect(within(coverage).getByText("más es mejor")).toBeVisible();
    expect(within(coverage).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
  });

  it("no muestra un estado cuando una familia no tiene resultados", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({
      ...coverageIndicatorFixture,
      byZone: [],
      byServiceType: [],
    })));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const coverage = familyCard("Cobertura");
    const familyBand = screen.getByRole("region", { name: "Familias" });
    expect(await within(familyBand).findByText("Sin datos")).toBeVisible();
    expect(within(coverage).getByText("Meta ≥ 95 %")).toBeVisible();
    expect(within(coverage).getByText("más es mejor")).toBeVisible();
    expect(within(coverage).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
  });

  it("no conserva un estado de meta cuando falla la carga de una familia", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(
      { statusCode: 503, message: "Servicio no disponible" },
      { status: 503 },
    )));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const coverage = familyCard("Cobertura");
    const familyBand = screen.getByRole("region", { name: "Familias" });
    expect(await within(familyBand).findByText("No se pudo cargar Cobertura")).toBeVisible();
    expect(within(coverage).getByText("Meta ≥ 95 %")).toBeVisible();
    expect(within(coverage).getByText("más es mejor")).toBeVisible();
    expect(within(coverage).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
  });
});
