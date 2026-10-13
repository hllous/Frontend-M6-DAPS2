import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { greenPointsAdapter } from "@/lib/green-points";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("GreenPointCatalogPanel", () => {
  it("lists points for any authenticated actor and opens the detail without lifecycle actions", async () => {
    render(<GreenPointCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    const row = await screen.findByRole("row", { name: /GP-001/ });
    expect(row).toBeVisible();
    expect(row.querySelector('th[data-label="Código"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Registrar punto verde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it("lets Office edit the complete accepted-waste set and deactivate logically", async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(greenPointsAdapter, "remove");
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("row", { name: /GP-001/ })).toBeVisible();
    const row = screen.getByRole("row", { name: /GP-001/ });
    await user.click(within(row).getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("conjunto completo");
    await user.click(within(dialog).getByLabelText("Domiciliarios"));
    await user.click(within(dialog).getByRole("button", { name: "Guardar punto verde" }));
    expect(await screen.findByText("Punto verde actualizado con éxito.")).toBeVisible();

    const refreshedRow = await screen.findByRole("row", { name: /GP-001/ });
    await user.click(within(refreshedRow).getByRole("button", { name: "Dar de baja" }));
    const confirmation = screen.getByRole("dialog");
    expect(confirmation).toHaveTextContent("GP-001");
    expect(within(confirmation).getByRole("button", { name: /Conservar el punto verde GP-001/ })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole("button", { name: /Conservar el punto verde GP-001/ }));
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(refreshedRow).getByRole("button", { name: "Dar de baja" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Dar de baja el punto verde GP-001/ }));
    expect(remove).toHaveBeenCalledWith("green-point-1");
    expect(await screen.findByText(/Punto verde dado de baja/)).toBeVisible();
  });

  it("associates Green Point validation errors with the invalid fields", async () => {
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Puntos verdes" });
    await user.click(screen.getByRole("button", { name: "Registrar punto verde" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Guardar punto verde" }));

    const nameError = await within(dialog).findByText("El nombre es obligatorio.");
    const nameInput = within(dialog).getByLabelText("Nombre");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", "green-point-name-error");
    expect(nameError).toHaveAttribute("id", "green-point-name-error");

    const zoneInput = within(dialog).getByLabelText("Zona operativa");
    expect(zoneInput).toHaveAttribute("aria-invalid", "true");
    expect(zoneInput).toHaveAttribute("aria-describedby", "green-point-zone-error");
  });
});
