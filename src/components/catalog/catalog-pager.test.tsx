import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CatalogPager } from "./catalog-pager";

describe("CatalogPager", () => {
  it("names the navigation, announces the page and requests the next page", async () => {
    const onPageChange = vi.fn();
    render(<CatalogPager page={1} pageSize={20} total={57} totalPages={3} onPageChange={onPageChange} label="Paginación de vehículos" />);
    expect(screen.getByRole("navigation", { name: "Paginación de vehículos" })).toBeVisible();
    expect(screen.getByText("Mostrando 1–20 de 57")).toBeVisible();
    expect(screen.getByText("Página 1 de 3")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows the final partial range and allows returning to the previous page", async () => {
    const onPageChange = vi.fn();
    render(<CatalogPager page={3} pageSize={20} total={57} totalPages={3} onPageChange={onPageChange} label="Paginación de vehículos" />);
    expect(screen.getByText("Mostrando 41–57 de 57")).toBeVisible();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows only the count for one page", () => {
    render(<CatalogPager page={1} pageSize={20} total={7} totalPages={1} onPageChange={vi.fn()} label="Paginación de vehículos" />);
    expect(screen.getByText("Mostrando 1–7 de 7")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
  });

  it("renders nothing for an empty catalog", () => {
    const { container } = render(<CatalogPager page={1} pageSize={20} total={0} totalPages={0} onPageChange={vi.fn()} label="Paginación de vehículos" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces an empty result when asked to, instead of disappearing silently", () => {
    render(<CatalogPager page={1} pageSize={20} total={0} totalPages={0} onPageChange={vi.fn()} label="Paginación de servicios" announceEmpty="Sin servicios." />);
    expect(screen.getByRole("status")).toHaveTextContent("Sin servicios.");
  });
});
