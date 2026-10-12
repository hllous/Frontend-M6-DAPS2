import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { crewsAdapter } from "@/lib/crews";
import { CrewCatalogPanel } from "./crew-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("CrewCatalogPanel", () => {
  it("lists identity-backed crew references and operational status", async () => {
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    expect(screen.getByText("Cuadrilla A · López")).toBeVisible();
    expect(screen.getByText("Carlos López")).toBeVisible();
    expect(screen.getAllByText("Municipalidad").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Turno" })).toBeVisible();
  });

  it("scopes Field views and hides management controls", async () => {
    render(<CrewCatalogPanel scenario={scenarios.fieldCrewMember} />);
    expect(await screen.findByText("Cuadrilla B · Fernández")).toBeVisible();
    expect(screen.queryByText("Cuadrilla A · López")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar cuadrilla" })).not.toBeInTheDocument();
  });

  it("lets Office manage resolved M1 members without exposing editable ids", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Cuadrilla E - Membresia/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle" }));

    const dialog = await screen.findByRole("dialog");
    const members = within(dialog).getByRole("list", { name: "Integrantes de la cuadrilla" });
    expect(within(members).getByText("Ana Morales")).toBeVisible();
    expect(within(dialog).queryByText("user-ana")).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByRole("listbox", { name: "Agregar integrantes (M1)" }), "user-pedro");
    await user.click(within(dialog).getByRole("button", { name: "Agregar integrantes" }));
    expect(await within(members).findByText("Pedro Ruiz")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Quitar a Pedro Ruiz" }));
    expect(within(members).queryByText("Pedro Ruiz")).not.toBeInTheDocument();
  });
});


describe("CrewCatalogPanel pagination", () => {
  it("pages through backend results and resets the page when filtering", async () => {
    const list = vi.spyOn(crewsAdapter, "list").mockImplementation(async (query) => ({ crews: Array.from({ length: 20 }, (_, index) => ({ ...{ id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Equipo remoto", crewType: "MUNICIPAL" as const, leaderUserId: null, organizationId: null, memberUserIds: [], defaultShift: "MORNING" as const, active: true }, id: `remote-${index}` })), page: query?.page ?? 1, pageSize: 20, total: 57, totalPages: 3 }));
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 })));
    expect(await screen.findByText("Mostrando 21–40 de 57")).toBeVisible();
    for (const [label, value] of [["Estado", "true"], ["Tipo de cuadrilla", "MUNICIPAL"], ["Turno", "MORNING"]]) {
      await user.selectOptions(screen.getByLabelText(label), value);
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
      expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText("Mostrando 21–40 de 57");
    }
  });
});


it("clamps the current page after its last active record is deactivated", async () => {
  const vehicle = { id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Equipo remoto", crewType: "MUNICIPAL" as const, leaderUserId: null, organizationId: null, memberUserIds: [], defaultShift: "MORNING" as const, active: true };
  let removed = false;
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(crewsAdapter, "remove").mockImplementation(async () => { removed = true; return { ...vehicle, active: false }; });
  const list = vi.spyOn(crewsAdapter, "list").mockImplementation(async (query) => ({ crews: removed && query?.page === 3 ? [] : [vehicle], page: query?.page ?? 1, pageSize: 20, total: removed ? 40 : 41, totalPages: removed ? 2 : 3 }));
  const user = userEvent.setup();
  render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("Equipo remoto");
  await user.selectOptions(screen.getByLabelText("Estado"), "true");
  await user.click(await screen.findByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 3");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 3 de 3");
  await user.click(screen.getByRole("button", { name: "Dar de baja" }));
  expect(await screen.findByText("Página 2 de 2")).toBeVisible();
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, active: true })));
});
