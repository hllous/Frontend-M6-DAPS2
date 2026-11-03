import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTable, useDataTable, type DataTableColumn } from "./data-table";

type Item = { name: string; count: number };
const data: Item[] = [
  { name: "Zona Sur", count: 2 },
  { name: "Centro", count: 1 },
];
const columns: DataTableColumn<Item>[] = [
  { id: "name", accessorKey: "name", header: "Zona" },
  { id: "count", accessorKey: "count", header: "Cantidad" },
];

function Example() {
  const table = useDataTable({ data, columns });
  return <DataTable table={table} aria-label="Zonas" />;
}

function Editable({ persistenceKey }: { persistenceKey?: string }) {
  const table = useDataTable({
    data,
    columns,
    enableHiding: true,
    persistenceKey,
  });
  return (
    <>
      <button onClick={() => table.getColumn("count")?.toggleVisibility()}>
        Cantidad visible
      </button>
      <button onClick={() => table.setColumnOrder(["count", "name"])}>
        Cantidad primero
      </button>
      <DataTable table={table} aria-label="Zonas" />
    </>
  );
}

describe("DataTable", () => {
  it("hides decorative body cells from the accessibility tree", () => {
    function DecorativeExample() {
      const table = useDataTable({
        data,
        columns: [
          ...columns,
          {
            id: "detail",
            header: "Detalle",
            enableSorting: false,
            meta: { ariaHidden: true },
            cell: () => "→",
          },
        ],
      });
      return <DataTable table={table} />;
    }
    render(<DecorativeExample />);
    expect(
      screen.getByRole("columnheader", { name: "Detalle" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("cell")).toHaveLength(4);
    expect(screen.getAllByText("→")[0].closest("td")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("sorts with click and keyboard and announces the current direction", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const sort = screen.getByRole("button", {
      name: "Ordenar por Zona, actualmente sin ordenar",
    });
    await user.click(sort);
    expect(screen.getByRole("columnheader", { name: /Zona/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(
      within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0],
    ).toHaveTextContent("Centro");
    await user.keyboard("{Enter}");
    expect(sort).toHaveAccessibleName(
      "Ordenar por Zona, actualmente descendente",
    );
    expect(
      within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0],
    ).toHaveTextContent("Zona Sur");
    await user.keyboard(" ");
    expect(sort).toHaveAccessibleName(
      "Ordenar por Zona, actualmente sin ordenar",
    );
  });

  it("keeps visibility, order and sorting through a persistence round trip", async () => {
    const user = userEvent.setup();
    const first = render(<Editable persistenceKey="test:zones" />);
    await user.click(screen.getByRole("button", { name: "Cantidad primero" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent(
      "Cantidad",
    );
    await user.click(screen.getByRole("button", { name: /Ordenar por Zona/ }));
    await user.click(screen.getByRole("button", { name: "Cantidad visible" }));
    expect(
      screen.queryByRole("columnheader", { name: /Cantidad/ }),
    ).not.toBeInTheDocument();
    first.unmount();
    render(<Editable persistenceKey="test:zones" />);
    expect(
      screen.queryByRole("columnheader", { name: /Cantidad/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ordenar por Zona/ }),
    ).toHaveAccessibleName("Ordenar por Zona, actualmente ascendente");
    await user.click(screen.getByRole("button", { name: "Cantidad visible" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent(
      "Cantidad",
    );
    localStorage.removeItem("test:zones");
  });

  it("shows the supplied empty state", () => {
    function EmptyExample() {
      const table = useDataTable({ data: [], columns });
      return (
        <DataTable table={table} emptyState="No hay zonas para mostrar." />
      );
    }
    render(<EmptyExample />);
    expect(
      screen.getByRole("cell", { name: "No hay zonas para mostrar." }),
    ).toHaveAttribute("colspan", "2");
  });

  it("isolates preferences when switching to another table key", async () => {
    const user = userEvent.setup();
    const view = render(<Editable persistenceKey="test:first" />);
    await user.click(screen.getByRole("button", { name: "Cantidad visible" }));
    view.rerender(<Editable persistenceKey="test:second" />);
    expect(
      screen.getByRole("columnheader", { name: /Cantidad/ }),
    ).toBeInTheDocument();
    view.rerender(<Editable persistenceKey="test:first" />);
    expect(
      screen.queryByRole("columnheader", { name: /Cantidad/ }),
    ).not.toBeInTheDocument();
    localStorage.removeItem("test:first");
    localStorage.removeItem("test:second");
  });

  it("runs the caller's row action for the chosen record", async () => {
    const select = vi.fn();
    const actionColumns: DataTableColumn<Item>[] = [
      ...columns,
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => (
          <button onClick={() => select(row.original.name)}>
            Ver {row.original.name}
          </button>
        ),
      },
    ];
    function Actions() {
      const table = useDataTable({ data, columns: actionColumns });
      return <DataTable table={table} />;
    }
    render(<Actions />);
    await userEvent.click(screen.getByRole("button", { name: "Ver Centro" }));
    expect(select).toHaveBeenCalledExactlyOnceWith("Centro");
  });

  it("keeps resizing opt-in and supports keyboard size adjustments within bounds", async () => {
    const user = userEvent.setup();
    const sizedColumns: DataTableColumn<Item>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Zona",
        size: 150,
        minSize: 140,
        maxSize: 160,
      },
    ];
    function Sized() {
      const table = useDataTable({
        data,
        columns: sizedColumns,
        enableColumnResizing: true,
      });
      return <DataTable table={table} />;
    }
    const plain = render(<Example />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    plain.unmount();
    render(<Sized />);
    const resize = screen.getByRole("slider", {
      name: "Ancho de columna Zona",
    });
    resize.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(resize).toHaveAttribute("aria-valuenow", "160");
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(resize).toHaveAttribute("aria-valuenow", "140");
    expect(screen.getByRole("columnheader")).toHaveStyle({ width: "140px" });
  });

  it("sorts numeric values numerically and leaves the input rows intact", async () => {
    const rows: Item[] = [
      { name: "Diez", count: 10 },
      { name: "Dos", count: 2 },
    ];
    function Numbers() {
      const table = useDataTable({ data: rows, columns });
      return <DataTable table={table} />;
    }
    render(<Numbers />);
    await userEvent.click(
      screen.getByRole("button", { name: /Ordenar por Cantidad/ }),
    );
    expect(
      within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0],
    ).toHaveTextContent("Dos");
    expect(rows[0].name).toBe("Diez");
  });

  it("omits aria-sort on columns that cannot sort", () => {
    function Plain() {
      const table = useDataTable({
        data,
        columns: [
          {
            id: "name",
            accessorKey: "name",
            header: "Zona",
            enableSorting: false,
          },
          { id: "count", accessorKey: "count", header: "Cantidad" },
        ] satisfies DataTableColumn<Item>[],
      });
      return <DataTable table={table} aria-label="Zonas" />;
    }
    render(<Plain />);
    expect(
      screen.getByRole("columnheader", { name: "Zona" }),
    ).not.toHaveAttribute("aria-sort");
    expect(
      screen.getByRole("columnheader", { name: /Cantidad/ }),
    ).toHaveAttribute("aria-sort", "none");
  });

  it("keeps a function header on sortable columns and names the sort button with meta.label", () => {
    function Custom() {
      const table = useDataTable({
        data,
        columns: [
          {
            id: "name",
            accessorKey: "name",
            header: () => <em>Zona operativa</em>,
            meta: { label: "Zona", cellClassName: "x", rowHeader: true },
          },
        ] satisfies DataTableColumn<Item>[],
      });
      return <DataTable table={table} aria-label="Zonas" />;
    }
    render(<Custom />);
    const sort = screen.getByRole("button", {
      name: "Ordenar por Zona, actualmente sin ordenar",
    });
    expect(within(sort).getByText("Zona operativa")).toBeInTheDocument();
    expect(screen.getAllByRole("rowheader")[0]).toHaveAttribute(
      "data-label",
      "Zona",
    );
  });
});
