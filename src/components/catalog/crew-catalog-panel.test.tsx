import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { crewsAdapter } from "@/lib/crews";
import { crewFixtures, resetCrewFixtures } from "@/lib/crew-fixtures";
import { m1IdentityAdapter } from "@/lib/m1-identity";
import { CrewCatalogPanel } from "./crew-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => { server.resetHandlers(); resetCrewFixtures(); vi.restoreAllMocks(); });
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


describe("nombres de referencias de cuadrilla", () => {
  it("muestra nombres, identificadores y ausencia en tabla y detalle", async () => {
    const empty = crewFixtures.find((crew) => crew.id === "crew-d")!;
    empty.members = [];
    empty.memberUserIds = [];
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const named = await screen.findByRole("row", { name: /Cuadrilla A/ });
    expect(within(named).getByText("Carlos López")).toBeVisible();
    expect(within(named).getByText("Municipalidad")).toBeVisible();
    const unnamed = screen.getByRole("row", { name: /Cuadrilla B/ });
    expect(within(unnamed).getByText("Usuario user-maria")).toBeVisible();
    expect(within(unnamed).getByText("Organización sin nombre (id org-cooperativa)")).toBeVisible();
    const absent = screen.getByRole("row", { name: /Cuadrilla D/ });
    expect(within(absent).getByText("—")).toBeVisible();
    expect(within(absent).getByText("Sin organización externa")).toBeVisible();
    await user.click(within(named).getByRole("button", { name: /Ver detalle/ }));
    let sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const members = within(sheet).getByRole("list", { name: "Integrantes de la cuadrilla" });
    expect(within(members).getByText("Carlos López")).toBeVisible();
    expect(within(members).getByText("Usuario user-lucia")).toBeVisible();
    expect(within(members).getByRole("button", { name: "Quitar a Carlos López" })).toBeVisible();
    expect(within(members).getByRole("button", { name: "Quitar a Usuario user-lucia" })).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(within(absent).getByRole("button", { name: /Ver detalle/ }));
    sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    expect(within(sheet).getByRole("list", { name: "Integrantes de la cuadrilla" })).toBeEmptyDOMElement();
    expect(within(sheet).queryByRole("button", { name: /^Quitar/ })).not.toBeInTheDocument();
  });

  it("envía el nombre del integrante seleccionado al BFF", async () => {
    let payload: unknown;
    const listener = async ({ request }: { request: Request }) => {
      if (request.method === "POST" && new URL(request.url).pathname === "/api/crews/crew-membership/members") {
        payload = await request.clone().json();
      }
    };
    server.events.on("request:start", listener);
    try {
      const user = userEvent.setup();
      render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
      await user.click(await screen.findByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }));
      const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
      await user.click(within(sheet).getByRole("combobox", { name: /^Agregar integrantes/ }));
      await user.click(await screen.findByRole("option", { name: "Pedro Ruiz, no seleccionado" }));
      await user.keyboard("{Escape}");
      await user.click(within(sheet).getByRole("button", { name: "Agregar integrantes" }));
      await screen.findByRole("button", { name: "Quitar a Pedro Ruiz" });
      expect(payload).toEqual({ members: [{ userId: "user-pedro", displayName: "Pedro Ruiz" }] });
    } finally {
      server.events.removeListener("request:start", listener);
    }
  });

  it("explica la fuente y la ausencia de candidatos disponibles", async () => {
    const crew = crewFixtures.find((item) => item.id === "crew-membership")!;
    crew.members = (await m1IdentityAdapter.listUsers()).map(({ id, displayName }) => ({ userId: id, displayName }));
    crew.memberUserIds = crew.members.map(({ userId }) => userId);
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    expect(within(sheet).getByText("Los candidatos provienen de una lista de ejemplo de personas.")).toBeVisible();
    expect(within(sheet).getByText("No hay integrantes disponibles para agregar.")).toBeVisible();
    await user.click(within(sheet).getByRole("combobox", { name: /^Agregar integrantes/ }));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("especialidad y zona de cuadrilla", () => {
  async function pick(user: ReturnType<typeof userEvent.setup>, name: string | RegExp, option: string) {
    await user.click(screen.getByRole("combobox", { name }));
    await user.click(await screen.findByRole("option", { name: option }));
  }

  it("muestra especialidad y zona vigente en la tabla, con el identificador de zonas desconocidas", async () => {
    crewFixtures.find((crew) => crew.id === "crew-d")!.effectiveZoneId = "zone-inexistente";
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Especialidad" })).toBeVisible();
    expect(within(table).getByRole("columnheader", { name: "Zona" })).toBeVisible();
    const a = await screen.findByRole("row", { name: /Cuadrilla A/ });
    expect(within(a).getByText("Recolección")).toBeVisible();
    expect(await within(a).findByText("Belgrano")).toBeVisible();
    const d = screen.getByRole("row", { name: /Cuadrilla D/ });
    expect(within(d).getByText("Sin especialidad")).toBeVisible();
    expect(within(d).getByText("zone-inexistente")).toBeVisible();
    expect(within(screen.getByRole("row", { name: /Cuadrilla E/ })).getByText("Sin zona")).toBeVisible();
  });

  it("filtra por zona y por especialidad y conserva los filtros al paginar", async () => {
    const list = vi.spyOn(crewsAdapter, "list");
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("row", { name: /Cuadrilla A/ });
    await pick(user, "Zona", "Retiro");
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ zoneId: "zone-4" })));
    expect(await screen.findByRole("row", { name: /Cuadrilla C/ })).toBeVisible();
    expect(screen.queryByRole("row", { name: /Cuadrilla A/ })).not.toBeInTheDocument();
    await pick(user, "Especialidad", "Arbolado");
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ zoneId: "zone-4", specialty: "TREES", page: 1 })));
    await pick(user, "Turno", "Mañana");
    expect(await screen.findByText("No hay cuadrillas que coincidan con los filtros.")).toBeVisible();
  });

  it("muestra en el detalle especialidad, zona base, zona vigente y la marca de reubicada", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Ver detalle de Cuadrilla C · Ibáñez" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const field = (label: string) => within(sheet).getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;
    expect(field("Especialidad")).toHaveTextContent("Arbolado");
    await waitFor(() => expect(field("Zona base")).toHaveTextContent("Recoleta"));
    expect(field("Zona vigente hoy")).toHaveTextContent("Retiro");
    expect(within(sheet).getByText("Reubicada")).toBeVisible();
  });

  it("no marca como reubicada a una cuadrilla en su zona base", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Ver detalle de Cuadrilla A · López" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    expect(within(sheet).queryByText("Reubicada")).not.toBeInTheDocument();
  });

  it("muestra a Campo la especialidad y la zona de su cuadrilla sin acciones", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.fieldCrewMember} />);
    const row = await screen.findByRole("row", { name: /Cuadrilla B/ });
    expect(within(row).getByText("Barrido")).toBeVisible();
    expect(await within(row).findByText("Palermo")).toBeVisible();
    await user.click(within(row).getByRole("button", { name: /Ver detalle/ }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    expect(within(sheet).getByText("Barrido", { selector: "dd" })).toBeVisible();
    expect(within(sheet).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("exige la especialidad al registrar, en español y antes de enviar", async () => {
    const create = vi.spyOn(crewsAdapter, "create");
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Registrar cuadrilla" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar cuadrilla" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Cuadrilla nueva");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cuadrilla" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("La especialidad es obligatoria.");
    expect(create).not.toHaveBeenCalled();
  });

  it("registra con especialidad y zona base opcional", async () => {
    const create = vi.spyOn(crewsAdapter, "create");
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Registrar cuadrilla" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar cuadrilla" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Cuadrilla nueva");
    await user.click(within(dialog).getByRole("combobox", { name: "Especialidad" }));
    await user.click(await screen.findByRole("option", { name: "Reciclaje" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cuadrilla" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ specialty: "RECYCLING", homeZoneId: undefined })));
    const row = await screen.findByRole("row", { name: /Cuadrilla nueva/ });
    expect(within(row).getByText("Reciclaje")).toBeVisible();
    expect(within(row).getByText("Sin zona")).toBeVisible();
  });

  it("edita especialidad y zona base", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("button", { name: "Ver detalle de Cuadrilla A · López" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Detalle de cuadrilla" })).getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar cuadrilla" });
    await user.click(within(dialog).getByRole("combobox", { name: "Especialidad" }));
    await user.click(await screen.findByRole("option", { name: "Barrido" }));
    await user.click(within(dialog).getByRole("combobox", { name: "Zona base" }));
    await user.click(await screen.findByRole("option", { name: "Palermo" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cuadrilla" }));
    const row = await screen.findByRole("row", { name: /Cuadrilla A/ });
    await waitFor(() => expect(within(row).getByText("Barrido")).toBeVisible());
    expect(within(row).getByText("Palermo")).toBeVisible();
  });
});
