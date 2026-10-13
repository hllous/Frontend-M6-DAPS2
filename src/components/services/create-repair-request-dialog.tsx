"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NetworkFailureError } from "@/lib/authenticated-fetch";
import type { EnvironmentalInspection, EnvironmentalReport } from "@/lib/environmental-reports";
import {
  clearFieldDraft,
  getFieldDraft,
  resubmitFieldAction,
  submitFieldAction,
  type FieldDraftServiceSnapshot,
} from "@/lib/field-drafts";
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
import { DraftConflictView } from "./draft-conflict-view";

const EMPTY_FORM = (sourceType: CreateRepairRequestInput["detectedInType"], sourceId: string, address = ""): CreateRepairRequestInput => ({
  damageType: "BROKEN_PAVEMENT",
  address,
  severity: "MEDIUM",
  publicSafetyRisk: false,
  detectedInType: sourceType,
  detectedInId: sourceId,
});

type Outcome = "checking" | "unsent" | "verification-failed" | null;

interface RepairRequestDraftPayload {
  input: CreateRepairRequestInput;
  composedAt: string;
}

type StoredRepairRequestPayload = CreateRepairRequestInput | RepairRequestDraftPayload;

function isRepairRequestDraftPayload(
  payload: StoredRepairRequestPayload,
): payload is RepairRequestDraftPayload {
  return "input" in payload && typeof payload.composedAt === "string";
}

function inputFromDraft(payload: StoredRepairRequestPayload): CreateRepairRequestInput {
  return isRepairRequestDraftPayload(payload) ? payload.input : payload;
}

function compositionTimeFromDraft(
  payload: StoredRepairRequestPayload,
  composedAgainst: FieldDraftServiceSnapshot,
  savedAt: string,
): string {
  if (isRepairRequestDraftPayload(payload)) return payload.composedAt;
  return composedAgainst.updatedAt ?? savedAt;
}

async function findExistingServiceRepairRequest(
  serviceId: string,
  payload: RepairRequestDraftPayload,
): Promise<RepairRequest | null> {
  const result = await repairRequestsAdapter.list({ detectedInId: serviceId });
  const composedAt = Date.parse(payload.composedAt);
  if (!Number.isFinite(composedAt)) return null;

  return result.repairRequests.find((request) => {
    const createdAt = Date.parse(request.createdAt ?? request.requestedAt);
    return request.detectedInType === "SERVICE" &&
      request.damageType === payload.input.damageType &&
      Number.isFinite(createdAt) &&
      createdAt > composedAt;
  }) ?? null;
}

