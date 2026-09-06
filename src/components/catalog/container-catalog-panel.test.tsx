import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ContainerCatalogPanel } from "./container-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("ContainerCatalogPanel", () => {
  it("lists Containers and filters them by status, type, zone, and search", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Contenedores" })).toBeVisible();
    expect(screen.getByText("CONT-001")).toBeVisible();

    // Filter by type
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor"), "RECYCLABLE");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();

    // Filter by status
    await user.selectOptions(screen.getByLabelText("Estado"), "OVERFLOWED");
    expect(await screen.findByText("CONT-002")).toBeVisible();

    // Filter by zone
    await user.selectOptions(screen.getByLabelText("Zona"), "zone-2");
    expect(screen.getByText("CONT-002")).toBeVisible();

    // Reset filters
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor"), "all");
    await user.selectOptions(screen.getByLabelText("Estado"), "all");
    await user.selectOptions(screen.getByLabelText("Zona"), "all");

    // Search filter
    await user.type(screen.getByLabelText("Buscar contenedor"), "Santa Fe");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();
  });

  it("allows any actor to view Container detail including damage information", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-003/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Detalle del contenedor CONT-003/ })).toBeVisible();
    expect(within(dialog).getByText("Dañado")).toBeVisible();
    expect(within(dialog).getByText("Tapa rota")).toBeVisible();
    expect(within(dialog).getByText("Media")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar detalle" }));
    expect(dialog).not.toBeVisible();
  });

  it("allows Office to create and edit a Container", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByText("CONT-001");
    await user.click(screen.getByRole("button", { name: "Registrar contenedor" }));

    const createDialog = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Código"), "CONT-PANEL-01");
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor en el formulario"), "RECYCLABLE");
    await user.selectOptions(screen.getByLabelText("Zona en el formulario"), "zone-2");
    await user.type(screen.getByLabelText("Capacidad (litros)"), "1500");
    await user.type(screen.getByLabelText("Dirección"), "Av. Paseo Colón 850");
    await user.type(screen.getByLabelText("Latitud"), "-34.618");
    await user.type(screen.getByLabelText("Longitud"), "-58.369");

    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor registrado con éxito.")).toBeVisible();
    expect(createDialog).not.toBeVisible();
    expect(await screen.findByText("CONT-PANEL-01")).toBeVisible();

    // Edit container
    const createdRow = screen.getByRole("row", { name: /CONT-PANEL-01/ });
    await user.click(within(createdRow).getByRole("button", { name: "Editar" }));

    const editDialog = screen.getByRole("dialog");
    expect(within(editDialog).getByLabelText("Código")).toBeDisabled();
    expect(within(editDialog).getByLabelText("Tipo de contenedor en el formulario")).toBeDisabled();

    await user.clear(screen.getByLabelText("Dirección"));
    await user.type(screen.getByLabelText("Dirección"), "Av. Paseo Colón 900");
    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor actualizado con éxito.")).toBeVisible();
    expect(editDialog).not.toBeVisible();
    expect(screen.getByText("Av. Paseo Colón 900")).toBeVisible();
  });

  it("keeps management controls hidden for Field actors", async () => {
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar contenedor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    // Detail button remains accessible to Field
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
  });

  it("renders a retryable error state on load failure", async () => {
    server.use(
      http.get("*/api/containers", () =>
        HttpResponse.json(
          {
            statusCode: 500,
            message: "Fallo en el servidor de inventario.",
            error: "Internal Server Error",
            timestamp: new Date().toISOString(),
            path: "/api/containers",
          },
          { status: 500 },
        ),
      ),
    );

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("Fallo en el servidor de inventario.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
  });
});
