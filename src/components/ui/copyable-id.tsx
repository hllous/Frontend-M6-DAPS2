"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CopyState = "idle" | "copied" | "failed";

/** Technical identifier as secondary data: monospace, with a button to copy it and a live announcement of the result. */
export function CopyableId({ value, label }: { value: string; label: string }) {
  // The result belongs to the value it was produced for, so a new value starts clean; it fades after 2 s.
  const [result, setResult] = useState<{ value: string; state: CopyState }>({ value, state: "idle" });
  const state = result.value === value ? result.state : "idle";
  const setState = (next: CopyState) => setResult({ value, state: next });

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setResult({ value, state: "idle" }), 2000);
    return () => clearTimeout(timer);
  }, [state, value]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <code className="break-all text-xs text-[var(--color-text-secondary)]">{value}</code>
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Copiar ${label}`} onClick={() => void copy()}>
              {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          )}
        />
        <TooltipContent>Copiar</TooltipContent>
      </Tooltip>
      <span role="status" aria-live="polite" className={state === "failed" ? "text-xs text-[var(--color-danger)]" : "sr-only"}>
        {state === "copied" ? "Copiado" : state === "failed" ? "No se pudo copiar" : ""}
      </span>
    </span>
  );
}
