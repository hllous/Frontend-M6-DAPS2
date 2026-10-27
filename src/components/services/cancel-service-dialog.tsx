"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useId, useState } from "react";
import { useRevealFirstError } from "./use-reveal-first-error";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { servicesAdapter, type Service } from "@/lib/services";
import { MAX_REASON_LENGTH } from "@/lib/input-limits";

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
      <DialogContent className="max-w-lg">
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
  const [reasonError, setReasonError] = useState<string | null>(null);
  const formRef = useRevealFirstError<HTMLFormElement>(errorMessage, reasonError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonError("Indique el motivo.");
      setErrorMessage(null);
      return;
    }

    setIsSubmitting(true);
    setReasonError(null);
    setErrorMessage(null);
    try {
      const updated = await servicesAdapter.cancel(service.id, { reason: reason.trim() });
      onCancelled(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        getErrorMessage(cause, "No se pudo cancelar. Intente nuevamente.");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cancelar {service.title}</DialogTitle>
      </DialogHeader>

      <form ref={formRef} id={formId} noValidate onSubmit={handleSubmit} className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
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
            placeholder="Ej. Servicio duplicado"
          />
          <FieldDescription id={`${formId}-reason-help`}>Esta acción no se puede deshacer.</FieldDescription>
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
          Volver
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          variant="destructive"
        >
          {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
          <span>Confirmar cancelación</span>
        </Button>
      </DialogFooter>
    </>
  );
}
