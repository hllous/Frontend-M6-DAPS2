"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { servicesMobileBreakpoint } from "@/lib/services-layout";
import { cn } from "@/lib/utils";

import styles from "./inventory-map-drawer.module.css";

type InventoryMapDrawerProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  expandToViewport?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  suspended?: boolean;
  snapState?: InventoryMapDrawerSnapState;
  onSnapStateChange?: (snapState: InventoryMapDrawerSnapState) => void;
  summary: string;
};

export type InventoryMapDrawerSnapState = "peek" | "half" | "full";

const SNAP_POINTS = [0.12, 0.5, 0.9];
const SNAP_POINT_BY_STATE: Record<InventoryMapDrawerSnapState, number> = {
  peek: SNAP_POINTS[0],
  half: SNAP_POINTS[1],
  full: SNAP_POINTS[2],
};

export function InventoryMapDrawer({
  ariaLabel,
  children,
  className,
  expandToViewport = false,
  expanded: controlledExpanded,
  onExpandedChange,
  suspended = false,
  snapState: controlledSnapState,
  onSnapStateChange,
  summary,
}: InventoryMapDrawerProps) {
  const mobileRootRef = useRef<HTMLElement>(null);
  const drawerFocusRef = useRef<HTMLButtonElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(false);
  const [localSnapState, setLocalSnapState] = useState<InventoryMapDrawerSnapState>("peek");
  const [popupStyle, setPopupStyle] = useState<CSSProperties>();
  const hasSnapPoints = controlledSnapState !== undefined || onSnapStateChange !== undefined;
  const snapState = controlledSnapState ?? localSnapState;
  const expanded = controlledExpanded ?? localExpanded;

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
      const reservedBottom = Math.max(0, Math.round(viewportHeight - (mobileNavTop ?? bounds.bottom)));
      const availableHeight = Math.max(0, viewportHeight - top - reservedBottom);
      const snapHeight = hasSnapPoints && snapState !== "peek"
        ? Math.min(availableHeight, SNAP_POINT_BY_STATE[snapState] * viewportHeight)
        : availableHeight;
      // Base UI measures snap fractions against the viewport, so reserve half of the size delta as translation space.
      const snapOffset = hasSnapPoints && snapState !== "peek"
        ? Math.max(0, (availableHeight - snapHeight) / 2)
        : 0;
      const bottom = Math.max(0, Math.round(reservedBottom + snapOffset));
      const height = Math.max(0, viewportHeight - top - bottom);
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
  }, [expandToViewport, hasSnapPoints, isCompact, snapState]);

  function updateExpanded(nextExpanded: boolean) {
    if (controlledExpanded === undefined) setLocalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  function updateSnapState(nextSnapState: InventoryMapDrawerSnapState) {
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

  if (hasSnapPoints) {
    const handleLabel = "Expandir lista a media altura";

    return (
      <aside ref={mobileRootRef} className={styles.mobileRoot} aria-label={ariaLabel} data-snap={snapState}>
        <Drawer
          open={!suspended && snapState !== "peek"}
          onOpenChange={(open) => updateSnapState(open ? "half" : "peek")}
          modal={false}
          disablePointerDismissal
          snapPoints={SNAP_POINTS}
          snapPoint={snapState === "peek" ? null : SNAP_POINT_BY_STATE[snapState]}
          onSnapPointChange={(point) => {
            const matchedState = (Object.entries(SNAP_POINT_BY_STATE) as [InventoryMapDrawerSnapState, number][])
              .find(([, snapPoint]) => snapPoint === point)?.[0];
            if (matchedState) updateSnapState(matchedState);
          }}
          showSwipeHandle
        >
          <DrawerTrigger
            className={cn(styles.handle, snapState !== "peek" && styles.hiddenHandle)}
            aria-hidden={snapState !== "peek" || undefined}
            inert={snapState !== "peek"}
            render={<Button variant="outline" type="button" aria-label={handleLabel} aria-expanded={snapState !== "peek"} />}
          >
            {summary}
          </DrawerTrigger>
          <DrawerContent
            className={styles.popup}
            initialFocus={(openType) => openType ? drawerFocusRef.current : false}
            style={popupStyle}
          >
            <DrawerHeader className={styles.header}>
              <DrawerTitle>{summary}</DrawerTitle>
              <div className="flex items-center gap-2">
                {snapState === "half" ? (
                  <Button ref={drawerFocusRef} variant="outline" aria-label="Expandir lista a pantalla completa" aria-expanded onClick={() => updateSnapState("full")}>
                    Expandir
                  </Button>
                ) : (
                  <DrawerClose render={<Button ref={drawerFocusRef} variant="outline" aria-label="Reducir lista y mostrar mapa" aria-expanded>Ver mapa</Button>} />
                )}
                <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="Cerrar lista"><X aria-hidden /></Button>} />
              </div>
            </DrawerHeader>
            <div className={styles.content} aria-hidden={snapState === "peek" || undefined} inert={snapState === "peek"}>
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </aside>
    );
  }

  return (
    <aside ref={mobileRootRef} className={styles.mobileRoot} aria-label={ariaLabel}>
      <Drawer open={expanded} onOpenChange={updateExpanded} modal={false} showSwipeHandle>
        <DrawerTrigger
          render={<Button className={styles.handle} variant="outline" type="button" aria-label={expanded ? "Ocultar lista" : "Mostrar lista"} />}
        >
          <span className={styles.grabber} aria-hidden="true" />
          <span>{summary}</span>
        </DrawerTrigger>
        <DrawerContent
          className={styles.popup}
          initialFocus={(openType) => openType ? drawerFocusRef.current : false}
          style={popupStyle}
        >
          <DrawerHeader className={styles.header}>
            <DrawerTitle>{summary}</DrawerTitle>
              <DrawerClose render={<Button ref={drawerFocusRef} variant="ghost" size="icon-sm" aria-label="Cerrar lista"><X aria-hidden /></Button>} />
          </DrawerHeader>
          <div className={styles.content}>{children}</div>
        </DrawerContent>
      </Drawer>
    </aside>
  );
}
