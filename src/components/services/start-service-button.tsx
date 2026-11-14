"use client";

import { AlertTriangle, Play } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";
import { checkServiceWindowTiming, type Service } from "@/lib/services";

/**
 * "Iniciar servicio" (#910). Inside its window it stays one tap for Field (ADR-0001: Local draft and
 * manual resubmission). Outside the window, the same check that paints "Fuera del horario" asks for
 * confirmation first; the confirmed start goes through the same `onStart`, so the draft flow and the
 * conflict check are unchanged. Resubmitting a pending draft ("Reenviar") stays direct: it was already
 * confirmed when composed.
 */
export function StartServiceButton({
  service,
  onStart,
  isStarting,
  draftPending,
  className,
}: {
  service: Service;
  /** Resolves to an error message when the start failed, or null/undefined otherwise. */
  onStart: (service: Service) => Promise<string | null | void> | void;
  isStarting: boolean;
  draftPending: boolean;
  className?: string;
}) {
  const label = isStarting ? "Iniciando..." : draftPending ? "Reenviar" : "Iniciar servicio";
  const isOutside = checkServiceWindowTiming(service).isOutside;

  if (!isOutside || draftPending) {
    return (
      <Button size="sm" onClick={() => void onStart(service)} disabled={isStarting} className={className}>
        <Play data-icon="inline-start" aria-hidden />
        <span>{label}</span>
      </Button>
    );
  }

  return (
    <ConfirmActionDialog
      trigger={
        <Button size="sm" disabled={isStarting} className={className}>
          <Play data-icon="inline-start" aria-hidden />
          <span>{label}</span>
        </Button>
      }
      title="Iniciar servicio fuera de horario"
      description={`${service.title} está fuera de su franja. Confirme que corresponde iniciarlo ahora.`}
      confirmLabel="Iniciar igual"
      pendingLabel="Iniciando…"
      onConfirm={async () => (await onStart(service)) ?? null}
      errorFallback="No se pudo registrar el inicio del servicio."
    >
      <Alert variant="warning" role="note">
        <AlertTriangle aria-hidden />
        <AlertDescription>
          Franja programada: {formatArgentinaCalendarDate(service.scheduledDate)}, de {service.windowFrom} a {service.windowTo}.
        </AlertDescription>
      </Alert>
    </ConfirmActionDialog>
  );
}
