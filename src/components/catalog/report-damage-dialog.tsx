"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  containersAdapter,
  ContainerRequestError,
  DAMAGE_TYPE_LABELS,
  damageTypeSchema,
  SEVERITY_LABELS,
  severitySchema,
  type Container,
  type DamageType,
  type Severity,
} from "@/lib/containers";
import { EvidenceQueueView, useEvidenceQueue } from "./container-evidence-queue";

interface ReportDamageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

const formControlClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const damageTypes = damageTypeSchema.options;
const severities = severitySchema.options;

export function ReportDamageDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: ReportDamageDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ReportDamageModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface ReportDamageModalContentProps {
  container: Container;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Container) => void;
}

function ReportDamageModalContent({
  container,
  onOpenChange,
  onSuccess,
}: ReportDamageModalContentProps) {
  const [damageType, setDamageType] = useState<DamageType | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [requiresPublicWorks, setRequiresPublicWorks] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    damageType?: string;
    severity?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const evidenceQueue = useEvidenceQueue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const errors: { damageType?: string; severity?: string } = {};

    if (!damageType) {
      errors.damageType = "Debe seleccionar el tipo de daño.";
    }
    if (!severity) {
      errors.severity = "Debe seleccionar la severidad del daño.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.reportDamage(container.id, {
        damageType: damageType as DamageType,
        severity: severity as Severity,
        requiresPublicWorks,
      });
    } catch (err) {
      const msg =
        err instanceof ContainerRequestError || err instanceof Error
          ? err.message
          : "No se pudo registrar el reporte de daño.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    // Backend report was authoritative and succeeded
    onSuccess(updated);

    // Upload queued evidence files if any
    if (evidenceQueue.queuedFiles.length > 0) {
      const allFilesOk = await evidenceQueue.uploadAll(container.id);
      setIsSubmitting(false);
      if (allFilesOk) {
        onOpenChange(false);
      }
    } else {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <span>Novedad de mantenimiento y avería</span>
        </div>
        <DialogTitle>Reportar daño en contenedor {container.code}</DialogTitle>
        <DialogDescription>
          Registre el desperfecto o siniestro observado. Esta acción transicionará el estado a Dañado
          e informará los requerimientos de reparación.
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

      <form id="report-damage-form" onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="damage-type">Tipo de daño</FieldLabel>
            <select
              id="damage-type"
              value={damageType}
              onChange={(e) => {
                setDamageType(e.target.value as DamageType);
                if (fieldErrors.damageType) {
                  setFieldErrors((prev) => ({ ...prev, damageType: undefined }));
                }
              }}
              className={formControlClass}
              required
              aria-invalid={Boolean(fieldErrors.damageType)}
              aria-describedby={fieldErrors.damageType ? "damage-type-error" : undefined}
              disabled={isSubmitting}
            >
              <option value="">Seleccione el tipo de daño…</option>
              {damageTypes.map((t) => (
                <option key={t} value={t}>
                  {DAMAGE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {fieldErrors.damageType && (
              <FieldError id="damage-type-error">{fieldErrors.damageType}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="damage-severity">Severidad</FieldLabel>
            <select
              id="damage-severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as Severity);
                if (fieldErrors.severity) {
                  setFieldErrors((prev) => ({ ...prev, severity: undefined }));
                }
              }}
              className={formControlClass}
              required
              aria-invalid={Boolean(fieldErrors.severity)}
              aria-describedby={fieldErrors.severity ? "damage-severity-error" : undefined}
              disabled={isSubmitting}
            >
              <option value="">Seleccione la severidad…</option>
              {severities.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            {fieldErrors.severity && (
              <FieldError id="damage-severity-error">{fieldErrors.severity}</FieldError>
            )}
          </Field>

          <Field>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <input
                id="damage-public-works"
                type="checkbox"
                checked={requiresPublicWorks}
                onChange={(e) => setRequiresPublicWorks(e.target.checked)}
                disabled={isSubmitting}
                className="mt-1 size-4 rounded border-border text-primary focus:ring-ring"
              />
              <div>
                <label
                  htmlFor="damage-public-works"
                  className="text-xs font-semibold text-foreground cursor-pointer"
                >
                  Requiere intervención de Obras Públicas (M3)
                </label>
                <FieldDescription>
                  Marque si el daño involucra rotura de calzada, vereda, anclajes civiles o
                  requiere obra civil externa antes de poder restituir o reinstalar el contenedor.
                </FieldDescription>
              </div>
            </div>
          </Field>

          <EvidenceQueueView
            queuedFiles={evidenceQueue.queuedFiles}
            fileValidationError={evidenceQueue.fileValidationError}
            onFileSelect={evidenceQueue.handleFileSelect}
            onRemoveFile={evidenceQueue.removeFile}
            onRetryFile={(item) => evidenceQueue.uploadSingle(container.id, item)}
            disabled={isSubmitting}
          />
        </FieldGroup>
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
          form="report-damage-form"
          disabled={isSubmitting}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isSubmitting ? "Registrando…" : "Confirmar daño"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
