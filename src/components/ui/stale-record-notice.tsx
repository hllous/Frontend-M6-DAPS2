"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { STALE_RECORD_EVENT, STALE_RECORD_MESSAGE } from "@/lib/record-versions";

/** Id fijo: dos 412 seguidos muestran un solo aviso. */
export const STALE_RECORD_TOAST_ID = "stale-record";

/**
 * Aviso del 412 de concurrencia optimista sobre el `Toaster` de shadcn (Sonner): queda hasta que se cierra y ofrece
 * recargar. No recarga solo, para que el usuario conserve lo que estaba completando hasta decidirlo.
 */
export function StaleRecordNotice() {
  useEffect(() => {
    const show = () => {
      toast.warning(STALE_RECORD_MESSAGE, {
        id: STALE_RECORD_TOAST_ID,
        duration: Infinity,
        closeButton: true,
        action: { label: "Recargar", onClick: () => window.location.reload() },
      });
    };
    window.addEventListener(STALE_RECORD_EVENT, show);
    return () => window.removeEventListener(STALE_RECORD_EVENT, show);
  }, []);
  return null;
}
