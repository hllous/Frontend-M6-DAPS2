import { chooseCatalogOption } from "./catalog-a-test-controls";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { greenSpacesAdapter } from "@/lib/green-spaces";
import { GreenSpacesPanel } from "./green-spaces-panel";

const server = setupServer(...handlers);

async function openGreenSpaceDetail(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
) {
  await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));
  return screen.getByRole("dialog");
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("GreenSpacesPanel", () => {
  it("lists GreenSpaces and filters them by type and zone", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Espacios verdes" })).toBeVisible();
    expect(screen.getByText("Parque del Bicentenario")).toBeVisible();
    const row = await screen.findByRole("row", { name: /Parque del Bicentenario/ });
    expect(row.querySelector('th[data-label="Nombre"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();
    expect(within(row).getByRole("button", { name: "Ver detalle de Parque del Bicentenario" })).toBeEnabled();

    await chooseCatalogOption(user, screen.getByLabelText("Tipo de espacio"), "Cantero");
    expect(await screen.findByText("Cantero Central")).toBeVisible();
    expect(screen.queryByText("Parque del Bicentenario")).not.toBeInTheDocument();

    await chooseCatalogOption(user, screen.getByLabelText("Zona"), "Z-PAL · Palermo");
    expect(screen.getByText("Cantero Central")).toBeVisible();
  });

  it("allows Office to create, edit, and logically deactivate a GreenSpace", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByText("Parque del Bicentenario");
    await user.click(screen.getByRole("button", { name: "Registrar espacio verde" }));
    const dialog = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Nombre"), "Plaza creada desde panel");
    await chooseCatalogOption(user, screen.getByLabelText("Tipo de espacio en el formulario"), "Plaza");
    await user.type(screen.getByLabelText("Superficie (m²)"), "275");
    await chooseCatalogOption(user, screen.getByLabelText("Zona en el formulario"), "Z-BEL · Belgrano");
    await user.click(screen.getByRole("button", { name: "Guardar espacio verde" }));

    expect(await screen.findByText("Espacio verde registrado.")).toBeVisible();
    expect(dialog).not.toBeVisible();

    const createdRow = screen.getByRole("row", { name: /Plaza creada desde panel/ });
    const createdDetail = await openGreenSpaceDetail(user, createdRow);
    await user.click(within(createdDetail).getByRole("button", { name: "Editar" }));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Plaza editada desde panel");
    await user.click(screen.getByRole("button", { name: "Guardar espacio verde" }));
    expect(await screen.findByText("Espacio verde actualizado.")).toBeVisible();
    expect(screen.getByText("Plaza editada desde panel")).toBeVisible();

    const editedRow = screen.getByRole("row", { name: /Plaza editada desde panel/ });
    const editedDetail = await openGreenSpaceDetail(user, editedRow);
    await user.click(within(editedDetail).getByRole("button", { name: "Dar de baja" }));
    const confirmation = screen.getByRole("dialog");
    expect(confirmation).toHaveTextContent("Plaza editada desde panel");
    expect(within(confirmation).getByRole("button", { name: /Conservar el espacio verde/ })).toBeVisible();
    await user.click(within(confirmation).getByRole("button", { name: /Dar de baja el espacio verde Plaza editada desde panel/ }));
    expect(await screen.findByText(/dado de baja/)).toBeVisible();
  }, 10_000);

  it("keeps management controls hidden for Field actors", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("Parque del Bicentenario")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar espacio verde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    const detail = await openGreenSpaceDetail(user, screen.getByRole("row", { name: /Parque del Bicentenario/ }));
    expect(within(detail).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("renders a retryable error state", async () => {
    server.use(http.get("*/api/green-spaces", () => HttpResponse.json({ oops: true }, { status: 500 })));

    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText(/contrato documentado/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
  });

  it("shows the zone name in the Zona column and never the raw zone id", async () => {
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Parque del Bicentenario/ });
    expect(await within(row).findByText("Z-BEL · Belgrano")).toBeVisible();
    expect(within(row).queryByText("zone-1")).not.toBeInTheDocument();
  });

  it("shows neutral text while zones load and when a zone cannot be resolved", async () => {
    let releaseZones = () => {};
    const zonesGate = new Promise<void>((resolve) => { releaseZones = resolve; });
    server.use(http.get("*/api/zones", async () => {
      await zonesGate;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } });
    }));
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Parque del Bicentenario/ });
    expect(within(row).getByText("Cargando zona…")).toBeVisible();
    releaseZones();
    expect(await within(row).findByText("Zona no disponible")).toBeVisible();
    expect(within(row).queryByText("zone-1")).not.toBeInTheDocument();
  });

  it("requests zones with the maximum page size so every zone resolves", async () => {
    const pageSizes: Array<string | null> = [];
    server.use(http.get("*/api/zones", ({ request }) => {
      pageSizes.push(new URL(request.url).searchParams.get("pageSize"));
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } });
    }));
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("row", { name: /Parque del Bicentenario/ });
    expect(pageSizes).toContain("100");
  });
});


