"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useState } from "react";
import { Wrench } from "lucide-react";

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

interface StartRepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

export function StartRepairDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: StartRepairDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <StartRepairModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

function StartRepairModalContent({
  container,
  onOpenChange,
  onSuccess,
}: Omit<StartRepairDialogProps, "open"> & { container: Container }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updated = await containersAdapter.startRepair(container.id);
      onSuccess(updated);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo iniciar la reparación del contenedor.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="max-w-md overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Iniciar reparación · {container.code}
        </DialogTitle>
        <DialogDescription>
          El contenedor pasa a En reparación.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="start-repair-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Alert role="note">
          <AlertDescription className="grid gap-2">
            <p className="font-medium text-foreground">{container.code}</p>
            <p className="mt-1 text-muted-foreground">Dañado → En reparación</p>
          </AlertDescription>
        </Alert>
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
          form="start-repair-form"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          <Wrench data-icon="inline-start" aria-hidden />
          Iniciar reparación
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
