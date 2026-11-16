import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { disposalSitesAdapter } from "@/lib/disposal-sites";
import { scenarios } from "@/lib/scenarios";
import { DisposalSitesPanel } from "./disposal-sites-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const office = scenarios.officeDutyQueue;

async function openSite(user: ReturnType<typeof userEvent.setup>, code: string) {
  const row = await screen.findByRole("row", { name: new RegExp(code) });
  await user.click(within(row).getByRole("button", { name: `Ver detalle del sitio de disposición ${code}` }));
  return screen.findByRole("dialog", { name: "Detalle del sitio de disposición" });
}

describe("DisposalSitesPanel flows", () => {
  it("shows the load failure with its message and recovers when the user retries", async () => {
    server.use(
      http.get("*/api/disposal-sites", () =>
        HttpResponse.json(
          { statusCode: 500, message: "Falla del servicio.", error: "Internal", timestamp: "t", path: "/p" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);

    expect(await screen.findByText("Falla del servicio.")).toBeVisible();
    expect(screen.queryByRole("row", { name: /RS-01/ })).not.toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("row", { name: /RS-01/ })).toBeVisible();
    expect(screen.queryByText("Falla del servicio.")).not.toBeInTheDocument();
  });

  it("shows the empty state when the search matches nothing and passes the search term to the adapter", async () => {
    const list = vi.spyOn(disposalSitesAdapter, "list");
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);
    await screen.findByRole("row", { name: /RS-01/ });

    await user.type(screen.getByRole("textbox", { name: "Buscar sitios de disposición" }), "zzz-inexistente");

    expect(await screen.findByText("Sin sitios de disposición")).toBeVisible();
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "zzz-inexistente" })));
    expect(screen.queryByRole("row", { name: /RS-01/ })).not.toBeInTheDocument();
  });

  it("creates a site with the typed values, closes the dialog and reloads the list", async () => {
    const create = vi.spyOn(disposalSitesAdapter, "create").mockResolvedValue({
      id: "ds-new",
      code: "NS-99",
      name: "Sitio nuevo",
      siteType: "LANDFILL",
      active: true,
    });
    const list = vi.spyOn(disposalSitesAdapter, "list");
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);
    await screen.findByRole("row", { name: /RS-01/ });
    const callsBefore = list.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Nuevo sitio de disposición" }));
    const dialog = await screen.findByRole("dialog", { name: "Alta de sitio de disposición" });
    await user.type(within(dialog).getByLabelText("Código"), "NS-99");
    await user.type(within(dialog).getByLabelText("Nombre"), "Sitio nuevo");
    await user.click(within(dialog).getByRole("button", { name: "Crear sitio" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ code: "NS-99", name: "Sitio nuevo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("keeps the create dialog open and shows the error when the backend rejects the code", async () => {
    vi.spyOn(disposalSitesAdapter, "create").mockRejectedValue(new Error("Ya existe un sitio con ese código."));
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);
    await screen.findByRole("row", { name: /RS-01/ });

    await user.click(screen.getByRole("button", { name: "Nuevo sitio de disposición" }));
    const dialog = await screen.findByRole("dialog", { name: "Alta de sitio de disposición" });
    await user.type(within(dialog).getByLabelText("Código"), "RS-01");
    await user.type(within(dialog).getByLabelText("Nombre"), "Repetido");
    await user.click(within(dialog).getByRole("button", { name: "Crear sitio" }));

    expect(await within(dialog).findByText("Ya existe un sitio con ese código.")).toBeVisible();
    expect(within(dialog).getByLabelText("Código")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog", { name: "Alta de sitio de disposición" })).toBeVisible();
  });

  it("updates a site from the edit form with the edited name and reports a rejected update", async () => {
    const update = vi
      .spyOn(disposalSitesAdapter, "update")
      .mockRejectedValueOnce(new Error("No se pudo actualizar el sitio de disposición."))
      .mockResolvedValue({ id: "x", code: "RS-01", name: "Renombrado", siteType: "LANDFILL", active: true });
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);
    const sheet = await openSite(user, "RS-01");
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar sitio de disposición" });
    const name = within(dialog).getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Renombrado");

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(dialog).findByText("No se pudo actualizar el sitio de disposición.")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ name: "Renombrado" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar sitio de disposición" })).not.toBeInTheDocument());
  });

  it("deactivates a site after confirmation and reloads the list", async () => {
    const remove = vi.spyOn(disposalSitesAdapter, "remove").mockResolvedValue(undefined as never);
    const list = vi.spyOn(disposalSitesAdapter, "list");
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={office} />);
    const sheet = await openSite(user, "RS-01");
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));
    const callsBefore = list.mock.calls.length;

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
