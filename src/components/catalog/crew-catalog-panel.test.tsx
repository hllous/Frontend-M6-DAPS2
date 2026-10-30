import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { crewsAdapter } from "@/lib/crews";
import { CrewCatalogPanel } from "./crew-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("CrewCatalogPanel", () => {
  it("opens a crew detail from its keyboard-accessible row and restores focus when the Sheet closes", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const rowButton = await screen.findByRole("button", {
      name: "Ver detalle de Cuadrilla E - Membresia",
    });
    rowButton.focus();
    await user.keyboard("{Enter}");

    const sheet = await screen.findByRole("dialog", {
      name: "Detalle de cuadrilla",
    });
    expect(sheet).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Editar" })).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Dar de baja" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(rowButton).toHaveFocus();
  });

  it("lists identity-backed crew references and operational status", async () => {
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    expect(screen.getByText("Cuadrilla A · López")).toBeVisible();
    expect(screen.getByText("Carlos López")).toBeVisible();
    expect(screen.getAllByText("Municipalidad").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Turno" })).toBeVisible();
    const row = await screen.findByRole("row", { name: /Cuadrilla A · López/ });
    expect(row.querySelector('th[data-label="Nombre"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();
    expect(
      within(row).getByRole("button", {
        name: "Ver detalle de Cuadrilla A · López",
      }),
    ).toBeVisible();
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
    await user.click(within(row).getByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }));

    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const members = within(sheet).getByRole("list", { name: "Integrantes de la cuadrilla" });
    expect(within(members).getByText("Ana Morales")).toBeVisible();
    expect(within(sheet).queryByText("user-ana")).not.toBeInTheDocument();
    const memberSelect = within(sheet).getByRole("combobox", { name: /^Agregar integrantes/ });
    await user.click(within(sheet).getByRole("button", { name: "Agregar integrantes" }));
    expect(memberSelect).toHaveAttribute("aria-invalid", "true");
    expect(memberSelect).toHaveAttribute("aria-describedby", "crew-members-error");
    await user.click(memberSelect);
    await user.click(await screen.findByRole("option", { name: "Pedro Ruiz, no seleccionado" }));
    await user.keyboard("{Escape}");
    await user.click(within(sheet).getByRole("button", { name: "Agregar integrantes" }));
    expect(await within(members).findByText("Pedro Ruiz")).toBeVisible();

    await user.click(within(sheet).getByRole("button", { name: "Quitar a Pedro Ruiz" }));
    expect(within(members).queryByText("Pedro Ruiz")).not.toBeInTheDocument();
  });

  it("reserves the scrollbar gutter on the detail body so adding a member does not shift the layout", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Cuadrilla E - Membresia/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }));

    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const body = within(sheet).getByRole("list", { name: "Integrantes de la cuadrilla" }).closest("div.overflow-y-auto");
    expect(body).toHaveClass("[scrollbar-gutter:stable]");
  });

  it("searches available crew members and exposes the selected count and checked option", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /Cuadrilla E - Membresia/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const memberPicker = within(sheet).getByRole("combobox", { name: /^Agregar integrantes/ });
    expect(memberPicker).toHaveTextContent("0 integrantes seleccionados");

    await user.click(memberPicker);
    const search = screen.getByLabelText("Buscar integrantes");
    await user.type(search, "Pedro");
    expect(screen.getByRole("option", { name: "Pedro Ruiz, no seleccionado" })).toBeVisible();
    await user.keyboard("{Enter}");

    expect(memberPicker).toHaveTextContent("1 integrante seleccionado");
    const selectedOption = screen.getByRole("option", { name: "Pedro Ruiz, seleccionado" });
    expect(selectedOption).toBeVisible();
    expect(selectedOption).toHaveAttribute("data-checked", "true");
    expect(selectedOption.querySelector("svg.lucide-check")).not.toBeNull();
  });

  it("asks for confirmation before deactivation and announces failures as alerts", async () => {
    const remove = vi.spyOn(crewsAdapter, "remove").mockRejectedValue(new Error("No se pudo dar de baja la cuadrilla."));
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /Cuadrilla A · López/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle de Cuadrilla A · López" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Cuadrilla A · López");
    expect(within(dialog).getByRole("button", { name: "Conservar cuadrilla" })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo dar de baja la cuadrilla.");
    expect(screen.queryByRole("status", { name: /No se pudo dar de baja la cuadrilla/ })).not.toBeInTheDocument();
  });
});


