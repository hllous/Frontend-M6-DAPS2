import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("IndicatorsDashboard", () => {
  it("lets Office explore exact coverage and compliance values through keyboard-accessible detail", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Cobertura" })).toBeVisible();
    expect(screen.getByText(/Unidad de análisis:/).closest("p")).toHaveTextContent("Unidad de análisis: servicio + zona");
    expect(screen.getByText("Atendidos")).toBeVisible();
    expect(screen.getByText("Programados")).toBeVisible();

    const centro = await screen.findByRole("button", { name: /Centro.*93,6.*146.*156/i });
    centro.focus();
    await user.keyboard("{Enter}");
    expect(screen.getAllByText(/Seleccionado:/)[0]?.closest("p")).toHaveTextContent("Seleccionado: Centro");

    await user.click(screen.getByRole("button", { name: "Ver tabla de datos" }));
    const coverageTable = screen.getByRole("region", { name: "Tabla de datos de Cobertura" });
    expect(within(coverageTable).getAllByRole("columnheader", { name: "Atendidos" })[0]).toBeVisible();
    expect(within(coverageTable).getAllByRole("columnheader", { name: "Programados" })[0]).toBeVisible();
    expect(within(coverageTable).getAllByText("146 objetivos")[0]).toBeVisible();
    expect(within(coverageTable).getAllByText("156 objetivos")[0]).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Cumplimiento/ }));
    expect((await screen.findAllByText("344 servicios"))[0]).toBeVisible();
    expect((await screen.findAllByText("Demorados"))[0]).toBeVisible();
    expect(screen.getByText("Falta de cuadrilla")).toBeVisible();
    expect(screen.getByText(/ZoneResult\.recordedAt/i).closest("p")).toHaveTextContent("último ZoneResult.recordedAt");
  });

  it("lets Office inspect exact Incidencias and Residuos details with their data semantics", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));

    expect(screen.getAllByText(/Resolución media de reportes/)[0]).toBeVisible();
    expect(screen.getByText(/contenedores y arbolado son instantáneas actuales/i)).toBeVisible();
    expect(screen.getByText(/reportes consideran el período y la resolución media usa solo reportes cerrados/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Ver tabla de datos$/ }));
    const incidentsTable = screen.getByRole("region", { name: "Tabla de datos de Incidencias" });
    expect(within(incidentsTable).getByRole("columnheader", { name: "Desbordes" })).toBeVisible();
    expect(within(incidentsTable).getByRole("columnheader", { name: "Daños" })).toBeVisible();
    expect(within(incidentsTable).getByText("Cerrados")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Residuos/ }));
    expect(screen.getAllByText(/Desvío de relleno sanitario/)[0]).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^Ver tabla de datos$/ }));
    const wasteTable = screen.getByRole("region", { name: "Tabla de datos de Residuos" });
    expect(within(wasteTable).getAllByRole("columnheader", { name: "Kilogramos" })[0]).toBeVisible();
    expect(within(wasteTable).getAllByRole("columnheader", { name: "Metros cúbicos" })[0]).toBeVisible();
    expect(within(wasteTable).getAllByText("62,8 m³")[0]).toBeVisible();
  });
});
