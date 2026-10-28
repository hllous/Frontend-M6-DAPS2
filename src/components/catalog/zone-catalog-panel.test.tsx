import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { createSessionCookie } from "@/test/session";
import { neighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { resetZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { ZoneCatalogPanel } from "./zone-catalog-panel";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);


async function chooseSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  accessibleName: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: accessibleName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetZoneFixtures();
});
afterAll(() => server.close());

describe("ZoneCatalogPanel component", () => {

  it("requires acknowledgement when zone references cannot be verified", async () => {
    server.use(http.get("/api/zones/:id/references", () => HttpResponse.json({ message: "No disponible" }, { status: 503 })));
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Belgrano/ });
    await user.click(within(row).getByRole("button", { name: "Dar de baja" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("No se pudo verificar si la zona está en uso.")).toBeVisible();
    const confirm = within(dialog).getByRole("button", { name: "Dar de baja la zona Belgrano" });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox", { name: "Dar de baja de todos modos" }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(zoneFixtures.find((zone) => zone.id === "zone-1")?.active).toBe(false);
  });

  it("renders the zones catalog with heading, search input, and table for Office", async () => {
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("heading", { name: "Zonas operativas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva zona/i })).toBeVisible();
    expect(screen.getByLabelText("Buscar zona")).toBeInTheDocument();

    // Wait for fixtures to load
    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
      expect(screen.queryByText("belgrano")).not.toBeInTheDocument();
      expect(screen.queryByText("Z-PAL")).not.toBeInTheDocument();
    });
  });

  it("filters zones by search query", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Buscar zona");
    await user.type(searchInput, "Pal");

    await waitFor(() => {
      expect(screen.queryAllByText("Belgrano")).toHaveLength(0);
      expect(screen.getAllByText("Palermo")[0]!).toBeInTheDocument();
    });
  });

  it("filters zones by active status", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Recoleta")[0]!).toBeInTheDocument();
    });

    await chooseSelectOption(user, "Filtrar por estado", "Activas");

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
      expect(screen.getAllByText("Palermo")[0]!).toBeInTheDocument();
      expect(screen.getAllByText("Recoleta")[0]!).toBeInTheDocument();
      expect(screen.getAllByText("Retiro")[0]!).toBeInTheDocument();
    });
  });

  it("focuses the first invalid field when the create form is submitted empty", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /nueva zona/i }));
    await user.click(screen.getByRole("button", { name: "Crear zona" }));

    const codeInput = screen.getByLabelText("Código");
    await waitFor(() => expect(codeInput).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true");
    expect(codeInput).toHaveFocus();
  });

  it("allows Office to create a new zone with unique code and name", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    const newZoneButton = screen.getByRole("button", { name: /nueva zona/i });
    await user.click(newZoneButton);

    expect(screen.getByRole("heading", { name: "Nueva zona operativa" })).toBeInTheDocument();

    const codeInput = screen.getByLabelText("Código");
    const nameInput = screen.getByLabelText("Nombre");

    await user.type(codeInput, "Z-04");
    await user.type(nameInput, "Zona Centro Histórico");

    const submitButton = screen.getByRole("button", { name: "Crear zona" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText("Z-04")).not.toBeInTheDocument();
      expect(screen.getByText("Zona Centro Histórico")).toBeInTheDocument();
    });
  });

  it("displays conflict error when attempting to create a zone with duplicate code", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /nueva zona/i }));

    const codeInput = screen.getByLabelText("Código");
    const nameInput = screen.getByLabelText("Nombre");

    await user.type(codeInput, "belgrano");
    await user.type(nameInput, "Zona Duplicada");

    await user.click(screen.getByRole("button", { name: "Crear zona" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Ya existe una zona operativa con el código belgrano");
    });

    expect(codeInput).toHaveAttribute("aria-invalid", "true");
    const errorId = codeInput.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(errorId ? document.getElementById(errorId) : null).toHaveTextContent(
      "Ya existe una zona operativa con el código belgrano",
    );
  });

  it("allows Office to edit a zone and enforces that code is read-only / immutable", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    // Find the row for Z-01 and click Editar
    const row = screen.getAllByText("Belgrano")[0]!.closest("tr")!;
    const editButton = within(row).getByRole("button", { name: /editar/i });
    await user.click(editButton);

    expect(screen.getByRole("heading", { name: "Editar zona operativa" })).toBeInTheDocument();

    const codeInput = screen.getByLabelText(/código/i);
    expect(codeInput).toHaveAttribute("readOnly");
    expect(codeInput).toHaveAttribute("aria-readonly", "true");
    expect(codeInput).toHaveValue("belgrano");

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(nameInput).toHaveAttribute("aria-invalid", "true"));
    expect(nameInput).toHaveFocus();
    const errorId = nameInput.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(errorId ? document.getElementById(errorId) : null).toHaveTextContent("El nombre es obligatorio.");

    await user.type(nameInput, "Zona Norte Modificada");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(screen.getByText("Zona Norte Modificada")).toBeInTheDocument();
    });
  });

  it("shows confirmation dialog with referential check when deactivating a referenced zone", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    // Click Dar de baja on Z-01 (which has active routes, containers, trees, green spaces)
    const row = screen.getAllByText("Belgrano")[0]!.closest("tr")!;
    const deleteButton = within(row).getByRole("button", { name: /dar de baja/i });
    await user.click(deleteButton);

    // Confirmation dialog should appear
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Dar de baja la zona Belgrano" })).toBeInTheDocument();
    expect(within(dialog).getByText(/La zona está en uso/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Recorridos activos/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/^Contenedores$/)).toBeInTheDocument();
    expect(within(dialog).getByText(/^Árboles$/)).toBeInTheDocument();
    expect(within(dialog).getByText(/^Espacios verdes$/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/backend/i)).not.toBeInTheDocument();

    expect(screen.queryByRole("checkbox", { name: "Dar de baja de todos modos" })).not.toBeInTheDocument();

    // Confirm deactivation
    const confirmButton = within(dialog).getByRole("button", { name: "Dar de baja la zona Belgrano" });
    await user.click(confirmButton);

    // Dialog should close and zone status becomes Inactiva
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Dar de baja la zona Belgrano" })).not.toBeInTheDocument();
      const updatedRow = screen.getAllByText("Belgrano")[0]!.closest("tr")!;
      expect(within(updatedRow).getByText("Inactiva")).toBeInTheDocument();
    });
  });

  it("shows a deactivation failure as an alert and keeps the confirmation open", async () => {
    server.use(http.delete("/api/zones/:id", () => HttpResponse.json({
      statusCode: 500,
      message: "No se pudo dar de baja la zona.",
      error: "Internal Server Error",
      timestamp: "2026-10-13T12:00:00.000Z",
      path: "/api/zones/zone-1",
    }, { status: 500 })));
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Belgrano/ });
    await user.click(within(row).getByRole("button", { name: "Dar de baja" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Dar de baja la zona Belgrano" });
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    const errorMessage = await within(dialog).findByText("No se pudo dar de baja la zona.");
    expect(errorMessage.closest('[role="alert"]')).toHaveTextContent("No se pudo dar de baja la zona.");
    expect(dialog).toBeVisible();
  });

  async function openNeighborhoods(user: ReturnType<typeof userEvent.setup>) {
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = (await screen.findByRole("row", { name: /Belgrano/ }));
    await user.click(within(row).getByRole("button", { name: /^barrios$/i }));
    return screen.findByRole("dialog");
  }

  it("searches, assigns, and removes neighborhoods grouped by commune, resolving names from the catalog", async () => {
    const user = userEvent.setup({ delay: null });
    const dialog = await openNeighborhoods(user);

    expect(within(dialog).getByRole("heading", { name: "Barrios", level: 2 })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("list", { name: "Barrios" })).toHaveTextContent("Belgrano"));
    expect(within(dialog).getByRole("list", { name: "Barrios" })).toHaveTextContent("Comuna 13");
    // Los 16 barrios ficticios dados de baja no se ofrecen para asignar.
    expect(within(dialog).queryByRole("checkbox", { name: "Alto Verde" })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Buscar barrios"), "Recol");
    const commune2 = within(dialog).getByRole("group", { name: "Comuna 2" });
    await user.click(within(commune2).getByRole("checkbox", { name: "Recoleta" }));
    await user.click(within(dialog).getByRole("button", { name: "Asignar seleccionados" }));

    await waitFor(() => {
      expect(within(dialog).getByRole("list", { name: "Barrios" })).toHaveTextContent("Recoleta");
    });
    expect(zoneFixtures.find((zone) => zone.id === "zone-1")?.neighborhoodIds).toHaveLength(2);

    await user.click(within(dialog).getByRole("button", { name: "Quitar Recoleta" }));
    await waitFor(() => {
      expect(within(dialog).getByRole("list", { name: "Barrios" })).not.toHaveTextContent("Recoleta");
    });
  });

  it("shows an inactive neighborhood assigned to a zone as inactive instead of hiding it", async () => {
    const user = userEvent.setup({ delay: null });
    zoneFixtures[0]!.neighborhoodIds = [neighborhoodFixtures.find((barrio) => barrio.codigo === "alto-verde")!.id];
    const dialog = await openNeighborhoods(user);

    const list = await within(dialog).findByRole("list", { name: "Barrios" });
    expect(list).toHaveTextContent("Alto Verde");
    expect(list).toHaveTextContent("Inactivo");
  });

  it("explains that the neighborhood catalog is not available yet (503) and lets the user retry", async () => {
    const user = userEvent.setup({ delay: null });
    server.use(http.get("*/api/neighborhoods", () => HttpResponse.json({ statusCode: 503, message: "Catálogo no cargado" }, { status: 503 })));
    const dialog = await openNeighborhoods(user);

    expect(await within(dialog).findByText(/catálogo de barrios todavía no está disponible/i)).toBeVisible();
    server.resetHandlers();
    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    expect(await within(dialog).findByRole("checkbox", { name: "Palermo" })).toBeVisible();
  });

  it("reloads the catalog and asks to choose again when the backend rejects an unknown neighborhood (400)", async () => {
    const user = userEvent.setup({ delay: null });
    const dialog = await openNeighborhoods(user);

    await user.click(await within(dialog).findByRole("checkbox", { name: "Palermo" }));
    // Between opening and assigning, M9 dropped Palermo from the catalog.
    server.use(
      http.post("*/api/zones/:id/neighborhoods", () => HttpResponse.json({ statusCode: 400, message: "neighborhoodId desconocido", error: "Bad Request", timestamp: "2026-10-27T12:00:00.000Z", path: "/zones/zone-1/neighborhoods" }, { status: 400 })),
      http.get("*/api/neighborhoods", () => HttpResponse.json(neighborhoodFixtures.filter((barrio) => barrio.codigo !== "palermo"))),
    );
    await user.click(within(dialog).getByRole("button", { name: "Asignar seleccionados" }));

    expect(await within(dialog).findByText(/ya no está en el catálogo/i)).toBeVisible();
    expect(within(dialog).queryByRole("checkbox", { name: "Palermo" })).not.toBeInTheDocument();
    expect(within(dialog).getByText("0 seleccionados")).toBeVisible();
  });

  it("filters zones by commune and shows the commune of each zone", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("row", { name: /Belgrano/ });
    expect(within(screen.getByRole("row", { name: /Belgrano/ })).getByText("Comuna 13")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Filtrar por comuna" })).toBeInTheDocument());
    await chooseSelectOption(user, "Filtrar por comuna", "Comuna 14");

    await waitFor(() => {
      expect(screen.queryByRole("row", { name: /Belgrano/ })).not.toBeInTheDocument();
      expect(screen.getByRole("row", { name: /Palermo/ })).toBeInTheDocument();
    });
  });

  it("lists all 48 zones, not just the first page", async () => {
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("row", { name: /Belgrano/ });
    expect(screen.getAllByRole("row")).toHaveLength(zoneFixtures.length + 1);
  });

  const barrioId = (codigo: string) => neighborhoodFixtures.find((barrio) => barrio.codigo === codigo)!.id;
  const envelope = (statusCode: number, message: string) => ({ statusCode, message, error: "Error", timestamp: "2026-10-27T12:00:00.000Z", path: "/zones" });

  it("does not reopen the dialog when it is closed while the catalog is still loading", async () => {
    const user = userEvent.setup({ delay: null });
    let release: (() => void) | undefined;
    server.use(http.get("*/api/neighborhoods", async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return HttpResponse.json([]);
    }));
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(within(await screen.findByRole("row", { name: /Belgrano/ })).getByRole("button", { name: /^barrios$/i }));
    await screen.findByRole("dialog");
    await waitFor(() => expect(release).toBeDefined());

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    release!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the names the zone already carries when the catalog fails, and never shows a loading text forever", async () => {
    const user = userEvent.setup({ delay: null });
    zoneFixtures[0]!.neighborhoodIds = [barrioId("belgrano"), barrioId("palermo")];
    server.use(http.get("*/api/neighborhoods", () => HttpResponse.json(envelope(503, "Sin catálogo"), { status: 503 })));
    const dialog = await openNeighborhoods(user);

    const list = await within(dialog).findByRole("list", { name: "Barrios" });
    expect(list).toHaveTextContent("Belgrano");
    expect(list).toHaveTextContent("No se pudo cargar el nombre");
    expect(list).not.toHaveTextContent("Cargando barrio");
  });

  it("leaves a single message with a retry that only reloads the catalog when a 400 is followed by a failed reload", async () => {
    const user = userEvent.setup({ delay: null });
    const dialog = await openNeighborhoods(user);
    await user.click(await within(dialog).findByRole("checkbox", { name: "Palermo" }));
    server.use(
      http.post("*/api/zones/:id/neighborhoods", () => HttpResponse.json(envelope(400, "desconocido"), { status: 400 })),
      http.get("*/api/neighborhoods", () => HttpResponse.json(envelope(503, "Sin catálogo"), { status: 503 })),
    );
    await user.click(within(dialog).getByRole("button", { name: "Asignar seleccionados" }));

    expect(await within(dialog).findByText(/catálogo de barrios todavía no está disponible/i)).toBeVisible();
    expect(within(dialog).queryByText(/ya no está en el catálogo/i)).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
    server.resetHandlers();
    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    expect(await within(dialog).findByRole("checkbox", { name: "Palermo" })).toBeVisible();
  });

  it("shows the backend message and keeps the selection when a 400 is a validation error, not a catalog change", async () => {
    const user = userEvent.setup({ delay: null });
    const dialog = await openNeighborhoods(user);
    await user.click(await within(dialog).findByRole("checkbox", { name: "Palermo" }));
    server.use(http.post("*/api/zones/:id/neighborhoods", () => HttpResponse.json(envelope(400, "neighborhoodIds admite hasta 100 elementos"), { status: 400 })));
    await user.click(within(dialog).getByRole("button", { name: "Asignar seleccionados" }));

    expect(await within(dialog).findByText("neighborhoodIds admite hasta 100 elementos")).toBeVisible();
    expect(within(dialog).getByRole("checkbox", { name: "Palermo" })).toBeChecked();
    expect(within(dialog).getByText("1 seleccionado")).toBeVisible();
  });

  it("warns that the commune controls are unavailable when /communes fails, keeping the list", async () => {
    server.use(http.get("*/api/communes", () => HttpResponse.json(envelope(500, "Error"), { status: 500 })));
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText(/No se pudieron cargar las comunas/)).toBeVisible();
    expect(screen.getByRole("row", { name: /Belgrano/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Filtrar por comuna" })).not.toBeInTheDocument();
  });

  it("shows «Sin comuna» for a zone without commune and a dash when it has no barrio", async () => {
    zoneFixtures[0]!.commune = null;
    zoneFixtures[0]!.neighborhood = null;
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /Belgrano/ });
    expect(within(row).getByText("Sin comuna")).toBeVisible();
    expect(within(row).getByText("—")).toBeVisible();
  });

  it("does not send the commune when editing a zone unless it changed", async () => {
    const user = userEvent.setup({ delay: null });
    let body: Record<string, unknown> | undefined;
    server.use(http.patch("*/api/zones/:id", async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...zoneFixtures[0], ...body });
    }));
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await user.click(within(await screen.findByRole("row", { name: /Belgrano/ })).getByRole("button", { name: /editar/i }));
    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Belgrano Norte");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toEqual({ name: "Belgrano Norte", active: true });
  });

  it("renders a read-only presentation without mutation actions for Field actors", async () => {
    render(<ZoneCatalogPanel scenario={scenarios.fieldCrewMember} />);

    await waitFor(() => {
      expect(screen.getAllByText("Belgrano")[0]!).toBeInTheDocument();
    });

    // "Nueva zona" should not exist
    expect(screen.queryByRole("button", { name: /nueva zona/i })).not.toBeInTheDocument();

    // Table rows should show "Solo consulta" instead of action buttons
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Solo consulta").length).toBeGreaterThan(0);
  });

  it("returns the BFF forbidden envelope for a Field write", async () => {
    const fieldCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const response = await fetch("http://localhost/api/zones", {
      method: "POST",
      headers: { cookie: fieldCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "Z-NEW", name: "Nueva" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      statusCode: 403,
      message: "Solo el rol de Oficina puede crear zonas operativas.",
      error: "Forbidden",
      path: "/api/zones",
    });
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("row", { name: /Belgrano/ });

    expectNoInternalJargon(container);
  });
});
