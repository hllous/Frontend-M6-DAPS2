"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { notifyError } from "@/components/ui/feedback";
import { FoundationDemo } from "@/components/shell/foundation-demo";
import { getFieldDraftOwner, setFieldDraftOwner, subscribeFieldDraftOwner } from "@/lib/field-drafts";
import type { ScenarioId } from "@/lib/scenarios";
import { broadcastLogout } from "@/lib/session-client";

export function SessionShell({ actorId, scenarioId, logoutAction, children }: {
  actorId: string;
  scenarioId: ScenarioId;
  logoutAction: (formData: FormData) => Promise<void>;
  children?: ReactNode;
}) {
  const draftOwner = useSyncExternalStore(subscribeFieldDraftOwner, getFieldDraftOwner, () => undefined);
  useEffect(() => setFieldDraftOwner(actorId), [actorId]);

  async function logout(formData: FormData) {
    try {
      await logoutAction(formData);
    } catch {
      notifyError("No se pudo cerrar la sesión. Reintente.");
      return;
    }
    await broadcastLogout();
  }

  return (
    <FoundationDemo scenarioId={scenarioId} logoutAction={logout} contentReady={draftOwner === actorId}>
      {draftOwner === actorId ? children : null}
    </FoundationDemo>
  );
}
