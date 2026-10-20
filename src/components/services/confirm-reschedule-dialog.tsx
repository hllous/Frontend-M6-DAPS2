"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useId, useState } from "react";
import { AlertCircle, CalendarCheck2, Check, MapPin } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { TimePicker } from "@/components/ui/time-picker";
import { todayInArgentina } from "@/lib/argentina-date";
import { confirmRescheduleInputSchema, servicesAdapter, type Service } from "@/lib/services";

interface ConfirmRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onConfirmed: (updatedService: Service) => void;
}

export function ConfirmRescheduleDialog({
  open,
  onOpenChange,
  service,
  onConfirmed,
}: ConfirmRescheduleDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <ConfirmRescheduleForm
          key={service.id}
          service={service}
          onOpenChange={onOpenChange}
          onConfirmed={onConfirmed}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRescheduleForm({
  service,
  onOpenChange,
  onConfirmed,
}: {
  service: Service;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (updatedService: Service) => void;
}) {
  const formId = useId();
  // Sin prefill: la fecha actual del servicio puede ser pasada y el backend la rechaza.
  const [scheduledDate, setScheduledDate] = useState("");
  const [minDate] = useState(() => todayInArgentina());
  const [windowStart, setWindowStart] = useState(() => service.windowFrom ?? "08:00");
  const [windowEnd, setWindowEnd] = useState(() => service.windowTo ?? "12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ date?: string; start?: string; end?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    const input = { scheduledDate, timeWindow: { start: windowStart, end: windowEnd } };
    if (!scheduledDate) {
      setFieldErrors({ date: "Seleccione la nueva fecha del servicio." });
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
    try {
      const updated = await servicesAdapter.confirmReschedule(service.id, input);
      onConfirmed(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        getErrorMessage(cause, "Ocurrió un error al confirmar la nueva fecha del servicio.");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-action)]">
          <CalendarCheck2 className="h-4 w-4" aria-hidden />
          <span>Paso 2 de 2 · Nueva fecha y ventana</span>
        </div>
        <DialogTitle>Confirmar reprogramación de {service.title}</DialogTitle>
        <DialogDescription>
          Motivo registrado: <strong>{service.statusReason ?? "Sin motivo registrado"}</strong>. El
          servicio volverá a estado Programado con la fecha y ventana horaria que indique aquí.
        </DialogDescription>
      </DialogHeader>

      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>
              <MapPin className="size-4 text-primary" aria-hidden />
              Zonas operativas (snapshot preservado)
            </ItemTitle>
            <ul className="flex flex-wrap gap-1.5" aria-label="Zonas operativas">
              {service.zoneNames.map((zn) => (
                <li key={zn}>
                  <Badge variant="neutral">
                    <Check aria-hidden />
                    {zn}
                  </Badge>
                </li>
              ))}
            </ul>
          </ItemContent>
        </Item>

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
          <span>Confirmar nueva fecha</span>
        </Button>
      </DialogFooter>
    </>
  );
}
