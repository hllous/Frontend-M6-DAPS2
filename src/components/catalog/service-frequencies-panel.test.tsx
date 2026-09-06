import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { ServiceFrequenciesPanel } from "./service-frequencies-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetServiceFrequencyFixtures(); });
afterAll(() => server.close());

describe("ServiceFrequenciesPanel", () => {
  it("pre-filters the creation picker to ROUTE service types and keeps route/type immutable while editing", async () => {
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    expect(screen.getAllByText("Recolección domiciliaria")[0]).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Nueva frecuencia" }));

    const serviceTypeSelect = screen.getByRole("combobox", { name: "Tipo de servicio" });
    expect(serviceTypeSelect).toHaveTextContent("Recolección domiciliaria");
    expect(serviceTypeSelect).not.toHaveTextContent("Mantenimiento de contenedores");
    expect(screen.queryByText(/generar services/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(screen.getByText(/estos vínculos no se pueden modificar/i)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Turno" })).toBeVisible();
  });

  it("keeps Cerrar vigencia as a distinct confirmation and never calls the Services endpoint", async () => {
    const user = userEvent.setup();
    server.use(http.all("*/api/services", () => HttpResponse.json({ unexpected: true }, { status: 500 })));
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Frecuencias de servicio" });
    const closeButton = screen.getAllByRole("button", { name: "Cerrar vigencia" })[0];
    expect(closeButton).toBeVisible();
    expect(screen.queryByRole("button", { name: /generar/i })).not.toBeInTheDocument();
    await user.click(closeButton);
    expect(screen.getByRole("heading", { name: "Cerrar vigencia" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Conservar vigencia" })).toBeVisible();
    expect(screen.getByText(/Services ya creados quedan intactos/i)).toBeVisible();
  });

  it("does not expose management actions to Field", async () => {
    render(<ServiceFrequenciesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nueva frecuencia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.getByText(/puede consultar las frecuencias/i)).toBeVisible();
  });
});
