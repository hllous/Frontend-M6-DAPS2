"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_LABEL, type Service } from "@/lib/services";
import type { FieldDraftServiceSnapshot } from "@/lib/field-drafts";

function formatWindow(from: string | null | undefined, to: string | null | undefined): string {
  return from ? `${from} – ${to ?? ""}` : "No establecida";
}

export function DraftConflictView({
  serviceId,
  actionLabel,
  composedAgainst,
  current,
  onPreserve,
  onDiscard,
}: {
  serviceId: string;
  actionLabel: string;
  composedAgainst: FieldDraftServiceSnapshot;
  current: Service;
  onPreserve: () => void;
  onDiscard: () => void;
}) {
  const rows = [
    {
      label: "Estado",
      before: STATUS_LABEL[composedAgainst.status],
      after: STATUS_LABEL[current.status],
    },
    {
      label: "Cuadrilla",
      before: composedAgainst.crewName ?? "Sin asignar",
      after: current.crewName ?? "Sin asignar",
    },
    {
      label: "Vehículo",
      before: composedAgainst.vehiclePlate ?? "Sin vehículo",
      after: current.vehiclePlate ?? "Sin vehículo",
    },
    {
      label: "Fecha programada",
      before: composedAgainst.scheduledDate,
      after: current.scheduledDate,
    },
    {
      label: "Ventana horaria",
      before: formatWindow(composedAgainst.windowFrom, composedAgainst.windowTo),
      after: formatWindow(current.windowFrom, current.windowTo),
    },
  ];

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-3 text-xs text-[var(--color-warning)]"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-bold">
            El servicio {serviceId} cambió mientras su borrador de {actionLabel} estaba sin enviar.
          </p>
          <p className="mt-1">
            Compare ambas versiones antes de decidir si conserva el borrador local para reintentar
            más tarde o lo descarta. Nunca se aplica automáticamente.
          </p>
        </div>
      </div>

      <div
        role="table"
        aria-label="Comparación de versiones del servicio"
        className="rounded-xl border border-[var(--color-border)] overflow-hidden text-xs"
      >
        <div
          role="row"
          className="grid grid-cols-3 gap-2 bg-[var(--color-canvas)] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide px-3 py-2"
        >
          <span>Campo</span>
          <span>Su borrador</span>
          <span>Versión actual del servidor</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            role="row"
            className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] px-3 py-2"
          >
            <span className="font-semibold text-[var(--color-text)]">{row.label}</span>
            <span className="text-[var(--color-text-secondary)]">{row.before}</span>
            <span
              className={
                row.before !== row.after
                  ? "font-bold text-[var(--color-warning)]"
                  : "text-[var(--color-text)]"
              }
            >
              {row.after}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDiscard}
          className="text-xs font-semibold text-[var(--color-danger)] border-[var(--color-danger-line)] hover:bg-[var(--color-danger-fill)]/40"
        >
          Descartar borrador
        </Button>
        <Button type="button" variant="default" size="sm" onClick={onPreserve} className="text-xs font-semibold">
          Conservar borrador
        </Button>
      </div>
    </div>
  );
}

export function DraftConflictDialog({
  open,
  onOpenChange,
  serviceId,
  actionLabel,
  composedAgainst,
  current,
  onPreserve,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  actionLabel: string;
  composedAgainst: FieldDraftServiceSnapshot | null;
  current: Service | null;
  onPreserve: () => void;
  onDiscard: () => void;
}) {
  if (!composedAgainst || !current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle>Conflicto de sincronización</DialogTitle>
          <DialogDescription>
            No se aplicó el borrador local automáticamente.
          </DialogDescription>
        </DialogHeader>
        <DraftConflictView
          serviceId={serviceId}
          actionLabel={actionLabel}
          composedAgainst={composedAgainst}
          current={current}
          onPreserve={() => {
            onPreserve();
            onOpenChange(false);
          }}
          onDiscard={() => {
            onDiscard();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
