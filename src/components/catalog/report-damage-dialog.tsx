"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

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
  FieldContent,
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
import {
  EvidenceQueueView,
  useEvidenceQueue,
} from "./container-evidence-queue";

interface ReportDamageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

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
      const msg = getErrorMessage(
        err,
        "No se pudo registrar el reporte de daño.",
      );
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
          Registre el desperfecto o siniestro observado. Esta acción
          transicionará el estado a Dañado e informará los requerimientos de
          reparación.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="report-damage-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain"
      >
        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.damageType)}>
            <FieldLabel htmlFor="damage-type">Tipo de daño</FieldLabel>
            <Select
              items={{
                "": "Seleccione el tipo de daño…",
                ...DAMAGE_TYPE_LABELS,
              }}
              value={damageType}
              onValueChange={(value) => {
                setDamageType((value ?? "") as DamageType);
                if (fieldErrors.damageType) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    damageType: undefined,
                  }));
                }
              }}
              required
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="damage-type"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.damageType)}
                aria-describedby={
                  fieldErrors.damageType ? "damage-type-error" : undefined
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Seleccione el tipo de daño…</SelectItem>
                  {damageTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DAMAGE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldErrors.damageType && (
              <FieldError id="damage-type-error">
                {fieldErrors.damageType}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={Boolean(fieldErrors.severity)}>
            <FieldLabel htmlFor="damage-severity">Severidad</FieldLabel>
            <Select
              items={{ "": "Seleccione la severidad…", ...SEVERITY_LABELS }}
              value={severity}
              onValueChange={(value) => {
                setSeverity((value ?? "") as Severity);
                if (fieldErrors.severity) {
                  setFieldErrors((prev) => ({ ...prev, severity: undefined }));
                }
              }}
              required
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="damage-severity"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.severity)}
                aria-describedby={
                  fieldErrors.severity ? "damage-severity-error" : undefined
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Seleccione la severidad…</SelectItem>
                  {severities.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldErrors.severity && (
              <FieldError id="damage-severity-error">
                {fieldErrors.severity}
              </FieldError>
            )}
          </Field>

          <Field
            orientation="horizontal"
            className="items-start rounded-lg border border-border p-4"
          >
            <Checkbox
              id="damage-public-works"
              checked={requiresPublicWorks}
              onCheckedChange={(checked) => setRequiresPublicWorks(checked)}
              disabled={isSubmitting}
            />
            <FieldContent>
              <FieldLabel htmlFor="damage-public-works">
                Requiere intervención de Obras Públicas (M3)
              </FieldLabel>
              <FieldDescription>
                Marque si el daño involucra rotura de calzada, vereda,
                anclajes civiles o requiere obra civil externa antes de poder
                restituir o reinstalar el contenedor.
              </FieldDescription>
            </FieldContent>
          </Field>

          <EvidenceQueueView
            queuedFiles={evidenceQueue.queuedFiles}
            fileValidationError={evidenceQueue.fileValidationError}
            onFileSelect={evidenceQueue.handleFileSelect}
            onRemoveFile={evidenceQueue.removeFile}
            onRetryFile={(item) =>
              evidenceQueue.uploadSingle(container.id, item)
            }
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
          variant="destructive-solid"
        >
          {isSubmitting ? "Registrando…" : "Confirmar daño"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
