import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { disposalSitesAdapter } from "@/lib/disposal-sites";
import { DisposalSitesPanel } from "./disposal-sites-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("DisposalSitesPanel", () => {
  it("lists sites and exposes only logical deactivation to Office", async () => {
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Sitios de disposición" })).toBeVisible();
    expect(screen.getByText("RS-01")).toBeVisible();
    const row = await screen.findByRole("row", { name: /RS-01/ });
    expect(row.querySelector('th[data-label="Código"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it("opens disposal site details and available actions from the row", async () => {
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /RS-01/ });
    await user.click(
      within(row).getByRole("button", {
        name: "Ver detalle del sitio de disposición RS-01",
      }),
    );

    const sheet = await screen.findByRole("dialog", {
      name: "Detalle del sitio de disposición",
    });
    expect(sheet).toHaveTextContent("RS-01");
    expect(within(sheet).getByRole("button", { name: "Editar" })).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Dar de baja" })).toBeVisible();
  });

  it("opens create and edit forms in a dialog and returns focus to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);

    const newButton = await screen.findByRole("button", { name: "Nuevo sitio de disposición" });
    await user.click(newButton);
    const createDialog = await screen.findByRole("dialog", { name: "Alta de sitio de disposición" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(createDialog).getByRole("button", { name: "Crear sitio" })).toBeVisible();
    await user.click(within(createDialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(newButton).toHaveFocus();

    const row = await screen.findByRole("row", { name: /RS-01/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle del sitio de disposición RS-01" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle del sitio de disposición" });
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const editDialog = await screen.findByRole("dialog", { name: "Editar sitio de disposición" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(editDialog).getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });

  it("hides mutation actions from Field", async () => {
    render(<DisposalSitesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Sitios de disposición" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo sitio de disposición" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("requires confirmation and reports a failed deactivation as an alert", async () => {
    const remove = vi.spyOn(disposalSitesAdapter, "remove").mockRejectedValue(new Error("No se pudo dar de baja el sitio de disposición."));
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /RS-01/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle del sitio de disposición RS-01" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle del sitio de disposición" });
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("RS-01");
    expect(within(dialog).getByRole("button", { name: "Conservar sitio" })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo dar de baja el sitio de disposición.");
    expect(screen.queryByRole("status", { name: /No se pudo dar de baja el sitio de disposición/ })).not.toBeInTheDocument();
  });
});
