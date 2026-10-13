import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { serviceTypesAdapter } from "@/lib/service-types";
import { ServiceTypesPanel } from "./service-types-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("ServiceTypesPanel", () => {
  it("lists fixtures, filters them, and keeps locked fields read-only in the edit form", async () => {
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.getByText("WASTE-ROUTE")).toBeVisible();
    const row = await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    expect(row.querySelector('th[data-label="Código"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).not.toBeNull();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(screen.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toHaveAttribute("readonly");
  });

  it("does not expose management actions to a Field actor", async () => {
    render(<ServiceTypesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo tipo de servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByText(/puede consultar el catálogo/i)).toBeVisible();
  });

  it("asks before deactivating a service type and announces a failed request as an alert", async () => {
    const remove = vi.spyOn(serviceTypesAdapter, "remove").mockRejectedValue(new Error("No se pudo guardar el tipo de servicio."));
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    await user.click(within(row).getByRole("button", { name: "Dar de baja" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("WASTE-ROUTE");
    expect(within(dialog).getByRole("button", { name: /Conservar el tipo de servicio WASTE-ROUTE/ })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: /Dar de baja el tipo de servicio WASTE-ROUTE/ }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo dar de baja el tipo de servicio.");
    expect(screen.queryByRole("status", { name: /No se pudo guardar el tipo de servicio/ })).not.toBeInTheDocument();
  });
});
