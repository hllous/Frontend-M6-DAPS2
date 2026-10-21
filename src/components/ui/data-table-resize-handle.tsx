"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "./button";

export function DataTableResizeHandle<K extends string>({
  columnKey,
  label,
  width,
  minimumWidth,
  maximumWidth,
  dense,
  onResize,
}: {
  columnKey: K;
  label: string;
  width: number;
  minimumWidth: number;
  maximumWidth: number;
  dense: boolean;
  onResize: (key: K, width: number) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    scroller: HTMLElement | null;
    previousOverflowAnchor: string;
  } | null>(null);

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const table = event.currentTarget.closest<HTMLTableElement>("table");
    if (!table) return;
    const scroller = table.parentElement;
    const previousOverflowAnchor =
      scroller?.style.getPropertyValue("overflow-anchor") ?? "";
    if (scroller) {
      const tableWidth = table.getBoundingClientRect().width;
      const visibleWidth = scroller.scrollLeft + scroller.clientWidth;
      table.style.setProperty(
        "--column-resize-width-floor",
        `${Math.max(tableWidth, visibleWidth)}px`,
      );
      scroller.style.setProperty("overflow-anchor", "none");
    }
    table.dataset.columnResizing = "true";
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      scroller,
      previousOverflowAnchor,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function resize(event: ReactPointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    onResize(
      columnKey,
      activeDrag.startWidth + event.clientX - activeDrag.startX,
    );
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (activeDrag.scroller) {
      if (activeDrag.previousOverflowAnchor) {
        activeDrag.scroller.style.setProperty(
          "overflow-anchor",
          activeDrag.previousOverflowAnchor,
        );
      } else {
        activeDrag.scroller.style.removeProperty("overflow-anchor");
      }
    }
    const table = event.currentTarget.closest<HTMLTableElement>("table");
    if (table) {
      delete table.dataset.columnResizing;
      table.style.removeProperty("--column-resize-width-floor");
    }
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      role="slider"
      aria-label={`Ancho de columna ${label}`}
      aria-orientation="vertical"
      aria-valuemin={minimumWidth}
      aria-valuemax={maximumWidth}
      aria-valuenow={width}
      aria-valuetext={`${width} px`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      title="Arrastre para cambiar el ancho; use las flechas para ajustar"
      onPointerDown={startResize}
      onPointerMove={resize}
      onPointerUp={finishResize}
      onPointerCancel={finishResize}
      onKeyDown={(event) => {
        const delta =
          event.key === "ArrowRight" || event.key === "ArrowUp"
            ? 10
            : event.key === "ArrowLeft" || event.key === "ArrowDown"
              ? -10
              : 0;
        if (delta === 0) return;
        event.preventDefault();
        event.stopPropagation();
        onResize(columnKey, width + delta);
      }}
      data-column-resize-edge={columnKey}
      style={{
        minHeight: dense ? 48 : 0,
        minWidth: 0,
        width: dense ? 44 : 24,
        right: 0,
      }}
      className="absolute right-0 top-0 h-full min-h-0 min-w-0 w-6 touch-none cursor-col-resize rounded-none px-0 text-[var(--color-text-secondary)] hover:text-[var(--color-action)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 h-5 w-px translate-x-1/2 -translate-y-1/2 bg-current opacity-60"
      />
    </Button>
  );
}
