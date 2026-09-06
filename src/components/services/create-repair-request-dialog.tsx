"use client";

import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getFieldDraft, submitFieldAction } from "@/lib/field-drafts";
import {
  createRepairRequestInputSchema,
  REPAIR_DAMAGE_TYPE_LABEL,
  REPAIR_SEVERITY_LABEL,
  repairRequestsAdapter,
  type CreateRepairRequestInput,
  type RepairDamageType,
  type RepairRequest,
  type RepairSeverity,
} from "@/lib/repair-requests";
import type { Service } from "@/lib/services";

const EMPTY_FORM = (service: Service): CreateRepairRequestInput => ({
  damageType: "BROKEN_PAVEMENT",
  address: "",
  severity: "MEDIUM",
  publicSafetyRisk: false,
  detectedInType: "SERVICE",
  detectedInId: service.id,
});

type Outcome = "unsent" | null;

export function CreateRepairRequestDialog({
  open,
  service,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  service: Service;
  onOpenChange: (open: boolean) => void;
  onCreated: (request: RepairRequest) => void;
}) {
  const formId = useId();
  const [values, setValues] = useState<CreateRepairRequestInput>(() => {
    const draft = getFieldDraft<CreateRepairRequestInput>(service.id, "repairRequest");
    return draft?.payload ?? EMPTY_FORM(service);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(() => (
    getFieldDraft<CreateRepairRequestInput>(service.id, "repairRequest") ? "unsent" : null
  ));
  const [createdRequest, setCreatedRequest] = useState<RepairRequest | null>(null);

  function restoreDraft() {
    const draft = getFieldDraft<CreateRepairRequestInput>(service.id, "repairRequest");
    setValues(draft?.payload ?? EMPTY_FORM(service));
    setOutcome(draft ? "unsent" : null);
    setCreatedRequest(null);
    setErrors({});
  }

  function updateValue<K extends keyof CreateRepairRequestInput>(key: K, value: CreateRepairRequestInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setOutcome(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setOutcome(null);
    const parsed = createRepairRequestInputSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0] ?? "form")] = issue.message;
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await submitFieldAction({
      service,
      actionType: "repairRequest",
      payload: parsed.data,
      submit: repairRequestsAdapter.create,
    });
    if (result.kind === "success") {
      setCreatedRequest(result.result);
      onCreated(result.result);
    } else if (result.kind === "draft-saved") {
      setValues(result.draft.payload);
      setOutcome("unsent");
    } else {
      setErrors({ form: result.message });
    }
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      restoreDraft();
    } else {
      setIsSubmitting(false);
      setErrors({});
    }
    onOpenChange(nextOpen);
  }

  const inputClass = "min-h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear derivación de reparación</DialogTitle>
          <DialogDescription>
            Registre el daño de infraestructura que será referido a M3. La derivación conserva al Servicio como su Referral context.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-[var(--color-text)]">Referral context: Servicio {service.id}</p>
              <p className="mt-1 truncate text-[var(--color-text-secondary)]">{service.title}</p>
              <a
                className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--color-action)] hover:underline"
                href={`/app?destination=services&detail=${encodeURIComponent(service.id)}`}
              >
                Ver Servicio fuente <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {outcome === "unsent" && (
          <div role="status" className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-warning)]">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <span>Unsent referral</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              No se creó un registro de seguimiento porque el envío falló. Los valores quedaron retenidos en este dispositivo; revise la conexión y envíe la derivación manualmente.
            </p>
          </div>
        )}

        {createdRequest && (
          <div role="status" className="rounded-xl border border-[var(--color-success-line)] bg-[var(--color-success-fill)]/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span>Derivación creada y pendiente de respuesta de M3.</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              Seguimiento {createdRequest.id} · Servicio {service.id}
            </p>
          </div>
        )}

        {errors.form && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/50 p-3 text-sm text-[var(--color-danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errors.form}</span>
          </div>
        )}

        {!createdRequest && (
          <form id={formId} noValidate onSubmit={handleSubmit} className="py-2">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="repair-damage-type">Tipo de daño *</FieldLabel>
                <select id="repair-damage-type" className={inputClass} value={values.damageType} onChange={(event) => updateValue("damageType", event.target.value as RepairDamageType)} aria-invalid={Boolean(errors.damageType)} aria-describedby={errors.damageType ? "repair-damage-type-error" : undefined}>
                  {Object.entries(REPAIR_DAMAGE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errors.damageType && <FieldError id="repair-damage-type-error">{errors.damageType}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="repair-address">Ubicación del daño *</FieldLabel>
                <input id="repair-address" className={inputClass} value={values.address} onChange={(event) => updateValue("address", event.target.value)} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "repair-address-error" : undefined} />
                {errors.address ? <FieldError id="repair-address-error">{errors.address}</FieldError> : <FieldDescription>Indique una dirección o referencia legible para M3.</FieldDescription>}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="repair-severity">Severidad *</FieldLabel>
                  <select id="repair-severity" className={inputClass} value={values.severity} onChange={(event) => updateValue("severity", event.target.value as RepairSeverity)} aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? "repair-severity-error" : undefined}>
                    {Object.entries(REPAIR_SEVERITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {errors.severity && <FieldError id="repair-severity-error">{errors.severity}</FieldError>}
                </Field>

                <fieldset aria-describedby={errors.publicSafetyRisk ? "repair-risk-error" : "repair-risk-description"}>
                  <legend className="text-sm font-semibold">¿Implica riesgo para la seguridad pública? *</legend>
                  <div className="mt-2 grid gap-2">
                    {[{ value: "true", label: "Sí, implica riesgo para la seguridad pública" }, { value: "false", label: "No implica riesgo para la seguridad pública" }].map((option) => (
                      <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-text)]">
                        <input type="radio" name="repair-public-safety-risk" value={option.value} checked={values.publicSafetyRisk === (option.value === "true")} onChange={() => updateValue("publicSafetyRisk", option.value === "true")} />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <FieldDescription id="repair-risk-description">Este dato se registra de forma independiente a la severidad.</FieldDescription>
                  {errors.publicSafetyRisk && <FieldError id="repair-risk-error">{errors.publicSafetyRisk}</FieldError>}
                </fieldset>
              </div>
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          {createdRequest ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>Cerrar confirmación</Button>
          ) : (
            <Button type="submit" form={formId} disabled={isSubmitting} className="min-h-10">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSubmitting ? "Creando derivación..." : "Crear derivación a M3"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
