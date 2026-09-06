"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

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
      const msg =
        err instanceof ContainerRequestError || err instanceof Error
          ? err.message
          : "No se pudo iniciar la reubicación del contenedor.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-info)]">
          <RotateCcw className="size-4" aria-hidden />
          <span>Despacho de reubicación</span>
        </div>
        <DialogTitle>Iniciar reubicación de contenedor {container.code}</DialogTitle>
        <DialogDescription>
          Confirme el inicio del proceso de reubicación física del contenedor. El contenedor pasará
          al estado En reubicación hasta que se confirme su nueva ubicación.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <form id="start-relocation-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
          <p className="font-medium text-foreground">Detalles del contenedor:</p>
          <p className="text-muted-foreground">
            <span className="font-semibold">Ubicación actual:</span> {container.address}
          </p>
          <p className="text-muted-foreground">
            <span className="font-semibold">Capacidad:</span>{" "}
            {container.capacityLiters.toLocaleString("es-AR")} L
          </p>
          <p className="text-muted-foreground">
            <span className="font-semibold">Estado actual:</span> Activo
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Al confirmar, el contenedor figurará en estado de tránsito/reubicación y requerirá el registro
          de su nueva dirección física para volver a operar.
        </p>
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
          className="bg-[var(--color-info)] text-white hover:bg-[var(--color-info)]/90"
        >
          {isSubmitting ? "Iniciando…" : "Iniciar reubicación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
