"use client";

import { useId, useState } from "react";
import { AlertCircle, CalendarClock, Loader2 } from "lucide-react";

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

interface RescheduleReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onRescheduled: (updatedService: Service) => void;
}

export function RescheduleReasonDialog({
  open,
  onOpenChange,
  service,
  onRescheduled,
}: RescheduleReasonDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
        <RescheduleReasonForm
          key={service.id}
          service={service}
          onOpenChange={onOpenChange}
          onRescheduled={onRescheduled}
        />
      </DialogContent>
    </Dialog>
  );
}

function RescheduleReasonForm({
  service,
  onOpenChange,
  onRescheduled,
}: {
  service: Service;
  onOpenChange: (open: boolean) => void;
  onRescheduled: (updatedService: Service) => void;
}) {
  const formId = useId();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage("Debe indicar el motivo de la reprogramación.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await servicesAdapter.reschedule(service.id, { reason: reason.trim() });
      onRescheduled(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Ocurrió un error al reprogramar el servicio.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
          <CalendarClock className="h-4 w-4" aria-hidden />
          <span>Paso 1 de 2 · Motivo de reprogramación</span>
        </div>
        <DialogTitle>Reprogramar {service.id}</DialogTitle>
        <DialogDescription>
          El servicio pasará a estado &quot;A reprogramar&quot; a la espera de una nueva fecha y ventana
          horaria. Las zonas asignadas se conservan sin cambios.
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
            placeholder="Ej. Alerta meteorológica, rechazo de corte de calle por Tránsito…"
            className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
          />
          <FieldDescription>
            La nueva fecha y ventana horaria se definen en un segundo paso, una vez confirmado el motivo.
          </FieldDescription>
        </Field>
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
        <Button type="submit" form={formId} disabled={isSubmitting} className="font-semibold">
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              <span>Reprogramando…</span>
            </>
          ) : (
            <span>Mover a reprogramar</span>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
