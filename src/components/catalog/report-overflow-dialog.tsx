"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  containersAdapter,
  ContainerRequestError,
  type Container,
} from "@/lib/containers";
import {
  EvidenceQueueView,
  useEvidenceQueue,
} from "./container-evidence-queue";

interface ReportOverflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function ReportOverflowDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: ReportOverflowDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ReportOverflowModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface ReportOverflowModalContentProps {
  container: Container;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Container) => void;
}

function ReportOverflowModalContent({
  container,
  onOpenChange,
  onSuccess,
}: ReportOverflowModalContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const evidenceQueue = useEvidenceQueue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let updated: Container;
    try {
      updated = await containersAdapter.reportOverflow(container.id);
    } catch (err) {
      const msg = getErrorMessage(err, "No se pudo reportar el desborde.");
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    // Backend report was authoritative and succeeded
    onSuccess(updated);

    // Upload queued evidence files if any
    if (evidenceQueue.queuedFiles.length > 0) {
      const allFilesOk = await evidenceQueue.uploadAll(container.id);
      setIsSubmitting(false);
      if (allFilesOk) {
        onOpenChange(false);
      }
    } else {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  return (
    <DialogContent className="max-w-md overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
          <AlertTriangle className="size-4" aria-hidden />
          <span>Novedad operativa en vía pública</span>
        </div>
        <DialogTitle>
          Reportar desborde de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          Confirme que el contenedor ha superado su capacidad física o presenta
          acumulación de residuos perimetral. Esta acción transicionará el
          estado a Desbordado.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="report-overflow-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Alert role="note">
          <AlertDescription>
            <p className="font-medium text-foreground">
              Detalles del contenedor:
            </p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold">Ubicación:</span>{" "}
              {container.address ?? "Sin dirección registrada"}
            </p>
            <p className="text-muted-foreground">
              <span className="font-semibold">Capacidad:</span>{" "}
              {container.capacityLiters.toLocaleString("es-AR")} L
            </p>
          </AlertDescription>
        </Alert>

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
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="report-overflow-form"
          variant="warning"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Reportando…" : "Confirmar desborde"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
