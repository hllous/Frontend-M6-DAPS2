"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { servicesMobileBreakpoint } from "@/lib/services-layout";
import { cn } from "@/lib/utils";

import styles from "./inventory-map-drawer.module.css";

type InventoryMapDrawerProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  summary: string;
};

type DragStart = {
  expanded: boolean;
  pointerId: number;
  y: number;
};

const HANDLE_HEIGHT = 80;
const DRAG_THRESHOLD = 6;

export function InventoryMapDrawer({
  ariaLabel,
  children,
  className,
  expanded: controlledExpanded,
  onExpandedChange,
  summary,
}: InventoryMapDrawerProps) {
  const contentId = useId();
  const summaryId = `${contentId}-summary`;
  const drawerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragStart | null>(null);
  const draggedRef = useRef(false);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded ?? localExpanded;
  const [isCompact, setIsCompact] = useState(false);
  const contentHidden = isCompact && !expanded;
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function updateExpanded(nextExpanded: boolean) {
    if (controlledExpanded === undefined) setLocalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  useEffect(() => {
    const updateViewport = () => setIsCompact(window.innerWidth <= servicesMobileBreakpoint());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  function handleFocusCapture(event: FocusEvent<HTMLElement>) {
    if (!(event.target instanceof HTMLElement) || event.target.dataset.inventoryMapDrawerHandle !== "true") {
      updateExpanded(true);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = { expanded, pointerId: event.pointerId, y: event.clientY };
    draggedRef.current = false;
    setIsDragging(true);
    setDragDelta(0);
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextDelta = event.clientY - drag.y;
    if (Math.abs(nextDelta) > DRAG_THRESHOLD) draggedRef.current = true;
    setDragDelta(nextDelta);
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientY - drag.y;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      draggedRef.current = true;
      const drawerHeight = drawerRef.current?.getBoundingClientRect().height ?? HANDLE_HEIGHT;
      const closedOffset = Math.max(0, drawerHeight - HANDLE_HEIGHT);
      const startOffset = drag.expanded ? 0 : closedOffset;
      const finalOffset = Math.max(0, Math.min(closedOffset, startOffset + delta));
      updateExpanded(finalOffset < closedOffset / 2);
    }

    if (event.type === "pointercancel") draggedRef.current = false;
    dragRef.current = null;
    setIsDragging(false);
    setDragDelta(0);
  }

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    updateExpanded(!expanded);
  }

  return (
    <aside
      ref={drawerRef}
      className={cn(styles.drawer, className)}
      aria-label={ariaLabel}
      data-compact={isCompact}
      data-expanded={expanded}
      data-dragging={isDragging}
      style={{ "--drawer-drag-offset": `${dragDelta}px` } as CSSProperties}
      onFocusCapture={handleFocusCapture}
    >
      <Button
        className={styles.handle}
        variant="ghost"
        size="lg"
        type="button"
        aria-label={expanded ? "Ocultar lista" : "Mostrar lista"}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-describedby={summary ? summaryId : undefined}
        data-inventory-map-drawer-handle="true"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span className={styles.grabber} aria-hidden="true" />
        {summary ? <span id={summaryId} className={styles.summary}>{summary}</span> : null}
      </Button>
      <div
        id={contentId}
        className={styles.content}
        aria-hidden={contentHidden || undefined}
        inert={contentHidden}
      >
        {children}
      </div>
    </aside>
  );
}
