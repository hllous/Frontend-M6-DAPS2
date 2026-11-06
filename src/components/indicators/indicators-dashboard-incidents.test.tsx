import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { incidentsIndicatorFixture, incidentsStage2NoDataFixture } from "@/lib/indicator-fixtures";
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

describe("indicadores stage 2 de Incidencias", () => {
  it("prioriza días hábiles y prefiere la meta del backend al plazo de reportes", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json({
      ...incidentsIndicatorFixture,
      reports: {
        ...incidentsIndicatorFixture.reports,
        avgResolutionBusinessDays: 2,
        avgResolutionDays: 4.6,
        deadlineBusinessDays: 3,
      },
      delta: { ...incidentsIndicatorFixture.delta, avgResolutionBusinessDays: -0.2, avgResolutionDays: 1.4 },
    })));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Incidencias" }));
    const incidents = await screen.findByRole("region", { name: "Resumen de Incidencias" });
    expect(within(incidents).getByText("2 días hábiles")).toBeVisible();
    expect(within(incidents).getByText("Meta ≤ 5 días hábiles")).toBeVisible();
    expect(within(incidents).getByText(/-0,2 días/)).toBeVisible();
    expect(within(incidents).getByText("Mejor")).toBeVisible();
    expect(within(incidents).getByText("Resolución media en días corridos: 4,6 días")).toBeVisible();
  });

  it("uses the report deadline when targets are absent", async () => {
    const response = structuredClone(incidentsIndicatorFixture);
    delete response.targets;
    response.reports.deadlineBusinessDays = 3;
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(response)));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Incidencias" }));
    const incidents = await screen.findByRole("region", { name: "Resumen de Incidencias" });
    expect(within(incidents).getByText("Meta ≤ 3 días hábiles")).toBeVisible();
  });

  it("shows calendar-day resolution and its variation for an older backend", async () => {
    const response = structuredClone(incidentsIndicatorFixture);
    delete response.reports.avgResolutionBusinessDays;
    delete response.delta!.avgResolutionBusinessDays;
    response.delta!.avgResolutionDays = -0.6;
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(response)));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Incidencias" }));
    const incidents = await screen.findByRole("region", { name: "Resumen de Incidencias" });
    expect(within(incidents).getByText("2,4 días corridos")).toBeVisible();
    expect(within(incidents).getByText("-0,6 días")).toBeVisible();
    expect(within(incidents).getByText("Meta ≤ 5 días hábiles")).toBeVisible();
  });

  it("muestra reportes en plazo y vencidos hoy con su comparación y sus metas", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Incidencias" }));

    const metrics = await screen.findByRole("region", { name: "Indicadores complementarios de Incidencias" });
    expect(within(metrics).getByText("88,9 %")).toBeVisible();
    expect(within(metrics).getByText("16 de 18 reportes se resolvieron en plazo.")).toBeVisible();
    expect(within(metrics).getByText("Meta ≥ 85 %")).toBeVisible();
    expect(within(metrics).getByText("+5,6 p. p.")).toBeVisible();

    const overdue = within(metrics).getByRole("group", { name: "Reportes vencidos hoy" });
    expect(within(overdue).getByText("14,3 %")).toBeVisible();
    expect(within(overdue).getByText("2 de 14 reportes abiertos.")).toBeVisible();
    expect(within(overdue).getByText("Meta ≤ 10 %")).toBeVisible();
    expect(within(overdue).queryByText(/Mejor|Peor|Sin datos del período anterior/)).not.toBeInTheDocument();
  });

  it("muestra el desvío de programación contra su máximo y su variación", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Cumplimiento" }));

    const metrics = await screen.findByRole("region", { name: "Indicadores complementarios de Cumplimiento" });
    expect(within(metrics).getByText("8,8 %")).toBeVisible();
    expect(within(metrics).getByText("35 de 400 servicios se desviaron de la programación.")).toBeVisible();
    expect(within(metrics).getByText("Meta ≤ 10 %")).toBeVisible();
    expect(within(metrics).getByText("-0,9 p. p.")).toBeVisible();
    expect(within(metrics).getByText("Mejor")).toBeVisible();
  });

  it("muestra el historial de contenedores y distingue el estado actual", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Incidencias" }));

    const metrics = await screen.findByRole("region", { name: "Indicadores complementarios de Incidencias" });
    const overflow = within(metrics).getByRole("group", { name: "Desbordes de contenedores" });
    expect(within(overflow).getByText("7 incidentes")).toBeVisible();
    expect(within(overflow).getByText("Meta: tendencia descendente")).toBeVisible();
    expect(within(overflow).getByText("-2 unidades")).toBeVisible();

    const pendingDamage = within(metrics).getByRole("group", { name: "Contenedores con daños pendientes" });
    expect(within(pendingDamage).getByText("Sin dato")).toBeVisible();
    expect(within(pendingDamage).getByText("Historial disponible desde 30/10/2026.")).toBeVisible();
    expect(within(pendingDamage).getByText("Meta: tendencia descendente")).toBeVisible();
    expect(within(pendingDamage).getByText("Sin datos del período anterior")).toBeVisible();
    expect(within(pendingDamage).queryByText("0 contenedores")).not.toBeInTheDocument();

    expect(screen.getByText(/Estados de contenedores y riesgo de arbolado: situación actual/)).toBeVisible();
  });

  it("shows missing overflow history as no data instead of hiding the indicator", async () => {
    const response = structuredClone(incidentsIndicatorFixture);
    delete response.containers.history;
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(response)));
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Incidencias" }));

    const metrics = await screen.findByRole("region", { name: "Indicadores complementarios de Incidencias" });
    const overflow = within(metrics).getByRole("group", { name: "Desbordes de contenedores" });
    expect(within(overflow).getByText("Sin dato")).toBeVisible();
    expect(within(overflow).queryByText(/\d+ incidentes/)).not.toBeInTheDocument();
  });

  it("muestra sin datos cuando no hubo reportes resueltos ni abiertos", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json(incidentsStage2NoDataFixture)));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Incidencias" }));

    const metrics = await screen.findByRole("region", { name: "Indicadores complementarios de Incidencias" });
    const withinDeadline = within(metrics).getByRole("group", { name: "Reportes resueltos en plazo" });
    expect(within(withinDeadline).getByText("Sin datos")).toBeVisible();
    expect(within(withinDeadline).getByText("No hubo reportes resueltos.")).toBeVisible();
    expect(within(withinDeadline).queryByText("0 %")).not.toBeInTheDocument();

    const overdue = within(metrics).getByRole("group", { name: "Reportes vencidos hoy" });
    expect(within(overdue).getByText("Sin datos")).toBeVisible();
    expect(within(overdue).getByText("No hay reportes abiertos hoy.")).toBeVisible();
    expect(within(overdue).queryByText(/Mejor|Peor|Sin datos del período anterior/)).not.toBeInTheDocument();
  });
});
