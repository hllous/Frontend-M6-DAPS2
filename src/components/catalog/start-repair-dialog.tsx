"use client";

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
import { containersAdapter, ContainerRequestError, type Container } from "@/lib/containers";

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
        error instanceof ContainerRequestError || error instanceof Error
          ? error.message
          : "No se pudo iniciar la reparación del contenedor.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Iniciar reparación independiente · {container.code}</DialogTitle>
        <DialogDescription>
          Acción independiente de Oficina para enviar el contenedor dañado a reparación. No
          corresponde al completado de un Servicio vinculado.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form id="start-repair-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">{container.code}</p>
          <p className="mt-1 text-muted-foreground">Estado actual: Dañado</p>
          <p className="text-muted-foreground">Nuevo estado: En reparación</p>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" form="start-repair-form" disabled={isSubmitting}>
          <Wrench data-icon="inline-start" aria-hidden />
          {isSubmitting ? "Iniciando…" : "Iniciar reparación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
