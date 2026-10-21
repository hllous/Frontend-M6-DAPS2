import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardSkeleton, DetailPaneSkeleton, ListItemsSkeleton, MapPaneSkeleton, TableRowsSkeleton } from "./loading-skeletons";

describe("shared loading skeletons", () => {
  it("preserves table header, body, row and column structure", () => {
    const { container } = render(<TableRowsSkeleton rowCount={3} rowHeight="h-16" columnWidths={["w-10", "w-2/5"]} columnLabels={["Código", "Nombre"]} />);
    expect(container.querySelectorAll("thead th")).toHaveLength(2);
    const rows = container.querySelectorAll('tbody [data-slot="table-row-skeleton"]');
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.querySelectorAll("td")).toHaveLength(2);
    expect(rows[0]).toHaveClass("h-16");
    expect(rows[0].querySelector("td")).toHaveAttribute("data-label", "Código");
    const shapes = rows[0].querySelectorAll('[data-slot="skeleton"]');
    expect(shapes[0]).toHaveClass("w-10");
    expect(shapes[1]).toHaveClass("w-2/5");
  });

  it("keeps catalog action buttons in a dedicated cell", () => {
    const { container } = render(<TableRowsSkeleton rowCount={2} columnWidths={["w-16", "w-40", "w-28", "w-20", "w-8", "w-12", "w-44"]} actionColumn actionsClassName="catalog-actions" />);
    expect(container.querySelectorAll("thead th")).toHaveLength(7);
    for (const row of container.querySelectorAll("tbody tr")) {
      expect(row.querySelectorAll("td")).toHaveLength(7);
      expect(row.lastElementChild).toHaveClass("catalog-actions");
      expect(row.lastElementChild?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    }
  });

  it("uses the Card shell with distinct header and content sections", () => {
    const { container } = render(<CardSkeleton titleClassName="h-6 w-1/2" lineWidths={["w-full", "w-1/3"]} />);
    expect(container.querySelector('[data-skeleton="card"]')).toHaveAttribute("data-size", "default");
    expect(container.querySelector('[data-slot="card-header"] [data-slot="skeleton"]')).toHaveClass("h-6", "w-1/2");
    const lines = container.querySelectorAll('[data-slot="card-content"] [data-slot="skeleton"]');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toHaveClass("w-1/3");
    expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
  });

  it("mirrors the service detail action bar, heading, metadata, territory and desktop context", () => {
    const { container } = render(<DetailPaneSkeleton fieldCount={3} fieldHeight="h-8" />);
    for (const section of ["actions", "heading", "territory", "context"]) expect(container.querySelector(`[data-slot="detail-${section}-skeleton"]`)).not.toBeNull();
    const fields = container.querySelectorAll('[data-slot="detail-field-skeleton"]');
    expect(fields).toHaveLength(3);
    expect(fields[0].parentElement).toHaveClass("sm:grid-cols-2", "lg:grid-cols-3");
    expect(fields[0].querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(fields[0].querySelectorAll('[data-slot="skeleton"]')[1]).toHaveClass("h-8", "w-3/4");
    expect(container.querySelector("aside")).toHaveClass("hidden", "w-72", "min-[761px]:flex");
  });

  it("reserves the map viewport with top-left zoom controls and bottom-right attribution", () => {
    const { container } = render(<MapPaneSkeleton height="h-64" />);
    expect(container.querySelector('[data-slot="map-pane-skeleton"]')).toHaveClass("h-64");
    const zoom = container.querySelector('[data-slot="map-zoom-skeleton"]');
    expect(zoom).toHaveClass("left-2.5", "top-2.5");
    expect(zoom?.children).toHaveLength(2);
    expect(container.querySelector('[data-slot="map-attribution-skeleton"]')).toHaveClass("bottom-0", "right-0");
  });

  it("uses Item media and content sections without invented trailing controls", () => {
    const { container } = render(<ListItemsSkeleton itemCount={3} itemHeight="h-16" avatarSize="size-12" primaryWidth="w-1/2" />);
    const items = container.querySelectorAll('[data-skeleton="list-item"]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass("h-16");
    expect(items[0].querySelector('[data-slot="item-media"] [data-slot="skeleton"]')).toHaveClass("size-12");
    const content = items[0].querySelector('[data-slot="item-content"]');
    expect(content?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    expect(content?.firstElementChild).toHaveClass("w-1/2");
    expect(items[0].children).toHaveLength(2);
  });
});
