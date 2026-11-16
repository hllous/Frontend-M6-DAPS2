// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTableResizeHandle } from "./data-table-resize-handle";

type Props = React.ComponentProps<typeof DataTableResizeHandle<"zone">>;

function setup(props: Partial<Props> = {}) {
  const onResize = vi.fn();
  render(
    <div data-testid="scroller">
      <table data-testid="table">
        <thead>
          <tr>
            <th>
              <DataTableResizeHandle
                columnKey="zone"
                label="Zona"
                width={200}
                minimumWidth={80}
                maximumWidth={400}
                dense={false}
                onResize={onResize}
                {...props}
              />
            </th>
          </tr>
        </thead>
      </table>
    </div>,
  );
  return { onResize, handle: screen.getByRole("slider", { name: "Ancho de columna Zona" }) };
}

describe("DataTableResizeHandle", () => {
  it("exposes the width range and current value as a slider", () => {
    const { handle } = setup();

    expect(handle).toHaveAttribute("aria-valuemin", "80");
    expect(handle).toHaveAttribute("aria-valuemax", "400");
    expect(handle).toHaveAttribute("aria-valuenow", "200");
    expect(handle).toHaveAttribute("aria-valuetext", "200 px");
    expect(handle).toHaveAttribute("data-column-resize-edge", "zone");
  });

  it("adjusts the width by 10 px with the arrow keys and ignores other keys", () => {
    const { handle, onResize } = setup();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "Enter" });

    expect(onResize.mock.calls).toEqual([["zone", 210], ["zone", 210], ["zone", 190], ["zone", 190]]);
  });

  it("uses a larger touch target in dense mode", () => {
    const { handle } = setup({ dense: true });

    expect(handle).toHaveStyle({ width: "44px", minHeight: "48px" });
  });

  it("resizes by the horizontal drag distance while the pointer is pressed and marks the table as resizing", () => {
    const { handle, onResize } = setup();
    const table = screen.getByTestId("table");

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100 });
    expect(table.dataset.columnResizing).toBe("true");
    expect(table.style.getPropertyValue("--column-resize-width-floor")).toMatch(/px$/);
    expect(screen.getByTestId("scroller").style.getPropertyValue("overflow-anchor")).toBe("none");

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 130 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 60 });

    expect(onResize.mock.calls).toEqual([["zone", 230], ["zone", 160]]);
  });

  it("ignores moves from another pointer and moves after the drag ended", () => {
    const { handle, onResize } = setup();

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500 });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 500 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500 });

    expect(onResize).not.toHaveBeenCalled();
  });

  it("restores the table and scroller state when the drag ends or is cancelled", () => {
    const { handle } = setup();
    const table = screen.getByTestId("table");
    const scroller = screen.getByTestId("scroller");

    fireEvent.pointerDown(handle, { pointerId: 3, clientX: 10 });
    fireEvent.pointerUp(handle, { pointerId: 3 });
    expect(table.dataset.columnResizing).toBeUndefined();
    expect(table.style.getPropertyValue("--column-resize-width-floor")).toBe("");
    expect(scroller.style.getPropertyValue("overflow-anchor")).toBe("");

    fireEvent.pointerDown(handle, { pointerId: 4, clientX: 10 });
    fireEvent.pointerCancel(handle, { pointerId: 4 });
    expect(table.dataset.columnResizing).toBeUndefined();
  });

  it("restores a previous overflow-anchor value on the scroller after the drag", () => {
    const { handle } = setup();
    const scroller = screen.getByTestId("scroller");
    scroller.style.setProperty("overflow-anchor", "auto");

    fireEvent.pointerDown(handle, { pointerId: 5, clientX: 10 });
    expect(scroller.style.getPropertyValue("overflow-anchor")).toBe("none");
    fireEvent.pointerUp(handle, { pointerId: 5 });

    expect(scroller.style.getPropertyValue("overflow-anchor")).toBe("auto");
  });

  it("captures the pointer on press and releases it at the end of a drag when supported", () => {
    const { handle } = setup();
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { pointerId: 6, clientX: 10 });
    fireEvent.pointerUp(handle, { pointerId: 6 });

    expect(handle.setPointerCapture).toHaveBeenCalledWith(6);
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(6);
  });

  it("does nothing on pointer down when it is not inside a table", () => {
    const onResize = vi.fn();
    render(
      <DataTableResizeHandle columnKey="zone" label="Suelta" width={100} minimumWidth={50} maximumWidth={200} dense={false} onResize={onResize} />,
    );
    const handle = screen.getByRole("slider", { name: "Ancho de columna Suelta" });

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 50 });

    expect(onResize).not.toHaveBeenCalled();
  });
});
