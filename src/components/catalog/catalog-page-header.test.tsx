import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { CatalogPageHeader } from "./catalog-page-header";

describe("CatalogPageHeader", () => {
  it("renders a breadcrumb back to the catalog, the page title and its actions", () => {
    render(
      <CatalogPageHeader
        title="Vehículos"
        titleId="vehicles-title"
        description="Registre los vehículos."
        actions={<button type="button">Registrar vehículo</button>}
      />,
    );

    const breadcrumb = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(within(breadcrumb).getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "/app?destination=catalog");
    expect(within(breadcrumb).getByText("Vehículos")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "Vehículos" })).toHaveAttribute("id", "vehicles-title");
    expect(screen.getByText("Registre los vehículos.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Registrar vehículo" })).toBeVisible();
  });

  it("omits the description and the actions slot when they are not provided", () => {
    render(<CatalogPageHeader title="Recorridos" />);

    expect(screen.getByRole("heading", { level: 1, name: "Recorridos" })).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
