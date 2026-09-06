"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { containersAdapter, ContainerRequestError, type Container } from "@/lib/containers";
import { EvidenceQueueView, useEvidenceQueue } from "./container-evidence-queue";

interface CompleteRepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function CompleteRepairDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: CompleteRepairDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CompleteRepairModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

function CompleteRepairModalContent({
  container,
  onOpenChange,
  onSuccess,
}: Omit<CompleteRepairDialogProps, "open"> & { container: Container }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const evidenceQueue = useEvidenceQueue();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.completeRepair(container.id);
    } catch (error) {
      setErrorMessage(
        error instanceof ContainerRequestError || error instanceof Error
          ? error.message
          : "No se pudo completar la reparación del contenedor.",
      );
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);

    if (evidenceQueue.queuedFiles.length > 0) {
      const allFilesOk = await evidenceQueue.uploadAll(container.id);
      setIsSubmitting(false);
      if (allFilesOk) onOpenChange(false);
    } else {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Completar reparación independiente · {container.code}</DialogTitle>
        <DialogDescription>
          Acción independiente de Oficina para restituir el contenedor a estado Activo. No
          corresponde al completado de un Servicio vinculado. Puede adjuntar evidencia plana al
          contenedor.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form id="complete-repair-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">Estado actual: En reparación</p>
          <p className="mt-1 text-muted-foreground">Nuevo estado: Activo</p>
        </div>
        <EvidenceQueueView
          queuedFiles={evidenceQueue.queuedFiles}
          fileValidationError={evidenceQueue.fileValidationError}
          onFileSelect={evidenceQueue.handleFileSelect}
          onRemoveFile={evidenceQueue.removeFile}
          onRetryFile={(item) => evidenceQueue.uploadSingle(container.id, item)}
          disabled={isSubmitting}
        />
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" form="complete-repair-form" disabled={isSubmitting}>
          <CheckCircle2 data-icon="inline-start" aria-hidden />
          {isSubmitting ? "Completando…" : "Confirmar reparación completa"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
