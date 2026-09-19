import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { ZoneCatalogPanel } from "./zone-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetZoneFixtures();
});
afterAll(() => server.close());

describe("ZoneCatalogPanel component", () => {
  it("renders the zones catalog with heading, search input, and table for Office", async () => {
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("heading", { name: "Zonas operativas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva zona/i })).toBeVisible();
    expect(screen.getByLabelText("Buscar zonas operativas")).toBeInTheDocument();

    // Wait for fixtures to load
    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
      expect(screen.getByText("Belgrano")).toBeInTheDocument();
      expect(screen.getByText("Z-PAL")).toBeInTheDocument();
    });
  });

  it("filters zones by search query", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Belgrano")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Buscar zonas operativas");
    await user.type(searchInput, "Pal");

    await waitFor(() => {
      expect(screen.queryByText("Belgrano")).not.toBeInTheDocument();
      expect(screen.getByText("Palermo")).toBeInTheDocument();
    });
  });

  it("filters zones by active status", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Recoleta")).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText("Filtrar por estado");
    await user.selectOptions(statusFilter, "true");

    await waitFor(() => {
      expect(screen.getByText("Belgrano")).toBeInTheDocument();
      expect(screen.getByText("Palermo")).toBeInTheDocument();
      expect(screen.getByText("Recoleta")).toBeInTheDocument();
      expect(screen.getByText("Retiro")).toBeInTheDocument();
    });
  });

  it("allows Office to create a new zone with unique code and name", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
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
      expect(screen.getByText("Z-04")).toBeInTheDocument();
      expect(screen.getByText("Zona Centro Histórico")).toBeInTheDocument();
    });
  });

  it("displays conflict error when attempting to create a zone with duplicate code", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /nueva zona/i }));

    const codeInput = screen.getByLabelText("Código");
    const nameInput = screen.getByLabelText("Nombre");

    await user.type(codeInput, "Z-BEL");
    await user.type(nameInput, "Zona Duplicada");

    await user.click(screen.getByRole("button", { name: "Crear zona" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Ya existe una zona operativa con el código Z-BEL");
    });
  });

  it("allows Office to edit a zone and enforces that code is read-only / immutable", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
    });

    // Find the row for Z-01 and click Editar
    const row = screen.getByText("Z-BEL").closest("tr")!;
    const editButton = within(row).getByRole("button", { name: /editar/i });
    await user.click(editButton);

    expect(screen.getByRole("heading", { name: "Editar zona operativa" })).toBeInTheDocument();

    const codeInput = screen.getByLabelText(/código/i);
    expect(codeInput).toHaveAttribute("readOnly");
    expect(codeInput).toHaveAttribute("aria-readonly", "true");
    expect(codeInput).toHaveValue("Z-BEL");

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Zona Norte Modificada");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(screen.getByText("Zona Norte Modificada")).toBeInTheDocument();
    });
  });

  it("shows confirmation dialog with referential check when deactivating a referenced zone", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
    });

    // Click Dar de baja on Z-01 (which has active routes, containers, trees, green spaces)
    const row = screen.getByText("Z-BEL").closest("tr")!;
    const deleteButton = within(row).getByRole("button", { name: /dar de baja/i });
    await user.click(deleteButton);

    // Confirmation dialog should appear
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Confirmar baja de zona operativa" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Advertencia: esta zona todavía cuenta con elementos activos referenciados/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Recorridos activos/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Contenedores asociados:/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Árboles censados:/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Espacios verdes:/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/El backend no realiza control de integridad referencial/i)).toBeInTheDocument();

    // Confirm deactivation
    const confirmButton = within(dialog).getByRole("button", { name: "Dar de baja de todas formas" });
    await user.click(confirmButton);

    // Dialog should close and zone status becomes Inactiva
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Confirmar baja de zona operativa" })).not.toBeInTheDocument();
      const updatedRow = screen.getByText("Z-BEL").closest("tr")!;
      expect(within(updatedRow).getByText("Inactiva")).toBeInTheDocument();
    });
  });

  it("searches, assigns, and removes neighborhoods from a Zone", async () => {
    const user = userEvent.setup();
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
    });

    const row = screen.getByText("Z-BEL").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /gestionar barrios/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Gestionar barrios" })).toBeInTheDocument();
    expect(within(dialog).getByRole("list", { name: "Barrios asignados" })).toHaveTextContent("Barrio Centro");

    const searchInput = within(dialog).getByLabelText("Buscar barrios");
    await user.type(searchInput, "Industrial");
    const industrialOption = within(dialog).getByLabelText(/Barrio Industrial/i);
    await user.click(industrialOption);
    await user.click(within(dialog).getByRole("button", { name: "Asignar seleccionados" }));

    await waitFor(() => {
      expect(within(dialog).getByText("Barrios asignados correctamente.")).toBeInTheDocument();
      expect(within(dialog).getByRole("list", { name: "Barrios asignados" })).toHaveTextContent("Barrio Industrial");
    });

    await user.click(within(dialog).getByRole("button", { name: "Quitar Barrio Industrial" }));
    await waitFor(() => {
      expect(within(dialog).getByText("Barrio quitado de la zona.")).toBeInTheDocument();
    });
  });

  it("renders a read-only presentation without mutation actions for Field actors", async () => {
    render(<ZoneCatalogPanel scenario={scenarios.fieldCrewMember} />);

    await waitFor(() => {
      expect(screen.getByText("Z-BEL")).toBeInTheDocument();
    });

    // "Nueva zona" should not exist
    expect(screen.queryByRole("button", { name: /nueva zona/i })).not.toBeInTheDocument();

    // Table rows should show "Solo lectura" instead of action buttons
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Solo lectura").length).toBeGreaterThan(0);
  });
});
