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

interface EmptyContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function EmptyContainerDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: EmptyContainerDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <EmptyContainerModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface EmptyContainerModalContentProps {
  container: Container;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Container) => void;
}

function EmptyContainerModalContent({
  container,
  onOpenChange,
  onSuccess,
}: EmptyContainerModalContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let updated: Container;
    try {
      updated = await containersAdapter.empty(container.id);
    } catch (err) {
      const msg = getErrorMessage(
        err,
        "No se pudo registrar el vaciado del contenedor.",
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
          Registrar vaciado de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          El contenedor vuelve a Activo.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="empty-container-form"
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
          form="empty-container-form"
          variant="success"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Vaciando…" : "Confirmar vaciado"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
