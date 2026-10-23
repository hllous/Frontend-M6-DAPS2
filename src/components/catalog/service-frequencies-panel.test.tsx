import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { ServiceFrequenciesPanel } from "./service-frequencies-panel";

const server = setupServer(...handlers);
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => { server.resetHandlers(); resetServiceFrequencyFixtures(); });
afterAll(() => server.close());

describe("ServiceFrequenciesPanel", () => {
  it("pre-filters the creation picker to ROUTE service types and keeps route/type immutable while editing", async () => {
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    expect(screen.getAllByText("Recolección domiciliaria")[0]).toBeVisible();
    const newButton = screen.getByRole("button", { name: "Nueva frecuencia" });
    await user.click(newButton);
    const createDialog = await screen.findByRole("dialog", { name: "Nueva frecuencia" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    const serviceTypeSelect = within(createDialog).getByRole("combobox", { name: "Tipo de servicio" });
    await user.click(serviceTypeSelect);
    expect(screen.getByRole("option", { name: "Recolección domiciliaria · WASTE-ROUTE" })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Mantenimiento de contenedores/ })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/generar services/i)).not.toBeInTheDocument();
    await user.click(within(createDialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(newButton).toHaveFocus();

    const row = screen.getByRole("row", { name: /Recorrido Casco Histórico/ });
    await user.click(
      within(row).getByRole("button", {
        name: /Ver detalle de la frecuencia de Recolección domiciliaria para Recorrido Casco Histórico/,
      }),
    );
    const sheet = await screen.findByRole("dialog", {
      name: "Detalle de frecuencia de servicio",
    });
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const editDialog = await screen.findByRole("dialog", { name: "Editar frecuencia" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(editDialog).queryByText(/vínculos/i)).not.toBeInTheDocument();
    expect(within(editDialog).getByRole("combobox", { name: "Turno" })).toBeVisible();
  });

  it("opens frequency details and available actions from the row", async () => {
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /Recorrido Casco Histórico/ });
    await user.click(
      within(row).getByRole("button", {
        name: /Ver detalle de la frecuencia de Recolección domiciliaria para Recorrido Casco Histórico/,
      }),
    );

    const sheet = await screen.findByRole("dialog", {
      name: "Detalle de frecuencia de servicio",
    });
    expect(sheet).toHaveTextContent("Recorrido Casco Histórico");
    expect(within(sheet).getByRole("button", { name: "Editar" })).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Cerrar vigencia" })).toBeVisible();
  });

  it("keeps Cerrar vigencia as a distinct confirmation and never calls the Services endpoint", async () => {
    const user = userEvent.setup();
    server.use(http.all("*/api/services", () => HttpResponse.json({ unexpected: true }, { status: 500 })));
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Frecuencias de servicio" });
    expect(screen.queryByRole("button", { name: /generar/i })).not.toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Recorrido Casco Histórico/ });
    await user.click(
      within(row).getByRole("button", {
        name: /Ver detalle de la frecuencia de Recolección domiciliaria para Recorrido Casco Histórico/,
      }),
    );
    const sheet = await screen.findByRole("dialog", {
      name: "Detalle de frecuencia de servicio",
    });
    await user.click(within(sheet).getByRole("button", { name: "Cerrar vigencia" }));
    expect(screen.getByRole("heading", { name: "Confirmar cierre de vigencia" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Conservar vigencia" })).toBeVisible();
    expect(screen.getByText(/servicios ya creados no cambian/i)).toBeVisible();
  });

  it("does not expose management actions to Field", async () => {
    render(<ServiceFrequenciesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nueva frecuencia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.getByText("Solo consulta")).toBeVisible();
  });

  it("uses Spanish copy, exposes responsive table labels, and shows focus on weekday controls", async () => {
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    expect(screen.queryByText(/Services/i)).not.toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Recorrido Casco Histórico/ });
    expect(within(row).getByRole("rowheader")).toHaveAttribute("data-label", "Tipo de servicio");
    expect(within(row).getAllByRole("cell")[0]).toHaveAttribute("data-label", "Recorrido");
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();
    expect(
      within(row).getByRole("button", {
        name: /Ver detalle de la frecuencia de Recolección domiciliaria para Recorrido Casco Histórico/,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Nueva frecuencia" }));
    const monday = within(await screen.findByRole("dialog", { name: "Nueva frecuencia" })).getByRole("button", { name: "Lunes" });
    monday.focus();
    expect(monday).toHaveFocus();
    expect(monday).toHaveAttribute("aria-pressed", "true");
    expect(monday.querySelector("svg.lucide-check")).not.toBeNull();
    await user.keyboard(" ");
    expect(monday).toHaveAttribute("aria-pressed", "false");
    expect(monday.querySelector("svg.lucide-check")).toBeNull();
  });
});
