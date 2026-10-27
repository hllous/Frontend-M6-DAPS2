"use client";
import { errorMessage } from "@/lib/error-message";

import { useCallback, useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { notifyError, notifySuccess } from "@/components/ui/feedback";
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
    notifySuccess("Ya estaba derivada.");
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
        form: "No se pudo confirmar el envío. Verifique antes de reenviar.",
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
          form: "No se pudo confirmar el envío. Verifique antes de reenviar.",
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
              form: "No se pudo confirmar el envío. Verifique antes de reenviar.",
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
            notifySuccess("Derivación creada.");
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
          notifySuccess("Derivación creada.");
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
        notifySuccess("Derivación creada.");
      }
    } catch (cause) {
      if (!service && cause instanceof NetworkFailureError) {
        setValues(parsed.data);
        setOutcome("unsent");
      } else {
        const message = errorMessage(cause, "No se pudo derivar. Intente nuevamente.");
        setErrors({ form: message });
        notifyError(message);
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

  const resolvedRequest = createdRequest ?? alreadyRegisteredRequest;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Derivar a Obras Públicas</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-[var(--color-text)]">{isInspection ? "Contexto de origen" : "Servicio"} {sourceId}</p>
              <p className="mt-1 truncate text-[var(--color-text-secondary)]">{sourceLabel}</p>
              <a
                className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--color-action)] hover:underline"
                href={sourceHref}
              >
                {isInspection ? "Ver inspección" : "Ver servicio"} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {outcome && (
          <Alert variant="warning" role="status">
            <AlertCircle aria-hidden />
            <AlertTitle>
                {outcome === "checking"
                  ? "Verificando…"
                  : outcome === "verification-failed"
                    ? "No se pudo verificar"
                    : "Sin enviar"}
            </AlertTitle>
            {outcome !== "checking" && (
              <AlertDescription>No se pudo confirmar el envío. Verifique antes de reenviar.</AlertDescription>
            )}
          </Alert>
        )}

        {resolvedRequest && (
          <Alert variant="success" role="status">
            <CheckCircle2 aria-hidden />
            <AlertTitle>
                {alreadyRegisteredRequest
                  ? "Ya estaba derivada."
                  : "Derivada a Obras Públicas."}
            </AlertTitle>
            <AlertDescription>
              Seguimiento {resolvedRequest.id} · {isInspection ? `Inspección ${sourceId}` : `Servicio ${sourceId}`}
            </AlertDescription>
          </Alert>
        )}

        {errors.form && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {!resolvedRequest && !conflict && (
          <form id={formId} noValidate onSubmit={handleSubmit} className="py-2">
            <FieldGroup>
              <Field data-invalid={Boolean(errors.damageType) || undefined}>
                <FieldLabel htmlFor="repair-damage-type">Tipo de daño *</FieldLabel>
                <Select value={values.damageType} onValueChange={(value) => updateValue("damageType", value as RepairDamageType)}>
                  <SelectTrigger id="repair-damage-type" aria-invalid={Boolean(errors.damageType) || undefined} aria-describedby={errors.damageType ? "repair-damage-type-error" : undefined}>
                    <SelectValue>{REPAIR_DAMAGE_TYPE_LABEL[values.damageType]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(REPAIR_DAMAGE_TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.damageType && <FieldError id="repair-damage-type-error">{errors.damageType}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.address) || undefined}>
                <FieldLabel htmlFor="repair-address">Ubicación del daño *</FieldLabel>
                <Input id="repair-address" value={values.address} onChange={(event) => updateValue("address", event.target.value)} aria-invalid={Boolean(errors.address) || undefined} aria-describedby={errors.address ? "repair-address-error" : undefined} />
                {errors.address ? <FieldError id="repair-address-error">{errors.address}</FieldError> : null}
              </Field>

              <FieldGroup className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.severity) || undefined}>
                  <FieldLabel htmlFor="repair-severity">Severidad *</FieldLabel>
                  <Select value={values.severity} onValueChange={(value) => updateValue("severity", value as RepairSeverity)}>
                    <SelectTrigger id="repair-severity" aria-invalid={Boolean(errors.severity) || undefined} aria-describedby={errors.severity ? "repair-severity-error" : undefined}>
                      <SelectValue>{REPAIR_SEVERITY_LABEL[values.severity]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(REPAIR_SEVERITY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.severity && <FieldError id="repair-severity-error">{errors.severity}</FieldError>}
                </Field>

                <FieldSet data-invalid={Boolean(errors.publicSafetyRisk) || undefined}>
                  <FieldLegend id="repair-risk-label">Riesgo para la seguridad pública *</FieldLegend>
                  <RadioGroup
                    value={String(values.publicSafetyRisk)}
                    onValueChange={(value) => updateValue("publicSafetyRisk", value === "true")}
                    aria-labelledby="repair-risk-label"
                    aria-describedby={errors.publicSafetyRisk ? "repair-risk-error" : undefined}
                    aria-invalid={Boolean(errors.publicSafetyRisk) || undefined}
                  >
                    <FieldLabel htmlFor="repair-public-safety-risk-true" className="min-h-11 flex-row items-center rounded-lg border px-3">
                      <RadioGroupItem id="repair-public-safety-risk-true" value="true" />
                      Sí
                    </FieldLabel>
                    <FieldLabel htmlFor="repair-public-safety-risk-false" className="min-h-11 flex-row items-center rounded-lg border px-3">
                      <RadioGroupItem id="repair-public-safety-risk-false" value="false" />
                      No
                    </FieldLabel>
                  </RadioGroup>
                  {errors.publicSafetyRisk && <FieldError id="repair-risk-error">{errors.publicSafetyRisk}</FieldError>}
                </FieldSet>
              </FieldGroup>
            </FieldGroup>
          </form>
        )}

        {!resolvedRequest && conflict && (
          <DraftConflictView
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
            <Button type="button" onClick={() => handleOpenChange(false)}>Cerrar</Button>
          ) : (
            <Button type="submit" form={formId} disabled={isSubmitting || outcome === "checking" || Boolean(conflict)}>
              {(isSubmitting || outcome === "checking") && <Spinner data-icon="inline-start" aria-hidden />}
              {isSubmitting
                ? "Enviando…"
                : outcome === "checking"
                  ? "Verificando…"
                  : composedAgainst
                    ? "Verificar y reenviar"
                    : "Derivar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
