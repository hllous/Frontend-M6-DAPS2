"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { authenticatedFetch, NetworkFailureError, ROLES_STALE_EVENT } from "@/lib/authenticated-fetch";
import { loadRoles, loadScenario, ScenarioRequestError } from "@/lib/scenario-client";
import { scenarioForRoles, type OperationalScenario, type ScenarioId } from "@/lib/scenarios";
import type { PublicSession } from "@/lib/session";
import { onRemoteLogout } from "@/lib/session-client";
import { ensureMockWorkerStarted } from "@/mocks/ensure-worker-started";

import { AppShell } from "./app-shell";
import { ShellError, ShellForbidden, ShellNoRole, ShellUnauthenticated } from "./shell-states";

type LoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; description?: string }
  | { status: "error"; description?: string }
  | { status: "ready"; scenario: OperationalScenario };

function errorDescription(caught: unknown): string | undefined {
  if (caught instanceof NetworkFailureError) return caught.message;
  if (caught instanceof ScenarioRequestError && caught.status >= 500) {
    return `${caught.message} Reintente en unos minutos.`;
  }
  return undefined;
}

export function FoundationDemo({
  scenarioId,
  logoutAction,
  children,
  contentReady = true,
}: {
  scenarioId: ScenarioId;
  logoutAction?: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
  contentReady?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => onRemoteLogout(() => window.location.assign("/login")), []);

  // Un 403 ROLE_REQUIRED sugiere roles viejos: se releen de GET /me y la UI se recalcula sin recargar ni parpadear.
  useEffect(() => {
    const refreshRoles = () => {
      loadRoles()
        .then((roles) => {
          setState((current) => current.status === "ready"
            ? { status: "ready", scenario: scenarioForRoles(current.scenario, roles) }
            : current);
          // Nested catalog pages receive their scenario from Server Components.
          // Re-render them with the freshly sealed roles as well as updating the shell.
          router.refresh();
        })
        .catch(() => undefined);
    };
    window.addEventListener(ROLES_STALE_EVENT, refreshRoles);
    return () => window.removeEventListener(ROLES_STALE_EVENT, refreshRoles);
  }, [router]);

  useEffect(() => {
    let lastRefreshAt = 0;
    const refreshActivity = () => {
      const now = Date.now();
      if (now - lastRefreshAt < 60_000) return;
      lastRefreshAt = now;
      void authenticatedFetch("/api/session").then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as { session?: PublicSession };
        const session = body.session;
        if (!session || session.mode !== "backend-development" || !Array.isArray(session.roles)) return;
        setState((current) => {
          if (current.status !== "ready") return current;
          const actor = current.scenario.actor;
          if (current.scenario.roles.length === session.roles.length && current.scenario.roles.every((role, index) => role === session.roles[index]) && actor.crewId === session.crew?.id && actor.crewName === session.crew?.name && actor.fieldRole === session.fieldRole) return current;
          const scenario = { ...current.scenario, actor: { ...actor, crewId: session.crew?.id, crewName: session.crew?.name, fieldRole: session.fieldRole } };
          return { status: "ready", scenario: scenarioForRoles(scenario, session.roles) };
        });
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
      setState({ status: "loading" });
      try {
        // The Playwright suite (#88) disables this: MSW's service worker would otherwise
        // intercept /api/mock/scenarios and /api/zones before the fault-injection specs'
        // own page.route() handlers ever see the request.
        if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DISABLE_MSW !== "true") {
          await ensureMockWorkerStarted();
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
          setState({ status: "forbidden", description: caught.message });
          return;
        }
        setState({ status: "error", description: errorDescription(caught) });
      }
    }
    void requestScenario();
    return () => {
      isCurrent = false;
    };
  }, [scenarioId, requestVersion]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  if (state.status === "unauthenticated") return <main className="p-6"><ShellUnauthenticated /></main>;
  if (state.status === "forbidden") return <main className="p-6"><ShellForbidden description={state.description} /></main>;
  if (state.status === "ready" && state.scenario.roles.length === 0) return <ShellNoRole logoutAction={logoutAction} />;
  if (state.status === "error") return <main className="p-6"><ShellError onRetry={retry} description={state.description} /></main>;
  return (
    <AppShell scenario={state.status === "ready" ? state.scenario : undefined} logoutAction={logoutAction} routeContent={children} contentReady={contentReady} />
  );
}