describe("GreenSpacesPanel pagination", () => {
  it("lets Office choose and clear the status filter from its accessible popup", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByText("Parque del Bicentenario");
    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(await screen.findByRole("option", { name: "Activos" }));
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent(/^Activos(?:▼)?$/);
    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.click(await screen.findByRole("option", { name: "Todos" }));
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent(/^Todos(?:▼)?$/);
    const trigger = screen.getByRole("combobox", { name: "Estado" });
    await user.click(trigger);
    await screen.findByRole("option", { name: "Activos" });
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("pages through backend results and resets the page when filtering", async () => {
    const list = vi.spyOn(greenSpacesAdapter, "list").mockImplementation(async (query) => ({ greenSpaces: Array.from({ length: 20 }, (_, index) => ({ ...{ id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Plaza remota", spaceType: "SQUARE" as const, zoneId: "zone-1", areaM2: 100, lat: null, lng: null, active: true }, id: `remote-${index}` })), page: query?.page ?? 1, pageSize: 20, total: 57, totalPages: 3 }));
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 })));
    expect(await screen.findByText("Mostrando 21–40 de 57")).toBeVisible();
    for (const [label, value] of [["Estado", "true"], ["Tipo de espacio", "SQUARE"], ["Zona", "zone-1"]]) {
      await chooseCatalogOption(user, screen.getByRole("combobox", { name: label }), ({ true: "Activos", SQUARE: "Plaza", "zone-1": "Z-BEL · Belgrano" } as Record<string, string>)[value]);
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
      expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText("Mostrando 21–40 de 57");
    }
  });
});


it("clamps the current page after its last active record is deactivated", async () => {
  const vehicle = { id: "a358142e-a427-46b3-8b36-fb13091e023f", name: "Plaza remota", spaceType: "SQUARE" as const, zoneId: "zone-1", areaM2: 100, lat: null, lng: null, active: true };
  let removed = false;
  const remove = vi.spyOn(greenSpacesAdapter, "remove").mockImplementation(async () => { removed = true; return { ...vehicle, active: false }; });
  const list = vi.spyOn(greenSpacesAdapter, "list").mockImplementation(async (query) => ({ greenSpaces: removed && query?.page === 3 ? [] : [vehicle], page: query?.page ?? 1, pageSize: 20, total: removed ? 40 : 41, totalPages: removed ? 2 : 3 }));
  const user = userEvent.setup();
  render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("Plaza remota");
  await chooseCatalogOption(user, screen.getByLabelText("Estado"), "Activos");
  await user.click(await screen.findByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 3");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 3 de 3");
  const row = screen.getByRole("row", { name: /Plaza remota/ });
  const detail = await openGreenSpaceDetail(user, row);
  await user.click(within(detail).getByRole("button", { name: "Dar de baja" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Plaza remota");
  expect(remove).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: /Dar de baja el espacio verde Plaza remota/ }));
  expect(await screen.findByText("Página 2 de 2")).toBeVisible();
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, active: true })));
});
