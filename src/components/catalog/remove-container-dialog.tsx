"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

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
import {
  containersAdapter,
  type Container,
} from "@/lib/containers";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.remove(container.id);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "No se pudo retirar el contenedor."),
      );
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);

    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Retirar contenedor {container.code}</DialogTitle>
        <DialogDescription>
          El contenedor pasa a Retirado. No se puede deshacer.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="remove-container-form"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain"
      >
        <Alert variant="destructive">
          <AlertDescription>
            <p className="mt-1 text-muted-foreground">
              Verifique que el contenedor {container.code} no volverá a operar.
            </p>
          </AlertDescription>
        </Alert>
      </form>

      <DialogFooter className="flex-col items-stretch [&>button]:whitespace-normal">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Conservar contenedor {container.code}
        </Button>
        <Button
          type="submit"
          form="remove-container-form"
          variant="destructive-solid"
          disabled={isSubmitting}
        >
          <ArchiveX data-icon="inline-start" aria-hidden />
          {isSubmitting ? "Retirando…" : "Confirmar retiro"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
