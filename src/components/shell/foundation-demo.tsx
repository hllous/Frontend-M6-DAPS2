"use client";

import { useCallback, useEffect, useState } from "react";

import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { loadScenario, ScenarioRequestError } from "@/lib/scenario-client";
import type { OperationalScenario, ScenarioId } from "@/lib/scenarios";
import { onRemoteLogout } from "@/lib/session-client";

import { AppShell } from "./app-shell";
import { ShellError, ShellForbidden, ShellLoading, ShellUnauthenticated } from "./shell-states";

type LoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; scenario: OperationalScenario };

export function FoundationDemo({
  scenarioId,
  logoutAction,
}: {
  scenarioId: ScenarioId;
  logoutAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => onRemoteLogout(() => window.location.assign("/login")), []);

  useEffect(() => {
    let lastRefreshAt = 0;
    const refreshActivity = () => {
      const now = Date.now();
      if (now - lastRefreshAt < 60_000) return;
      lastRefreshAt = now;
      void authenticatedFetch("/api/session").catch(() => undefined);
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
      setState({ status: "loading" });
      try {
        if (process.env.NODE_ENV === "development") {
          const { worker } = await import("@/mocks/browser");
          await worker.start({ onUnhandledRequest: "bypass" });
        }
        const nextScenario = await loadScenario(scenarioId);
        if (isCurrent) setState({ status: "ready", scenario: nextScenario });
      } catch (caught) {
        if (!isCurrent) return;
        if (caught instanceof ScenarioRequestError && caught.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (caught instanceof ScenarioRequestError && caught.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        setState({ status: "error" });
      }
    }
    void requestScenario();
    return () => {
      isCurrent = false;
    };
  }, [scenarioId, requestVersion]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  if (state.status === "unauthenticated") return <main className="p-6"><ShellUnauthenticated /></main>;
  if (state.status === "forbidden") return <main className="p-6"><ShellForbidden /></main>;
  if (state.status === "error") return <main className="p-6"><ShellError onRetry={retry} /></main>;
  if (state.status === "loading") return <main className="p-6"><ShellLoading /></main>;
  return <AppShell scenario={state.scenario} logoutAction={logoutAction} />;
}