export function CreateRepairRequestDialog({
  open,
  service,
  inspection,
  report,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  service?: Service;
  inspection?: EnvironmentalInspection;
  report?: EnvironmentalReport;
  onOpenChange: (open: boolean) => void;
  onCreated: (request: RepairRequest) => void;
}) {
  const isInspection = Boolean(inspection);
  const sourceId = inspection?.id ?? service?.id ?? "";
  const sourceKey = service?.id ?? inspection?.id ?? "repair-request-source";
  const serviceId = service?.id;
  const sourceLabel = inspection
    ? `Inspección ${inspection.id}${report ? ` · ${report.id}` : ""}`
    : service?.title ?? `Servicio ${sourceId}`;
  const sourceHref = inspection
    ? `/app?destination=environment&detail=${encodeURIComponent(report?.id ?? inspection.reportId)}&inspectionId=${encodeURIComponent(inspection.id)}`
    : `/app?destination=services&detail=${encodeURIComponent(sourceId)}`;
  const sourceAddress = report?.address ?? report?.location?.address ?? "";
  const formId = useId();
  const initialDraft = getFieldDraft<StoredRepairRequestPayload>(sourceKey, "repairRequest");
  const [values, setValues] = useState<CreateRepairRequestInput>(() => {
    return initialDraft
      ? inputFromDraft(initialDraft.payload)
      : EMPTY_FORM(isInspection ? "INSPECTION" : "SERVICE", sourceId, sourceAddress);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(() => initialDraft ? "checking" : null);
  const [createdRequest, setCreatedRequest] = useState<RepairRequest | null>(null);
  const [alreadyRegisteredRequest, setAlreadyRegisteredRequest] = useState<RepairRequest | null>(null);
  const [composedAgainst, setComposedAgainst] = useState<FieldDraftServiceSnapshot | null>(
    () => initialDraft?.composedAgainst ?? null,
  );
  const [conflict, setConflict] = useState<{
    current: Service;
    composedAgainst: FieldDraftServiceSnapshot;
  } | null>(null);

  const showAlreadyRegistered = useCallback((request: RepairRequest) => {
    clearFieldDraft(sourceKey, "repairRequest");
    setAlreadyRegisteredRequest(request);
    setCreatedRequest(null);
    setComposedAgainst(null);
    setConflict(null);
    setOutcome(null);
    setErrors({});
    onCreated(request);
  }, [onCreated, sourceKey]);

  async function verifyLostResponse(payload: RepairRequestDraftPayload) {
    if (!service) return;
    setOutcome("checking");
    try {
      const existing = await findExistingServiceRepairRequest(service.id, payload);
      if (existing) {
        showAlreadyRegistered(existing);
        return;
      }
      setOutcome("unsent");
    } catch {
      setOutcome("verification-failed");
      setErrors({
        form: "No se pudo verificar si la derivación ya quedó registrada. Verifique el estado antes de volver a enviarla.",
      });
    }
  }

  useEffect(() => {
    if (!open || !serviceId) return;
    const draft = getFieldDraft<StoredRepairRequestPayload>(serviceId, "repairRequest");
    if (!draft) return;

    let isCurrent = true;
    const payload: RepairRequestDraftPayload = {
      input: inputFromDraft(draft.payload),
      composedAt: compositionTimeFromDraft(draft.payload, draft.composedAgainst, draft.savedAt),
    };
    void findExistingServiceRepairRequest(serviceId, payload)
      .then((existing) => {
        if (!isCurrent) return;
        if (existing) {
          showAlreadyRegistered(existing);
        } else {
          setOutcome("unsent");
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        setOutcome("verification-failed");
        setErrors({
          form: "No se pudo verificar si la derivación ya quedó registrada. Verifique el estado antes de volver a enviarla.",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [open, serviceId, sourceKey, showAlreadyRegistered]);

  function restoreDraft() {
    const draft = getFieldDraft<StoredRepairRequestPayload>(sourceKey, "repairRequest");
    setValues(draft
      ? inputFromDraft(draft.payload)
      : EMPTY_FORM(isInspection ? "INSPECTION" : "SERVICE", sourceId, sourceAddress));
    setOutcome(draft ? (service ? "checking" : "unsent") : null);
    setCreatedRequest(null);
    setAlreadyRegisteredRequest(null);
    setComposedAgainst(draft?.composedAgainst ?? null);
    setConflict(null);
    setErrors({});
  }

  function updateValue<K extends keyof CreateRepairRequestInput>(key: K, value: CreateRepairRequestInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
    if (!composedAgainst) setOutcome(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    const storedDraft = service
      ? getFieldDraft<StoredRepairRequestPayload>(sourceKey, "repairRequest")
      : null;
    if (!storedDraft) setOutcome(null);
    const parsed = createRepairRequestInputSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0] ?? "form")] = issue.message;
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (service) {
        const payload: RepairRequestDraftPayload = {
          input: parsed.data,
          composedAt: storedDraft
            ? compositionTimeFromDraft(
                storedDraft.payload,
                storedDraft.composedAgainst,
                storedDraft.savedAt,
              )
            : new Date().toISOString(),
        };

        if (storedDraft) {
          setOutcome("checking");
          let existing: RepairRequest | null;
          try {
            existing = await findExistingServiceRepairRequest(service.id, payload);
          } catch {
            setOutcome("verification-failed");
            setErrors({
              form: "No se pudo verificar si la derivación ya quedó registrada. Verifique el estado antes de volver a enviarla.",
            });
            return;
          }
          if (existing) {
            showAlreadyRegistered(existing);
            return;
          }

          const result = await resubmitFieldAction({
            serviceId: service.id,
            actionType: "repairRequest",
            composedAgainst: storedDraft.composedAgainst,
            payload,
            submit: (draftPayload) => repairRequestsAdapter.create(draftPayload.input),
          });
          if (result.kind === "success") {
            setOutcome(null);
            setComposedAgainst(null);
            setCreatedRequest(result.result);
            onCreated(result.result);
          } else if (result.kind === "conflict") {
            setOutcome("unsent");
            setConflict({ current: result.current, composedAgainst: result.composedAgainst });
          } else if (result.kind === "still-offline") {
            await verifyLostResponse(payload);
          } else {
            setOutcome("unsent");
            setErrors({ form: result.message });
          }
          return;
        }

        const result = await submitFieldAction({
          service,
          actionType: "repairRequest",
          payload,
          submit: (draftPayload) => repairRequestsAdapter.create(draftPayload.input),
        });
        if (result.kind === "success") {
          setCreatedRequest(result.result);
          onCreated(result.result);
        } else if (result.kind === "draft-saved") {
          setValues(result.draft.payload.input);
          setComposedAgainst(result.draft.composedAgainst);
          await verifyLostResponse(result.draft.payload);
        } else {
          setErrors({ form: result.message });
        }
      } else {
        const created = await repairRequestsAdapter.create(parsed.data);
        setCreatedRequest(created);
        onCreated(created);
      }
    } catch (cause) {
      if (!service && cause instanceof NetworkFailureError) {
        setValues(parsed.data);
        setOutcome("unsent");
      } else {
        setErrors({ form: cause instanceof Error ? cause.message : "No se pudo crear la derivación." });
      }
    } finally {
      setIsSubmitting(false);
    }
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
  const resolvedRequest = createdRequest ?? alreadyRegisteredRequest;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear derivación de reparación</DialogTitle>
          <DialogDescription>
            {isInspection
              ? "Registre el daño de infraestructura observado durante la inspección. La inspección permanece como fuente canónica de la derivación."
              : "Registre el daño de infraestructura que será referido a M3. La derivación conserva al Servicio como su Referral context."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-[var(--color-text)]">{isInspection ? "Contexto de origen" : "Referral context: Servicio"} {sourceId}</p>
              <p className="mt-1 truncate text-[var(--color-text-secondary)]">{sourceLabel}</p>
              <a
                className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--color-action)] hover:underline"
                href={sourceHref}
              >
                {isInspection ? "Ver inspección fuente" : "Ver Servicio fuente"} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {outcome && (
          <div role="status" className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-warning)]">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <span>
                {outcome === "checking"
                  ? "Verificando el estado de la derivación"
                  : outcome === "verification-failed"
                    ? "No se pudo verificar el estado"
                    : isInspection
                      ? "Derivación sin enviar"
                      : "Unsent referral"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              {outcome === "checking"
                ? "Comprobando si el Servicio ya tiene una derivación de este tipo."
                : outcome === "verification-failed"
                  ? "No vuelva a enviar hasta confirmar si la derivación quedó registrada."
                  : isInspection
                    ? "No se recibió confirmación del envío. Los valores quedaron retenidos en este dispositivo."
                    : "No se recibió confirmación del envío y no se encontró una derivación del mismo tipo creada desde que se preparó el borrador."}
            </p>
          </div>
        )}

        {resolvedRequest && (
          <div role="status" className="rounded-xl border border-[var(--color-success-line)] bg-[var(--color-success-fill)]/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span>
                {alreadyRegisteredRequest
                  ? "Derivación ya registrada."
                  : "Derivación creada y pendiente de respuesta de M3."}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              Seguimiento {resolvedRequest.id} · {isInspection ? `Inspección ${sourceId}` : `Servicio ${sourceId}`}
            </p>
          </div>
        )}

        {errors.form && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/50 p-3 text-sm text-[var(--color-danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errors.form}</span>
          </div>
        )}

        {!resolvedRequest && !conflict && (
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

        {!resolvedRequest && conflict && (
          <DraftConflictView
            serviceId={sourceId}
            actionLabel="derivación de reparación"
            composedAgainst={conflict.composedAgainst}
            current={conflict.current}
            onPreserve={() => {
              setConflict(null);
              setOutcome("unsent");
            }}
            onDiscard={() => {
              clearFieldDraft(sourceKey, "repairRequest");
              setValues(EMPTY_FORM(isInspection ? "INSPECTION" : "SERVICE", sourceId, sourceAddress));
              setComposedAgainst(null);
              setConflict(null);
              setOutcome(null);
              setErrors({});
            }}
          />
        )}

        <DialogFooter>
          {resolvedRequest ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>Cerrar confirmación</Button>
          ) : (
            <Button type="submit" form={formId} disabled={isSubmitting || outcome === "checking" || Boolean(conflict)} className="min-h-10">
              {(isSubmitting || outcome === "checking") && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSubmitting
                ? "Verificando y enviando..."
                : outcome === "checking"
                  ? "Verificando estado..."
                  : composedAgainst
                    ? "Verificar y reenviar derivación"
                    : "Crear derivación a M3"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
