"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useId, useState } from "react";
import { AlertCircle, CalendarClock } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { servicesAdapter, type Service } from "@/lib/services";
import { MAX_REASON_LENGTH } from "@/lib/input-limits";

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
      <DialogContent className="max-w-lg">
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
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonError("Debe indicar el motivo de la reprogramación.");
      setErrorMessage(null);
      return;
    }

    setIsSubmitting(true);
    setReasonError(null);
    setErrorMessage(null);
    try {
      const updated = await servicesAdapter.reschedule(service.id, { reason: reason.trim() });
      onRescheduled(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        getErrorMessage(cause, "Ocurrió un error al reprogramar el servicio.");
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
        <DialogTitle>Reprogramar {service.title}</DialogTitle>
        <DialogDescription>
          El servicio pasará a estado &quot;A reprogramar&quot; a la espera de una nueva fecha y ventana
          horaria. Las zonas asignadas se conservan sin cambios.
        </DialogDescription>
      </DialogHeader>

      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor={`${formId}-reason`}>
            Motivo <span className="text-[var(--color-danger)]" aria-hidden>*</span>
          </FieldLabel>
          <Textarea
            id={`${formId}-reason`}
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
              setErrorMessage(null);
            }}
            required
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? `${formId}-reason-help ${formId}-reason-error` : `${formId}-reason-help`}
            placeholder="Ej. Alerta meteorológica, rechazo de corte de calle por Tránsito…"
          />
          <FieldDescription id={`${formId}-reason-help`}>
            La nueva fecha y ventana horaria se definen en un segundo paso, una vez confirmado el motivo.
          </FieldDescription>
          {reasonError && <FieldError id={`${formId}-reason-error`}>{reasonError}</FieldError>}
        </Field>
      </form>

      <DialogFooter className="flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
          <span>Mover a reprogramar</span>
        </Button>
      </DialogFooter>
    </>
  );
}