describe("CrewCatalogPanel pagination", () => {
  it("pages through backend results and resets the page when filtering", async () => {
    const list = vi.spyOn(crewsAdapter, "list").mockImplementation(async (query) => ({ crews: Array.from({ length: 20 }, (_, index) => ({ ...{ id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Equipo remoto", crewType: "MUNICIPAL" as const, leaderUserId: null, leaderName: null, organizationId: null, organizationName: null, members: [], memberUserIds: [], specialty: null, homeZoneId: null, effectiveZoneId: null, membersCount: null, defaultShift: "MORNING" as const, active: true }, id: `remote-${index}` })), page: query?.page ?? 1, pageSize: 20, total: 57, totalPages: 3 }));
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 })));
    expect(await screen.findByText("Mostrando 21–40 de 57")).toBeVisible();
    for (const [label, option] of [["Estado", "Activas"], ["Tipo de cuadrilla", "Municipal"], ["Turno", "Mañana"]]) {
      await user.click(screen.getByRole("combobox", { name: label }));
      await user.click(await screen.findByRole("option", { name: option }));
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
      expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText("Mostrando 21–40 de 57");
    }
  });
});


it("clamps the current page after its last active record is deactivated", async () => {
  const vehicle = { id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Equipo remoto", crewType: "MUNICIPAL" as const, leaderUserId: null, leaderName: null, organizationId: null, organizationName: null, members: [], memberUserIds: [], specialty: null, homeZoneId: null, effectiveZoneId: null, membersCount: null, defaultShift: "MORNING" as const, active: true };
  let removed = false;
  vi.spyOn(crewsAdapter, "remove").mockImplementation(async () => { removed = true; return { ...vehicle, active: false }; });
  vi.spyOn(crewsAdapter, "get").mockResolvedValue(vehicle);
  const list = vi.spyOn(crewsAdapter, "list").mockImplementation(async (query) => ({ crews: removed && query?.page === 3 ? [] : [vehicle], page: query?.page ?? 1, pageSize: 20, total: removed ? 40 : 41, totalPages: removed ? 2 : 3 }));
  const user = userEvent.setup();
  render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("Equipo remoto");
  await user.click(screen.getByRole("combobox", { name: "Estado" }));
  await user.click(await screen.findByRole("option", { name: "Activas" }));
  await user.click(await screen.findByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 3");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 3 de 3");
  const row = screen.getByRole("row", { name: /Equipo remoto/ });
  await user.click(within(row).getByRole("button", { name: "Ver detalle de Equipo remoto" }));
  const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
  await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Equipo remoto");
  await user.click(within(dialog).getByRole("button", { name: "Dar de baja" }));
  expect(await screen.findByText("Página 2 de 2")).toBeVisible();
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, active: true })));
});

 it("shows response names and neutral identifiers in the table and detail", async () => {
  const user = userEvent.setup();
  render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
  const row = await screen.findByRole("row", { name: /Cuadrilla B/ });
  expect(within(row).getByText("Usuario user-maria")).toBeVisible();
  expect(within(row).getByText("Organizaci\u00f3n sin nombre (id org-cooperativa)")).toBeVisible();
  const emptyRow = screen.getByRole("row", { name: /Cuadrilla D/ });
  expect(within(emptyRow).getByText("\u2014")).toBeVisible();
  expect(within(emptyRow).getByText("Sin organizaci\u00f3n externa")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Ver detalle de Cuadrilla A \u00b7 L\u00f3pez" }));
  const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
  expect(within(sheet).getByRole("button", { name: "Quitar a Carlos L\u00f3pez" })).toBeVisible();
  expect(within(sheet).getByRole("button", { name: "Quitar a Usuario user-lucia" })).toBeVisible();
  expect(within(sheet).getByText(/lista de ejemplo/)).toBeVisible();
});
