"use client";

import { useId, useState } from "react";
import { AlertCircle, CalendarCheck2, Check, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { servicesAdapter, type Service } from "@/lib/services";

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
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
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
  const [scheduledDate, setScheduledDate] = useState(() => service.scheduledDate);
  const [windowStart, setWindowStart] = useState(() => service.windowFrom ?? "08:00");
  const [windowEnd, setWindowEnd] = useState(() => service.windowTo ?? "12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const updated = await servicesAdapter.confirmReschedule(service.id, {
        scheduledDate,
        timeWindow: { start: windowStart, end: windowEnd },
      });
      onConfirmed(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        cause instanceof Error
          ? cause.message
          : "Ocurrió un error al confirmar la nueva fecha del servicio.";
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
        <DialogTitle>Confirmar reprogramación de {service.id}</DialogTitle>
        <DialogDescription>
          Motivo registrado: <strong>{service.statusReason ?? "Sin motivo registrado"}</strong>. El
          servicio volverá a estado Programado con la fecha y ventana horaria que indique aquí.
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

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
            <MapPin className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
            <span>Zonas operativas (snapshot preservado)</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {service.zoneNames.map((zn) => (
              <span
                key={zn}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text)]"
              >
                <Check className="h-3 w-3 text-[var(--color-success)]" aria-hidden />
                {zn}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field className="sm:col-span-1">
            <FieldLabel htmlFor={`${formId}-date`}>Nueva fecha *</FieldLabel>
            <input
              id={`${formId}-date`}
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            />
          </Field>
          <Field className="sm:col-span-1">
            <FieldLabel htmlFor={`${formId}-start`}>Desde *</FieldLabel>
            <input
              id={`${formId}-start`}
              type="time"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            />
          </Field>
          <Field className="sm:col-span-1">
            <FieldLabel htmlFor={`${formId}-end`}>Hasta *</FieldLabel>
            <input
              id={`${formId}-end`}
              type="time"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            />
          </Field>
        </div>
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
              <span>Confirmando…</span>
            </>
          ) : (
            <span>Confirmar nueva fecha</span>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
