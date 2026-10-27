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

interface StartRelocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function StartRelocationDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: StartRelocationDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <StartRelocationModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface StartRelocationModalContentProps {
  container: Container;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Container) => void;
}

function StartRelocationModalContent({
  container,
  onOpenChange,
  onSuccess,
}: StartRelocationModalContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let updated: Container;
    try {
      updated = await containersAdapter.relocate(container.id);
    } catch (err) {
      const msg = getErrorMessage(
        err,
        "No se pudo iniciar la reubicación del contenedor.",
      );
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-md overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Iniciar reubicación de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          El contenedor pasa a En reubicación hasta confirmar su nueva ubicación.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="start-relocation-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
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
          form="start-relocation-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Iniciando…" : "Iniciar reubicación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
