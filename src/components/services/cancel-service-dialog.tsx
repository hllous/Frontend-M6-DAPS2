"use client";

import { useId, useState } from "react";
import { AlertCircle, Ban, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { servicesAdapter, type Service } from "@/lib/services";

interface CancelServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onCancelled: (updatedService: Service) => void;
}

export function CancelServiceDialog({
  open,
  onOpenChange,
  service,
  onCancelled,
}: CancelServiceDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
        <CancelServiceForm
          key={service.id}
          service={service}
          onOpenChange={onOpenChange}
          onCancelled={onCancelled}
        />
      </DialogContent>
    </Dialog>
  );
}

function CancelServiceForm({
  service,
  onOpenChange,
  onCancelled,
}: {
  service: Service;
  onOpenChange: (open: boolean) => void;
  onCancelled: (updatedService: Service) => void;
}) {
  const formId = useId();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage("Debe indicar el motivo de la cancelación.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await servicesAdapter.cancel(service.id, { reason: reason.trim() });
      onCancelled(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Ocurrió un error al cancelar el servicio.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-danger)]">
          <Ban className="h-4 w-4" aria-hidden />
          <span>Cancelación de servicio</span>
        </div>
        <DialogTitle>Cancelar {service.id}</DialogTitle>
        <DialogDescription>
          El servicio pasará a estado &quot;Cancelado&quot; de forma definitiva
          {service.status === "RESCHEDULED"
            ? "; al estar a reprogramar, se cancela directamente sin requerir una nueva fecha."
            : "."}
        </DialogDescription>
      </DialogHeader>

      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor={`${formId}-reason`}>
            Motivo <span className="text-[var(--color-danger)]" aria-hidden>*</span>
          </FieldLabel>
          <textarea
            id={`${formId}-reason`}
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorMessage(null);
            }}
            required
            placeholder="Ej. Solicitud del cliente, servicio duplicado, ya no es necesario…"
            className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
          />
          <FieldDescription>Obligatorio. Esta acción no se puede deshacer.</FieldDescription>
        </Field>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Volver
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className="font-semibold bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              <span>Cancelando…</span>
            </>
          ) : (
            <span>Cancelar servicio</span>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
