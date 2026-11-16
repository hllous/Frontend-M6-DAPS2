import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { serviceFixtures } from "@/lib/services-fixtures";

import { useServicesColumnPreferences } from "./services-column-editor";
import { ServicesTable, type ColumnFilters } from "./services-table";

const emptyFilters: ColumnFilters = { zones: new Set(), serviceTypes: new Set(), statuses: new Set(), crews: new Set(), timeFrom: "", timeTo: "", late: false };
const services = serviceFixtures.slice(0, 3);

function Harness({ onFilters = () => undefined, dense = false }: { onFilters?: (filters: ColumnFilters) => void; dense?: boolean }) {
  const columnPreferences = useServicesColumnPreferences({ userId: "u1", variant: "1", data: services });
  return (
    <ServicesTable
      services={services}
      selectedId={null}
      onSelect={() => undefined}
      sortKey={null}
      sortDir="asc"
      onSortChange={() => undefined}
      columnFilters={emptyFilters}
      onColumnFiltersChange={onFilters}
      dense={dense}
      columnPreferences={columnPreferences}
    />
  );
}

// jsdom no calcula layout: cada encabezado de datos ocupa 100 px, en orden de aparición.
function stubHeaderLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const headers = Array.from(document.querySelectorAll("thead th[data-column-key]"));
    const index = headers.indexOf(this);
    const left = index < 0 ? 0 : index * 100;
    return { left, right: left + 100, top: 0, bottom: 30, width: 100, height: 30, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

function headerOrder() {
  return Array.from(document.querySelectorAll("thead th[data-column-key]"))
    .map((header) => header.getAttribute("data-column-key"))
    .filter((key) => key !== "ordinal");
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ServicesTable: reordenar columnas", () => {
  it("arrastra un encabezado a la derecha y persiste el nuevo orden", async () => {
    stubHeaderLayout();
    render(<Harness />);
    await waitFor(() => expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]));

    const status = screen.getByRole("columnheader", { name: "Estado" });
    fireEvent.pointerDown(status, { button: 0, pointerId: 1, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 252, clientY: 10 });
    expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]);
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 380, clientY: 10 });
    await waitFor(() => expect(headerOrder().indexOf("status")).toBeGreaterThan(1));
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 380, clientY: 10 });

    await waitFor(() => expect(screen.getByText(/Estado, posición \d de 5\./)).toBeInTheDocument());
    expect(headerOrder().indexOf("status")).toBeGreaterThan(1);
  });

  it("arrastra de vuelta al lugar original sin cambiar el orden", async () => {
    stubHeaderLayout();
    render(<Harness />);
    await waitFor(() => expect(headerOrder()).toHaveLength(5));

    const zone = screen.getByRole("columnheader", { name: "Zona" });
    fireEvent.pointerDown(zone, { button: 0, pointerId: 2, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 40, clientY: 10 });
    await waitFor(() => expect(headerOrder()[0]).toBe("zone"));
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 300, clientY: 10 });
    await waitFor(() => expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]));
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 300, clientY: 10 });

    expect(screen.queryByText(/Zona, posición/)).toBeNull();
    expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]);
  });

  it("cancelar el arrastre descarta la vista previa", async () => {
    stubHeaderLayout();
    render(<Harness />);
    await waitFor(() => expect(headerOrder()).toHaveLength(5));

    const crew = screen.getByRole("columnheader", { name: "Equipo" });
    fireEvent.pointerDown(crew, { button: 0, pointerId: 3, clientX: 350, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 3, clientX: 20, clientY: 10 });
    await waitFor(() => expect(headerOrder()[0]).toBe("crew"));
    fireEvent.pointerCancel(window, { pointerId: 3 });

    await waitFor(() => expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]));
    expect(screen.queryByText(/Equipo, posición/)).toBeNull();
  });

  it("ignora el puntero de otro dedo, el botón secundario y el deslizador de ancho", async () => {
    stubHeaderLayout();
    render(<Harness />);
    await waitFor(() => expect(headerOrder()).toHaveLength(5));

    const zone = screen.getByRole("columnheader", { name: "Zona" });
    fireEvent.pointerDown(zone, { button: 2, pointerId: 4, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 4, clientX: 20, clientY: 10 });
    expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]);

    fireEvent.pointerDown(zone, { button: 0, pointerId: 5, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 99, clientX: 20, clientY: 10 });
    fireEvent.pointerUp(window, { pointerId: 99, clientX: 20, clientY: 10 });
    expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]);
    fireEvent.pointerUp(window, { pointerId: 5, clientX: 250, clientY: 10 });
  });

  it("reordena con Alt+Flecha y anuncia la posición; sin Alt no hace nada", async () => {
    render(<Harness />);
    await waitFor(() => expect(headerOrder()).toHaveLength(5));

    const status = screen.getByRole("columnheader", { name: "Estado" });
    status.focus();
    fireEvent.keyDown(status, { key: "ArrowRight" });
    expect(headerOrder()).toEqual(["service", "status", "zone", "crew", "scheduled"]);

    fireEvent.keyDown(status, { key: "ArrowRight", altKey: true });
    await waitFor(() => expect(headerOrder()).toEqual(["service", "zone", "status", "crew", "scheduled"]));
    expect(screen.getByText("Estado, posición 3 de 5.")).toBeInTheDocument();

    const service = screen.getByRole("columnheader", { name: "Servicio" });
    fireEvent.keyDown(service, { key: "ArrowLeft", altKey: true });
    expect(headerOrder()[0]).toBe("service");
  });

  it("filtra por horario desde la columna Fecha", async () => {
    const onFilters = vi.fn();
    render(<Harness onFilters={onFilters} />);
    await waitFor(() => expect(headerOrder()).toHaveLength(5));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /horario/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Desde")).toBeVisible();
    expect(within(dialog).getByText("Hasta")).toBeVisible();
  });
});
