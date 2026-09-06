import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetRouteFixtures, routeFixtures } from "@/lib/routes-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";
import { RouteCatalogPanel } from "./route-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRouteFixtures();
  resetZoneFixtures();
});
afterAll(() => server.close());

describe("RouteCatalogPanel component", () => {
  it("renders the routes catalog with heading, search input, filters and table for Office", async () => {
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("heading", { name: "Catálogo de Recorridos" })).toBeInTheDocument();
    expect(screen.getByTestId("create-route-button")).toBeVisible();
    expect(screen.getByTestId("search-routes-input")).toBeInTheDocument();
    expect(screen.getByTestId("active-filter-select")).toBeInTheDocument();
    expect(screen.getByTestId("zone-filter-select")).toBeInTheDocument();

    // Wait for fixtures to load
    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
      expect(screen.getByText("Recorrido Casco Histórico")).toBeInTheDocument();
      expect(screen.getByText("REC-002")).toBeInTheDocument();
    });
  });

  it("filters routes by search query", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Recorrido Casco Histórico")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("search-routes-input");
    await user.type(searchInput, "Costanera");

    await waitFor(() => {
      expect(screen.queryByText("Recorrido Casco Histórico")).not.toBeInTheDocument();
      expect(screen.getByText("Recorrido Costanera")).toBeInTheDocument();
    });
  });

  it("filters routes by active status", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-003")).toBeInTheDocument();
    });

    const activeFilter = screen.getByTestId("active-filter-select");
    await user.selectOptions(activeFilter, "true");

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
      expect(screen.getByText("REC-002")).toBeInTheDocument();
      // REC-003 is inactive, should be filtered out
      expect(screen.queryByText("REC-003")).not.toBeInTheDocument();
    });
  });

  it("filters routes by zoneId", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
      expect(screen.getByText("REC-002")).toBeInTheDocument();
    });

    const zoneFilter = screen.getByTestId("zone-filter-select");
    // Select zone-1: only REC-001 passes through zone-1
    await user.selectOptions(zoneFilter, "zone-1");

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
      expect(screen.queryByText("REC-002")).not.toBeInTheDocument();
      expect(screen.queryByText("REC-003")).not.toBeInTheDocument();
    });
  });

  it("allows Office to create a new route and verifies it lands on its detail view with empty stops and an obvious CTA", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });

    const createButton = screen.getByTestId("create-route-button");
    await user.click(createButton);

    expect(screen.getByRole("heading", { name: "Nuevo recorrido" })).toBeInTheDocument();

    const codeInput = screen.getByTestId("create-route-code-input");
    const nameInput = screen.getByTestId("create-route-name-input");

    await user.type(codeInput, "REC-099");
    await user.type(nameInput, "Recorrido Periférico Norte");

    const submitButton = screen.getByTestId("submit-create-route");
    await user.click(submitButton);

    // Acceptance Criteria #2:
    // Lands on its own detail view with an empty stops section and an obvious call-to-action
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Nuevo recorrido" })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const detailView = screen.getByTestId("route-detail-view");
      expect(detailView).toBeInTheDocument();
      expect(within(detailView).getByText("REC-099")).toBeInTheDocument();
      expect(within(detailView).getByText("Recorrido Periférico Norte")).toBeInTheDocument();
      expect(within(detailView).getByTestId("empty-stops-section")).toBeInTheDocument();
      const addStopsButton = within(detailView).getByTestId("add-stops-cta");
      expect(addStopsButton).toBeVisible();
      expect(addStopsButton).toHaveTextContent("Agregar paradas");
    });
  });

  it("displays conflict error when attempting to create a route with duplicate code", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("create-route-button"));

    await user.type(screen.getByTestId("create-route-code-input"), "REC-001");
    await user.type(screen.getByTestId("create-route-name-input"), "Nombre Duplicado");
    await user.click(screen.getByTestId("submit-create-route"));

    await waitFor(() => {
      expect(screen.getByTestId("create-route-error")).toHaveTextContent(
        "Ya existe un recorrido con el código REC-001.",
      );
    });
  });

  it("allows Office to edit a route and enforces that code is read-only / immutable", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });

    const editButton = screen.getByTestId("edit-route-route-1");
    await user.click(editButton);

    expect(screen.getByRole("heading", { name: "Editar recorrido" })).toBeInTheDocument();

    const codeInput = screen.getByTestId("edit-route-code-readonly");
    expect(codeInput).toHaveValue("REC-001");
    expect(codeInput).toHaveAttribute("readonly");
    expect(codeInput).toBeDisabled();

    const nameInput = screen.getByTestId("edit-route-name-input");
    await user.clear(nameInput);
    await user.type(nameInput, "Recorrido Casco Histórico Modificado");

    await user.click(screen.getByTestId("submit-edit-route"));

    await waitFor(() => {
      expect(screen.getByText("Recorrido Casco Histórico Modificado")).toBeInTheDocument();
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });
  });

  it("displays warning dialog when deactivating a route referenced by active ServiceFrequency", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });

    // Deactivate REC-001 (which has active ServiceFrequency in fixtures)
    const deactivateButton = screen.getByTestId("deactivate-route-route-1");
    await user.click(deactivateButton);

    // Acceptance Criteria #3:
    // Deactivating a Route referenced by an active ServiceFrequency is allowed but warns first
    await waitFor(() => {
      expect(screen.getByTestId("references-warning-dialog")).toBeInTheDocument();
      expect(screen.getByText(/Recolección Domiciliaria/i)).toBeInTheDocument();
      expect(screen.getByText(/Turno MAÑANA/i)).toBeInTheDocument();
      expect(screen.getByTestId("confirm-deactivate-button")).toBeInTheDocument();
    });

    // Confirm deactivation
    await user.click(screen.getByTestId("confirm-deactivate-button"));

    // Verify it is deactivated in fixtures and UI
    await waitFor(() => {
      const fixture = routeFixtures.find((r) => r.id === "route-1");
      expect(fixture?.active).toBe(false);
    });
  });

  it("renders in read-only mode for Field actor without management buttons", async () => {
    render(<RouteCatalogPanel scenario={scenarios.fieldCrewMember} />);

    await waitFor(() => {
      expect(screen.getByText("REC-001")).toBeInTheDocument();
    });

    // Field actors cannot create, edit, or deactivate
    expect(screen.queryByTestId("create-route-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-route-route-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("deactivate-route-route-1")).not.toBeInTheDocument();
    // But can view details
    expect(screen.getByTestId("view-route-route-1")).toBeInTheDocument();
  });
});
