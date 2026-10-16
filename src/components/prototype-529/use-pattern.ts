"use client";
// PROTOTYPE #529 (throwaway): reads ?date=, ?list= and ?feedback= (a|b|c). Absent = the screen as it is today.
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

import type { PatternVariant, PrototypeParam } from "./preserve-params";

export function usePattern(key: PrototypeParam): PatternVariant | null {
  const params = useSearchParams();
  const value = params?.get(key);
  return value === "a" || value === "b" || value === "c" ? value : null;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia?.("(max-width: 760px)");
      query?.addEventListener("change", notify);
      return () => query?.removeEventListener("change", notify);
    },
    () => window.matchMedia?.("(max-width: 760px)").matches ?? false,
    () => false,
  );
}
