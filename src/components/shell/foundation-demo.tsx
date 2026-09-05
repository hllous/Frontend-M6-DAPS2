"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./app-shell";
import { ShellError, ShellLoading } from "./shell-states";
import { loadScenario } from "@/lib/scenario-client";
import { scenarios, type OperationalScenario, type ScenarioId } from "@/lib/scenarios";

const scenarioOptions = Object.values(scenarios);

export function FoundationDemo() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("office-duty-queue");
  const [scenario, setScenario] = useState<OperationalScenario>();
  const [hasError, setHasError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    let isCurrent = true;
    async function requestScenario() {
      setScenario(undefined); setHasError(false);
      try {
        if (process.env.NODE_ENV === "development") { const { worker } = await import("@/mocks/browser"); await worker.start({ onUnhandledRequest: "bypass" }); }
        const nextScenario = await loadScenario(scenarioId);
        if (isCurrent) setScenario(nextScenario);
      } catch { if (isCurrent) setHasError(true); }
    }
    void requestScenario(); return () => { isCurrent = false; };
  }, [scenarioId, requestVersion]);
  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);
  if (hasError) return <main className="p-6"><ShellError onRetry={retry} /></main>;
  if (!scenario) return <main className="p-6"><ShellLoading /></main>;
  return <><label className="sr-only" htmlFor="foundation-scenario">Escenario operativo</label><select id="foundation-scenario" className="fixed right-4 top-4 z-30 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]" value={scenarioId} onChange={(event) => setScenarioId(event.target.value as ScenarioId)}>{scenarioOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><AppShell scenario={scenario} /></>;
}
