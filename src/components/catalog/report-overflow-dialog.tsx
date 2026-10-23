"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useState } from "react";
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
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>
          Reportar desborde de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          El contenedor pasa a Desbordado.
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
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain"
      >
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
