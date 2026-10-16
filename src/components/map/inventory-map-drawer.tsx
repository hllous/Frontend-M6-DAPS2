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
  snapState?: InventoryMapDrawerSnapState;
  onSnapStateChange?: (snapState: InventoryMapDrawerSnapState) => void;
  summary: string;
};

export type InventoryMapDrawerSnapState = "peek" | "half" | "full";

type DragStart = {
  snapState: InventoryMapDrawerSnapState;
  pointerId: number;
  y: number;
};

const HANDLE_HEIGHT = 52;
const LEGACY_HANDLE_HEIGHT = 80;
const DRAG_THRESHOLD = 6;
const SNAP_STATES: InventoryMapDrawerSnapState[] = ["full", "half", "peek"];
const FOCUSABLE_ELEMENT_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function snapOffset(snapState: InventoryMapDrawerSnapState, height: number, handleHeight = HANDLE_HEIGHT) {
  if (snapState === "full") return 0;
  if (snapState === "half") return height * 0.5;
  return Math.max(0, height - handleHeight);
}

export function InventoryMapDrawer({
  ariaLabel,
  children,
  className,
  expanded: controlledExpanded,
  onExpandedChange,
  snapState: controlledSnapState,
  onSnapStateChange,
  summary,
}: InventoryMapDrawerProps) {
  const contentId = useId();
  const summaryId = `${contentId}-summary`;
  const drawerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragStart | null>(null);
  const draggedRef = useRef(false);
  const focusContentOnExpandRef = useRef(false);
  const [localSnapState, setLocalSnapState] = useState<InventoryMapDrawerSnapState>("peek");
  const [localExpanded, setLocalExpanded] = useState(false);
  const usesSnapPoints = controlledSnapState !== undefined || onSnapStateChange !== undefined;
  const expanded = usesSnapPoints
    ? (controlledSnapState ?? localSnapState) !== "peek"
    : controlledExpanded ?? localExpanded;
  const currentSnapState = usesSnapPoints
    ? controlledSnapState ?? localSnapState
    : expanded ? "full" : "peek";
  const [isCompact, setIsCompact] = useState(false);
  const contentHidden = isCompact && currentSnapState === "peek";
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function updateSnapState(nextSnapState: InventoryMapDrawerSnapState) {
    if (usesSnapPoints) {
      if (controlledSnapState === undefined) setLocalSnapState(nextSnapState);
      onSnapStateChange?.(nextSnapState);
      return;
    }

    const nextExpanded = nextSnapState !== "peek";
    if (controlledExpanded === undefined) setLocalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  function updateExpanded(nextExpanded: boolean) {
    updateSnapState(nextExpanded ? "full" : "peek");
  }

  useEffect(() => {
    const updateViewport = () => setIsCompact(window.innerWidth <= servicesMobileBreakpoint());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!expanded || !focusContentOnExpandRef.current) return;

    focusContentOnExpandRef.current = false;
    const content = document.getElementById(contentId);
    content?.querySelector<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR)?.focus();
  }, [contentId, expanded]);

  function handleFocusCapture(event: FocusEvent<HTMLElement>) {
    if (!(event.target instanceof HTMLElement) || event.target.dataset.inventoryMapDrawerHandle !== "true") {
      updateExpanded(true);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = { snapState: currentSnapState, pointerId: event.pointerId, y: event.clientY };
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
    if (event.type !== "pointercancel" && Math.abs(delta) > DRAG_THRESHOLD) {
      draggedRef.current = true;
      const handleHeight = usesSnapPoints ? HANDLE_HEIGHT : LEGACY_HANDLE_HEIGHT;
      const drawerHeight = drawerRef.current?.getBoundingClientRect().height || handleHeight;
      const closedOffset = Math.max(0, drawerHeight - handleHeight);
      const finalOffset = Math.max(0, Math.min(closedOffset, snapOffset(drag.snapState, drawerHeight, handleHeight) + delta));
      const candidates = usesSnapPoints ? SNAP_STATES : ["full", "peek"] as const;
      const nextSnapState = candidates.reduce((closest, candidate) =>
        Math.abs(snapOffset(candidate, drawerHeight, handleHeight) - finalOffset) < Math.abs(snapOffset(closest, drawerHeight, handleHeight) - finalOffset)
          ? candidate
          : closest,
      );
      updateSnapState(nextSnapState);
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
    if (!usesSnapPoints) {
      updateExpanded(!expanded);
      return;
    }

    const currentIndex = SNAP_STATES.indexOf(currentSnapState);
    updateSnapState(SNAP_STATES[(currentIndex + SNAP_STATES.length - 1) % SNAP_STATES.length]);
  }

  const handleLabel = !usesSnapPoints
    ? expanded ? "Ocultar lista" : "Mostrar lista"
    : currentSnapState === "peek"
      ? "Expandir lista a media altura"
      : currentSnapState === "half"
        ? "Expandir lista a pantalla completa"
        : "Reducir lista y mostrar mapa";

  return (
    <aside
      ref={drawerRef}
      className={cn(styles.drawer, className)}
      aria-label={ariaLabel}
      data-compact={isCompact}
      data-expanded={expanded}
      data-snap={currentSnapState}
      data-snap-points={usesSnapPoints}
      data-dragging={isDragging}
      style={{
        "--drawer-drag-offset": `${dragDelta}px`,
        "--drawer-handle-height": `${usesSnapPoints ? HANDLE_HEIGHT : LEGACY_HANDLE_HEIGHT}px`,
      } as CSSProperties}
      onFocusCapture={handleFocusCapture}
    >
      <Button
        className={styles.handle}
        variant="ghost"
        size="lg"
        type="button"
        aria-label={handleLabel}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-describedby={summary ? summaryId : undefined}
        data-inventory-map-drawer-handle="true"
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || event.shiftKey || expanded) return;

          event.preventDefault();
          focusContentOnExpandRef.current = true;
          updateExpanded(true);
        }}
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
