"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { servicesMobileBreakpoint } from "@/lib/services-layout";
import { cn } from "@/lib/utils";

import styles from "./inventory-map-drawer.module.css";

type InventoryMapDrawerProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  expandToViewport?: boolean;
  suspended?: boolean;
  snapState?: InventoryMapDrawerSnapState;
  onSnapStateChange?: (snapState: InventoryMapDrawerSnapState) => void;
  summary: string;
};

export type InventoryMapDrawerSnapState = "peek" | "half" | "full";

const SNAP_STATES: InventoryMapDrawerSnapState[] = ["peek", "half", "full"];
const SNAP_LABEL: Record<InventoryMapDrawerSnapState, string> = {
  peek: "colapsada",
  half: "media",
  full: "completa",
};
// Visible height when collapsed: grab bar plus the summary header.
const PEEK_HEIGHT = 60;

export function InventoryMapDrawer({
  ariaLabel,
  children,
  className,
  expandToViewport = false,
  suspended = false,
  snapState: controlledSnapState,
  onSnapStateChange,
  summary,
}: InventoryMapDrawerProps) {
  const mobileRootRef = useRef<HTMLElement>(null);
  const ignoreSnapChange = useRef(false);
  const [isCompact, setIsCompact] = useState(false);
  const [localSnapState, setLocalSnapState] = useState<InventoryMapDrawerSnapState>("peek");
  const [popupStyle, setPopupStyle] = useState<CSSProperties>();
  const [popupHeight, setPopupHeight] = useState(0);
  const snapState = controlledSnapState ?? localSnapState;

  useEffect(() => {
    const updateViewport = () => setIsCompact(window.innerWidth <= servicesMobileBreakpoint());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useLayoutEffect(() => {
    if (!isCompact || !mobileRootRef.current) return;

    const updateBounds = () => {
      const viewportHeight = window.innerHeight;
      const bounds = mobileRootRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const shellHeaderBottom = expandToViewport
        ? document.querySelector<HTMLElement>('header[class*="topbar"]')?.getBoundingClientRect().bottom
        : undefined;
      const mobileNavTop = document.querySelector<HTMLElement>('nav[aria-label="Navegación móvil"]')?.getBoundingClientRect().top;
      const top = Math.max(0, Math.round(shellHeaderBottom ?? bounds.top));
      const bottom = Math.max(0, Math.round(viewportHeight - (mobileNavTop ?? bounds.bottom)));
      const height = Math.max(0, viewportHeight - top - bottom);
      setPopupHeight(height);
      setPopupStyle({ top, bottom, height, maxHeight: height } as CSSProperties);
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(updateBounds)
      : null;
    if (resizeObserver) resizeObserver.observe(mobileRootRef.current);

    return () => {
      window.removeEventListener("resize", updateBounds);
      resizeObserver?.disconnect();
    };
  }, [expandToViewport, isCompact]);

  function updateSnapState(nextSnapState: InventoryMapDrawerSnapState) {
    if (nextSnapState === snapState) return;
    if (controlledSnapState === undefined) setLocalSnapState(nextSnapState);
    onSnapStateChange?.(nextSnapState);
  }

  if (!isCompact) {
    return (
      <aside className={cn(styles.desktopPanel, className)} aria-label={ariaLabel}>
        {children}
      </aside>
    );
  }

  // Visible heights in px: Base UI resolves each one against the popup height.
  // Before the first measurement fall back to the window so the snap points are defined from the first render.
  const sheetHeight = Math.max(popupHeight || window.innerHeight, PEEK_HEIGHT * 3);
  const snapPointByState: Record<InventoryMapDrawerSnapState, number> = {
    peek: PEEK_HEIGHT,
    half: Math.round(sheetHeight * 0.5),
    full: sheetHeight,
  };
  const snapPoints = SNAP_STATES.map((state) => snapPointByState[state]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const index = SNAP_STATES.indexOf(snapState);
    const next = {
      ArrowUp: SNAP_STATES[Math.min(index + 1, SNAP_STATES.length - 1)],
      ArrowDown: SNAP_STATES[Math.max(index - 1, 0)],
      Home: SNAP_STATES[0],
      End: SNAP_STATES[SNAP_STATES.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    updateSnapState(next);
  }

  function cycleSnapState() {
    updateSnapState(SNAP_STATES[(SNAP_STATES.indexOf(snapState) + 1) % SNAP_STATES.length]);
  }

  return (
    <aside ref={mobileRootRef} className={styles.mobileRoot} aria-label={ariaLabel} data-snap={snapState}>
      <Drawer
        open={!suspended}
        // Swiping below the lowest snap point or pressing Escape collapses the sheet instead of removing it.
        onOpenChange={(open) => {
          if (open) return;
          // The sheet never closes, so Base UI reverts the swipe on the next frame and restores its pre-swipe
          // snap point; that restore must not win over the collapse.
          ignoreSnapChange.current = true;
          window.setTimeout(() => {
            ignoreSnapChange.current = false;
          }, 100);
          updateSnapState("peek");
        }}
        modal={false}
        disablePointerDismissal
        snapPoints={snapPoints}
        snapPoint={snapPointByState[snapState]}
        onSnapPointChange={(point) => {
          if (ignoreSnapChange.current) return;
          const matched = SNAP_STATES.find((state) => snapPointByState[state] === point);
          if (matched) updateSnapState(matched);
        }}
      >
        <DrawerContent
          className={styles.popup}
          initialFocus={false}
          finalFocus={false}
          style={popupStyle}
          // The sheet slides under the mobile nav when collapsed: clip it to the area above the nav.
          viewportProps={{ style: { clipPath: `inset(0 0 ${popupStyle?.bottom ?? 0}px 0)` } }}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label="Altura de la lista"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={SNAP_STATES.length - 1}
            aria-valuenow={SNAP_STATES.indexOf(snapState)}
            aria-valuetext={SNAP_LABEL[snapState]}
            className={styles.handle}
            onClick={cycleSnapState}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                cycleSnapState();
                return;
              }
              handleKeyDown(event);
            }}
          >
            <span className={styles.grabber} aria-hidden="true" />
          </div>
          <DrawerHeader className={styles.header}>
            <DrawerTitle>{summary}</DrawerTitle>
          </DrawerHeader>
          <div className={styles.content} aria-hidden={snapState === "peek" || undefined} inert={snapState === "peek"}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </aside>
  );
}
