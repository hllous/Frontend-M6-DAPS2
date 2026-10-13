"use client";

import { useState, type ReactNode } from "react";

import { FoundationDemo } from "@/components/shell/foundation-demo";
import type { ScenarioId } from "@/lib/scenarios";
import { broadcastLogout } from "@/lib/session-client";

export function SessionShell({ scenarioId, logoutAction, children }: {
  scenarioId: ScenarioId;
  logoutAction: (formData: FormData) => Promise<void>;
  children?: ReactNode;
}) {
  const [logoutError, setLogoutError] = useState<string>();

  async function logout(formData: FormData) {
    setLogoutError(undefined);
    try {
      await logoutAction(formData);
    } catch {
      setLogoutError("No se pudo cerrar la sesión. Reintente.");
      return;
    }
    await broadcastLogout();
  }

  return (
    <>
      {logoutError ? <p role="alert" className="fixed inset-x-4 top-20 z-50 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-4 text-[var(--color-danger)] sm:left-auto">{logoutError}</p> : null}
      <FoundationDemo scenarioId={scenarioId} logoutAction={logout}>{children}</FoundationDemo>
    </>
  );
}
