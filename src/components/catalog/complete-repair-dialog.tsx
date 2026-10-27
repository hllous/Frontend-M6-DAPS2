"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

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
import {
  containersAdapter,
  type Container,
} from "@/lib/containers";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.completeRepair(container.id);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo completar la reparación del contenedor.",
        ),
      );
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);

    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <DialogContent className="max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Completar reparación · {container.code}
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
        id="complete-repair-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Alert role="note">
          <AlertDescription>
            <p className="font-medium text-foreground">
              Estado: En reparación
            </p>
            <p className="mt-1 text-muted-foreground">Nuevo estado: Activo</p>
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
          form="complete-repair-form"
          disabled={isSubmitting}
        >
          <CheckCircle2 data-icon="inline-start" aria-hidden />
          {isSubmitting ? "Completando…" : "Confirmar reparación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
