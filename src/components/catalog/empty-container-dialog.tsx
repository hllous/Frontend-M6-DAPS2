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
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-success)]">
          <CheckCircle2 className="size-4" aria-hidden />
          <span>Despacho operativo de vaciado</span>
        </div>
        <DialogTitle>
          Registrar vaciado de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          Confirme el vaciado del contenedor desbordado para restituirlo a
          estado Activo.
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
        <Alert role="note">
          <AlertDescription className="grid gap-2">
            <p className="font-medium text-foreground">
              Detalles del contenedor:
            </p>
            <p className="text-muted-foreground">
              <span className="font-semibold">Ubicación:</span>{" "}
              {container.address ?? "Sin dirección registrada"}
            </p>
            <p className="text-muted-foreground">
              <span className="font-semibold">Capacidad:</span>{" "}
              {container.capacityLiters.toLocaleString("es-AR")} L
            </p>
            <p className="text-muted-foreground">
              <span className="font-semibold">Estado actual:</span> Desbordado
            </p>
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
