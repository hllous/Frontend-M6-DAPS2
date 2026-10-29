import { useEffect, useRef } from "react";

/** Scrolls the first visible error into view inside a dialog's scrollable body, so a failed submit from the pinned footer is never silent. */
export function useRevealFirstError<T extends HTMLElement = HTMLDivElement>(...deps: unknown[]) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const target = containerRef.current?.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]');
    target?.scrollIntoView?.({ block: "nearest" });
    // Tras un envío fallido el foco va al primer campo inválido, no se queda en el botón fijo del pie.
    containerRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus?.({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
