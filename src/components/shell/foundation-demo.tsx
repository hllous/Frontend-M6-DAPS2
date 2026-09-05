"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./app-shell";
import { ShellError, ShellLoading } from "./shell-states";
import { loadScenario } from "@/lib/scenario-client";
import type { OperationalScenario, ScenarioId } from "@/lib/scenarios";

export function FoundationDemo({
  scenarioId,
  logoutAction,
}: {
  scenarioId: ScenarioId;
  logoutAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [scenario, setScenario] = useState<OperationalScenario>();
  const [hasError, setHasError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    let lastRefreshAt = 0;
    const refreshActivity = () => {
      const now = Date.now();
      if (now - lastRefreshAt < 60_000) return;
      lastRefreshAt = now;
      void fetch("/api/session", { cache: "no-store" }).then((response) => {
        if (!response.ok) window.location.assign("/login");
      }).catch(() => undefined);
    };
    window.addEventListener("pointerdown", refreshActivity);
    window.addEventListener("keydown", refreshActivity);
    return () => {
      window.removeEventListener("pointerdown", refreshActivity);
      window.removeEventListener("keydown", refreshActivity);
    };
  }, []);
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
  return <AppShell scenario={scenario} logoutAction={logoutAction} />;
}
