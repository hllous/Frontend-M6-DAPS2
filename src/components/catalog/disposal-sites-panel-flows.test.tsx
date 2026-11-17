import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { disposalSitesAdapter, type DisposalSite } from "@/lib/disposal-sites";
import { DisposalSitesPanel } from "./disposal-sites-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);
  await user.click(await screen.findByRole("button", { name: "Nuevo sitio de disposición" }));
  const dialog = await screen.findByRole("dialog", { name: "Alta de sitio de disposición" });
  await user.type(within(dialog).getByLabelText("Código"), "RS-99");
  await user.type(within(dialog).getByLabelText("Nombre"), "Sitio de prueba");
  await user.click(within(dialog).getByRole("combobox", { name: "Tipo" }));
  await user.click(await screen.findByRole("option", { name: "Planta de compostaje" }));
  return dialog;
}

describe("DisposalSitesPanel: alta y filtros", () => {
  it("envía el tipo de sitio elegido al crear", async () => {
    const create = vi.spyOn(disposalSitesAdapter, "create").mockResolvedValue({} as DisposalSite);
    const user = userEvent.setup();
    const dialog = await openCreate(user);

    await user.click(within(dialog).getByRole("button", { name: "Crear sitio" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({ code: "RS-99", name: "Sitio de prueba", siteType: "COMPOSTING_PLANT" });
  });

  it("muestra el rechazo del backend y deja abierto el alta", async () => {
    server.use(http.post("*/api/disposal-sites", () => HttpResponse.json(
      { statusCode: 409, error: "Conflict", message: "Ya existe un sitio con ese código.", timestamp: new Date().toISOString(), path: "/api/disposal-sites" },
      { status: 409 },
    )));
    const user = userEvent.setup();
    const dialog = await openCreate(user);

    await user.click(within(dialog).getByRole("button", { name: "Crear sitio" }));

    expect((await screen.findAllByText("Ya existe un sitio con ese código.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: "Alta de sitio de disposición" })).toBeVisible();
  });

  it("pide al backend el tipo y el estado elegidos en los filtros", async () => {
    const list = vi.spyOn(disposalSitesAdapter, "list");
    const user = userEvent.setup();
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("row", { name: /RS-01/ });

    await user.click(screen.getByRole("combobox", { name: "Filtrar por tipo de sitio" }));
    await user.click(await screen.findByRole("option", { name: "Relleno sanitario" }));
    await waitFor(() => expect(list.mock.calls.at(-1)![0]).toMatchObject({ siteType: "LANDFILL" }));

    await user.click(screen.getByRole("combobox", { name: "Filtrar sitios por estado" }));
    await user.click(await screen.findByRole("option", { name: "Inactivos" }));
    await waitFor(() => expect(list.mock.calls.at(-1)![0]).toMatchObject({ siteType: "LANDFILL", active: false }));
  });
});
