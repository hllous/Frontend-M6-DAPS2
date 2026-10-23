import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { greenPointsAdapter } from "@/lib/green-points";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";

const server = setupServer(...handlers);
async function openGreenPointDetail(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
) {
  await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));
  return screen.getByRole("dialog");
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("GreenPointCatalogPanel", () => {
  it("lists points for any authenticated actor and opens the detail without lifecycle actions", async () => {
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    const row = await screen.findByRole("row", { name: /GP-001/ });
    expect(row).toBeVisible();
    expect(row.querySelector('th[data-label="Código"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();
    expect(within(row).getByRole("button", { name: "Ver detalle de GP-001" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Registrar punto verde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
    const detail = await openGreenPointDetail(user, row);
    expect(within(detail).getByRole("heading", { name: /Detalle del punto verde GP-001/ })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("lets Office edit the complete accepted-waste set and deactivate logically", async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(greenPointsAdapter, "remove");
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("row", { name: /GP-001/ })).toBeVisible();
    const row = screen.getByRole("row", { name: /GP-001/ });
    const detail = await openGreenPointDetail(user, row);
    await user.click(within(detail).getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveTextContent("conjunto completo");
    await user.click(within(dialog).getByRole("checkbox", { name: "Domiciliarios" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar punto verde" }));
    expect(await screen.findByText("Punto verde actualizado.")).toBeVisible();

    const refreshedRow = await screen.findByRole("row", { name: /GP-001/ });
    const refreshedDetail = await openGreenPointDetail(user, refreshedRow);
    await user.click(within(refreshedDetail).getByRole("button", { name: "Dar de baja" }));
    const confirmation = screen.getByRole("dialog");
    expect(confirmation).toHaveTextContent("GP-001");
    expect(within(confirmation).getByRole("button", { name: /Conservar el punto verde GP-001/ })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole("button", { name: /Conservar el punto verde GP-001/ }));
    expect(remove).not.toHaveBeenCalled();

    const refreshedDetailAgain = await openGreenPointDetail(user, refreshedRow);
    await user.click(within(refreshedDetailAgain).getByRole("button", { name: "Dar de baja" }));
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
