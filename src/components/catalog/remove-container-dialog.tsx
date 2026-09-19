"use client";

import { useState } from "react";
import { ArchiveX } from "lucide-react";

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

interface RemoveContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function RemoveContainerDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: RemoveContainerDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <RemoveContainerModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

function RemoveContainerModalContent({
  container,
  onOpenChange,
  onSuccess,
}: Omit<RemoveContainerDialogProps, "open"> & { container: Container }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const evidenceQueue = useEvidenceQueue();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.remove(container.id);
    } catch (error) {
      setErrorMessage(
        error instanceof ContainerRequestError || error instanceof Error
          ? error.message
          : "No se pudo retirar el contenedor.",
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
        <DialogTitle>Retirar contenedor {container.code}</DialogTitle>
        <DialogDescription>
          Esta acción terminal de Oficina cambiará el contenedor dañado a Retirado. No podrá
          iniciar otra transición de ciclo de vida después del retiro. Puede adjuntar evidencia
          plana al contenedor.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form id="remove-container-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-semibold text-destructive">Confirmación de retiro</p>
          <p className="mt-1 text-muted-foreground">
            Verifique que el contenedor {container.code} no volverá a operar.
          </p>
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
        <Button type="submit" form="remove-container-form" variant="destructive" disabled={isSubmitting}>
          <ArchiveX data-icon="inline-start" aria-hidden />
          {isSubmitting ? "Retirando…" : "Confirmar retiro"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
