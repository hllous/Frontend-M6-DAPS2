"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useId, useState } from "react";
import { useRevealFirstError } from "./use-reveal-first-error";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { todayInArgentina } from "@/lib/argentina-date";
import { confirmRescheduleInputSchema, servicesAdapter, type Service } from "@/lib/services";
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
  const [scheduledDate, setScheduledDate] = useState("");
  const [minDate] = useState(() => todayInArgentina());
  const [windowStart, setWindowStart] = useState(() => service.windowFrom ?? "08:00");
  const [windowEnd, setWindowEnd] = useState(() => service.windowTo ?? "12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Si el motivo ya se registró y falló la fecha, el reintento solo confirma la fecha.
  const [reasonSaved, setReasonSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ reason?: string; date?: string; start?: string; end?: string }>({});
  const formRef = useRevealFirstError<HTMLFormElement>(errorMessage, fieldErrors);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    if (!reasonSaved && !reason.trim()) {
      setFieldErrors({ reason: "Indique el motivo." });
      return;
    }
    const input = { scheduledDate, timeWindow: { start: windowStart, end: windowEnd } };
    if (!scheduledDate) {
      setFieldErrors({ date: "Seleccione la nueva fecha." });
      return;
    }
    const validation = confirmRescheduleInputSchema.safeParse(input);
    if (!validation.success) {
      const nextErrors: typeof fieldErrors = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "scheduledDate") nextErrors.date ??= issue.message;
        else if (issue.path[0] === "timeWindow" && issue.path[1] === "start") nextErrors.start ??= issue.message;
        else if (issue.path[0] === "timeWindow" && issue.path[1] === "end") nextErrors.end ??= issue.message;
        else if (!nextErrors.start) nextErrors.start = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    if (!reasonSaved) {
      try {
        await servicesAdapter.reschedule(service.id, { reason: reason.trim() });
        setReasonSaved(true);
      } catch (cause) {
        setErrorMessage(getErrorMessage(cause, "No se pudo reprogramar. Intente nuevamente."));
        setIsSubmitting(false);
        return;
      }
    }
    try {
      const updated = await servicesAdapter.confirmReschedule(service.id, input);
      onRescheduled(updated);
      onOpenChange(false);
    } catch (cause) {
      setErrorMessage(getErrorMessage(cause, "No se pudo confirmar la fecha. Intente nuevamente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reprogramar {service.title}</DialogTitle>
      </DialogHeader>

      <form ref={formRef} id={formId} noValidate onSubmit={handleSubmit} className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(fieldErrors.reason) || undefined}>
          <FieldLabel htmlFor={`${formId}-reason`}>
            Motivo <span className="text-[var(--color-danger)]" aria-hidden>*</span>
          </FieldLabel>
          <Textarea
            id={`${formId}-reason`}
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            disabled={reasonSaved}
            onChange={(e) => {
              setReason(e.target.value);
              setFieldErrors((prev) => ({ ...prev, reason: undefined }));
              setErrorMessage(null);
            }}
            required
            aria-invalid={Boolean(fieldErrors.reason)}
            aria-describedby={fieldErrors.reason ? `${formId}-reason-error` : undefined}
            placeholder="Ej. Alerta meteorológica"
          />
          {fieldErrors.reason && <FieldError id={`${formId}-reason-error`}>{fieldErrors.reason}</FieldError>}
        </Field>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={Boolean(fieldErrors.date) || undefined}>
            <FieldLabel htmlFor={`${formId}-date`}>Nueva fecha{" "}<span aria-hidden>*</span></FieldLabel>
            <DatePicker
              id={`${formId}-date`}
              min={minDate}
              value={scheduledDate}
              onChange={(value) => { setScheduledDate(value); setFieldErrors((prev) => ({ ...prev, date: undefined })); }}
              aria-required
              invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? `${formId}-date-error` : undefined}
            />
            {fieldErrors.date && <FieldError id={`${formId}-date-error`}>{fieldErrors.date}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(fieldErrors.start) || undefined}>
            <FieldLabel id={`${formId}-start-label`} htmlFor={`${formId}-start`}>Desde{" "}<span aria-hidden>*</span></FieldLabel>
            <TimePicker
              id={`${formId}-start`}
              value={windowStart}
              onChange={(value) => { setWindowStart(value); setFieldErrors((prev) => ({ ...prev, start: undefined })); }}
              required
              invalid={Boolean(fieldErrors.start)}
              aria-labelledby={`${formId}-start-label`}
              aria-describedby={fieldErrors.start ? `${formId}-start-error` : undefined}
            />
            {fieldErrors.start && <FieldError id={`${formId}-start-error`}>{fieldErrors.start}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(fieldErrors.end) || undefined}>
            <FieldLabel id={`${formId}-end-label`} htmlFor={`${formId}-end`}>Hasta{" "}<span aria-hidden>*</span></FieldLabel>
            <TimePicker
              id={`${formId}-end`}
              value={windowEnd}
              onChange={(value) => { setWindowEnd(value); setFieldErrors((prev) => ({ ...prev, end: undefined })); }}
              required
              invalid={Boolean(fieldErrors.end)}
              aria-labelledby={`${formId}-end-label`}
              aria-describedby={fieldErrors.end ? `${formId}-end-error` : undefined}
            />
            {fieldErrors.end && <FieldError id={`${formId}-end-error`}>{fieldErrors.end}</FieldError>}
          </Field>
        </FieldGroup>
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
          <span>Reprogramar</span>
        </Button>
      </DialogFooter>
    </>
  );
}
