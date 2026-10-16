"use client";
/* eslint-disable no-restricted-syntax -- PROTOTYPE #529: text-only switcher, throwaway */
// PROTOTYPE #529 (throwaway): text-only floating switcher, one group per decision. Dev builds only.
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

import { FeedbackHost } from "./feedback";
import { PROTOTYPE_PARAMS, type PrototypeParam } from "./preserve-params";

const GROUPS: Record<PrototypeParam, string> = { date: "Fecha", list: "Lista", feedback: "Aviso" };
const VARIANTS = [null, "a", "b", "c"] as const;

export function PatternSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (process.env.NODE_ENV === "production") return null;

  function choose(key: PrototypeParam, variant: string | null) {
    const next = new URLSearchParams(params?.toString());
    if (variant) next.set(key, variant);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <FeedbackHost />
      <nav
        aria-label="Prototipo"
        className="fixed bottom-3 left-1/2 z-[100] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center gap-x-1.5 rounded-full bg-foreground px-2 py-1.5 text-[10px] sm:gap-x-4 sm:px-4 sm:text-xs text-background shadow-lg"
      >
        {PROTOTYPE_PARAMS.map((key) => {
          const current = params?.get(key) ?? null;
          return (
            <div key={key} role="group" aria-label={GROUPS[key]} className="flex items-center gap-0.5 sm:gap-1">
              <span className="opacity-70">{GROUPS[key]}</span>
              {VARIANTS.map((variant) => (
                <button
                  key={variant ?? "base"}
                  type="button"
                  aria-pressed={current === variant}
                  onClick={() => choose(key, variant)}
                  className={cn("rounded px-1 py-0.5 uppercase sm:px-1.5", current === variant ? "bg-background text-foreground" : "hover:underline")}
                >
                  {variant ?? "—"}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </>
  );
}
