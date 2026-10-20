import { useEffect, useRef } from "react";

/** Scrolls the first visible error into view inside a dialog's scrollable body, so a failed submit from the pinned footer is never silent. */
export function useRevealFirstError(...deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = containerRef.current?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]');
    target?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
