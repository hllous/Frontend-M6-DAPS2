import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardSkeleton, DetailPaneSkeleton, ListItemsSkeleton, MapPaneSkeleton, TableRowsSkeleton } from "./loading-skeletons";

describe("shared loading skeletons", () => {
  it("renders the requested table row count and column sizes", () => {
    const { container } = render(
      <TableRowsSkeleton rowCount={3} rowHeight="h-16" columnWidths={["w-10", "w-2/5"]} />,
    );

    const rows = container.querySelectorAll('[data-slot="table-row-skeleton"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveClass("h-16");

    const columns = rows[0].querySelectorAll('[data-slot="skeleton"]');
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveClass("w-10");
    expect(columns[1]).toHaveClass("w-2/5");
  });

  it("renders a compact card with the requested title and line widths", () => {
    const { container } = render(
      <CardSkeleton titleClassName="h-6 w-1/2" lineWidths={["w-full", "w-1/3"]} />,
    );

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons[0]).toHaveClass("h-6", "w-1/2");
    expect(skeletons[1]).toHaveClass("h-4", "w-full");
    expect(skeletons[2]).toHaveClass("h-4", "w-1/3");
  });

  it("renders the requested detail field count and value height", () => {
    const { container } = render(<DetailPaneSkeleton fieldCount={3} fieldHeight="h-8" />);

    const root = container.querySelector('[data-slot="detail-pane-skeleton"]');
    const fields = root?.querySelectorAll('[data-slot="detail-field-skeleton"]');
    expect(fields).toHaveLength(3);
    expect(fields?.[0].querySelectorAll('[data-slot="skeleton"]')[1]).toHaveClass("h-8", "w-full");
  });

  it("fits a map placeholder to the requested height", () => {
    const { container } = render(<MapPaneSkeleton height="h-64" />);

    const map = container.querySelector('[data-slot="map-pane-skeleton"]');
    expect(map).toHaveClass("h-64");
    expect(map?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5);
  });

  it("renders the requested list item count and avatar size", () => {
    const { container } = render(
      <ListItemsSkeleton itemCount={3} itemHeight="h-16" avatarSize="size-12" primaryWidth="w-1/2" />,
    );

    const items = container.querySelectorAll('[data-slot="list-item-skeleton"]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass("h-16");
    const shapes = items[0].querySelectorAll('[data-slot="skeleton"]');
    expect(shapes[0]).toHaveClass("size-12");
    expect(shapes[1]).toHaveClass("w-1/2");
  });
});
