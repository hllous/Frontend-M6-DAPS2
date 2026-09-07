"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  FileCheck,
  Paperclip,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NetworkFailureError } from "@/lib/authenticated-fetch";
import {
  environmentalInspectionCompleteInputSchema,
  environmentalInspectionOutcomeSchema,
  environmentalInspectionSeveritySchema,
  environmentalInspectionSuggestedActionSchema,
  environmentalInspectionViolationTypeSchema,
  environmentalReportsAdapter,
  type EnvironmentalInspection,
  type EnvironmentalInspectionCompleteInput,
} from "@/lib/environmental-reports";
import {
  clearFieldDraft,
  getFieldDraft,
  resubmitFieldAction,
  submitFieldAction,
  type FieldDraftServiceSnapshot,
} from "@/lib/field-drafts";
import { servicesAdapter, ServiceRequestError, type Service } from "@/lib/services";
import { DraftConflictView } from "./draft-conflict-view";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type QueuedEvidenceFile = {
  id: string;
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  error?: string;
};

type InspectionCompletionDraftPayload = EnvironmentalInspectionCompleteInput;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

const OUTCOME_LABELS: Record<EnvironmentalInspectionCompleteInput["outcome"], string> = {
  NO_VIOLATION: "Sin infracciÃ³n",
  VIOLATION_FOUND: "InfracciÃ³n constatada",
  INCONCLUSIVE: "Inconclusa",
};

const NEXT_STEP_LABELS: Record<NonNullable<EnvironmentalInspection["nextStep"]>, string> = {
  NOTICE_TO_BE_ISSUED: "Aviso a emitir por Oficina",
  REINSPECTION: "ReinspecciÃ³n",
  CASE_CLOSED: "Cierre del expediente",
};

const VIOLATION_TYPE_LABELS: Record<EnvironmentalInspectionCompleteInput["violationType"] & string, string> = {
  NOISE_LIMIT: "Exceso de ruido",
  ILLEGAL_DUMPING: "Vertido ilegal",
  UNTREATED_DISCHARGE: "Descarga sin tratamiento",
  HAZARDOUS_WASTE: "Residuos peligrosos",
  AIR_EMISSION: "EmisiÃ³n al aire",
  NO_WASTE_MANAGEMENT: "Falta de gestiÃ³n de residuos",
  INSPECTION_OBSTRUCTION: "ObstrucciÃ³n de la inspecciÃ³n",
};

const SEVERITY_LABELS: Record<EnvironmentalInspectionCompleteInput["severity"] & string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "CrÃ­tica",
};

const SUGGESTED_ACTION_LABELS: Record<EnvironmentalInspectionCompleteInput["suggestedAction"] & string, string> = {
  WARNING: "Advertencia",
  FORMAL_NOTICE: "Aviso formal",
  FINE: "Multa",
  CLOSURE: "Clausura",
};

function randomIdempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues.map((issue) => issue.message).join(" ");
}

function resultPayload(
  inspection: EnvironmentalInspection,
  checkedItems: Record<string, boolean>,
  outcome: EnvironmentalInspectionCompleteInput["outcome"],
  conclusion: string,
  findings: string,
  violationType: EnvironmentalInspectionCompleteInput["violationType"],
  severity: EnvironmentalInspectionCompleteInput["severity"],
  suggestedAction: EnvironmentalInspectionCompleteInput["suggestedAction"],
): InspectionCompletionDraftPayload {
  return {
    outcome,
    checklist: inspection.checklist.map((item) => ({ id: item.id, completed: checkedItems[item.id] === true })),
    ...(conclusion.trim() ? { conclusion: conclusion.trim() } : {}),
    ...(findings.trim() ? { findings: findings.trim() } : {}),
    ...(violationType ? { violationType } : {}),
    ...(severity ? { severity } : {}),
    ...(suggestedAction ? { suggestedAction } : {}),
  };
}

export function InspectionExecutionPanel({
  service,
  canExecute = false,
  onServiceUpdated,
}: {
  service: Service;
  canExecute?: boolean;
  onServiceUpdated?: (updated: Service) => void;
}) {
  const inputId = useId();
  const [savedDraft] = useState(() => getFieldDraft<InspectionCompletionDraftPayload>(service.id, "inspectionCompletion"));
  const inspectionId = service.inspectionId;
  const [inspection, setInspection] = useState<EnvironmentalInspection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<EnvironmentalInspectionCompleteInput["outcome"]>(savedDraft?.payload.outcome ?? "NO_VIOLATION");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(savedDraft?.payload.checklist.map((item) => [item.id, item.completed]) ?? []),
  );
  const [conclusion, setConclusion] = useState(savedDraft?.payload.conclusion ?? "");
  const [findings, setFindings] = useState(savedDraft?.payload.findings ?? "");
  const [violationType, setViolationType] = useState<EnvironmentalInspectionCompleteInput["violationType"]>(savedDraft?.payload.violationType);
  const [severity, setSeverity] = useState<EnvironmentalInspectionCompleteInput["severity"]>(savedDraft?.payload.severity);
  const [suggestedAction, setSuggestedAction] = useState<EnvironmentalInspectionCompleteInput["suggestedAction"]>(savedDraft?.payload.suggestedAction);
  const [queuedFiles, setQueuedFiles] = useState<QueuedEvidenceFile[]>([]);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composedAgainst, setComposedAgainst] = useState<FieldDraftServiceSnapshot | null>(savedDraft?.composedAgainst ?? null);
  const [conflict, setConflict] = useState<{
    current: Service;
    composedAgainst: FieldDraftServiceSnapshot;
  } | null>(null);

  useEffect(() => {
    let current = true;
    if (!inspectionId) {
      return () => {
        current = false;
      };
    }

    void environmentalReportsAdapter.getInspection(inspectionId)
      .then((loaded) => {
        if (!current) return;
        setInspection(loaded);
        if (!savedDraft) {
          setCheckedItems(Object.fromEntries(loaded.checklist.map((item) => [item.id, false])));
        }
      })
      .catch((error: unknown) => {
        if (current) setLoadError(error instanceof Error ? error.message : "No se pudo cargar la inspecciÃ³n ambiental.");
      });

    return () => {
      current = false;
    };
  }, [inspectionId, savedDraft]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const errors: string[] = [];
    const accepted: QueuedEvidenceFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`\"${file.name}\" supera el tamaÃ±o mÃ¡ximo permitido de 10 MB.`);
        continue;
      }
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        errors.push(`\"${file.name}\" tiene un formato no permitido. Formatos admitidos: JPEG, PNG, WebP o PDF.`);
        continue;
      }
      accepted.push({ id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, localFilename: file.name, idempotencyKey: randomIdempotencyKey(), status: "pending" });
    }
    setFileValidationError(errors.length ? errors.join(" ") : null);
    if (accepted.length) setQueuedFiles((current) => [...current, ...accepted]);
    event.target.value = "";
  };

  const uploadSingleFile = async (item: QueuedEvidenceFile): Promise<boolean> => {
    if (!inspection) return false;
    setQueuedFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "uploading", error: undefined } : file));
    try {
      const attachment = await servicesAdapter.uploadEvidence({ file: item.file, ownerType: "INSPECTION", ownerId: inspection.id, idempotencyKey: item.idempotencyKey });
      setQueuedFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "success", canonicalFilename: attachment.filename } : file));
      setInspection((current) => current ? { ...current, attachments: [...(current.attachments ?? []).filter((file) => file.id !== attachment.id), attachment] } : current);
      return true;
    } catch (error: unknown) {
      const message = error instanceof ServiceRequestError || error instanceof Error ? error.message : "No se pudo subir el archivo.";
      setQueuedFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "error", error: message } : file));
      if (error instanceof NetworkFailureError) throw error;
      return false;
    }
  };

  const uploadPendingEvidence = async () => {
    for (const file of queuedFiles) {
      if (file.status === "success") continue;
      if (!(await uploadSingleFile(file))) return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inspection) return;
    setFormError(null);
    setSuccessMessage(null);

    const payload = resultPayload(inspection, checkedItems, outcome, conclusion, findings, violationType, severity, suggestedAction);
    const parsed = environmentalInspectionCompleteInputSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    if (outcome !== "NO_VIOLATION" && (inspection.attachments?.length ?? 0) === 0 && queuedFiles.length === 0) {
      setFormError("Debe adjuntar al menos una evidencia para este resultado.");
      return;
    }

    const submit = async (nextPayload: InspectionCompletionDraftPayload) => {
      const uploaded = await uploadPendingEvidence();
      if (!uploaded) throw new Error("No se pudo cargar toda la evidencia. Revise los archivos marcados y reintente.");
      return environmentalReportsAdapter.completeInspection(inspection.id, nextPayload);
    };

    setIsSubmitting(true);
    try {
      const action = composedAgainst
        ? await resubmitFieldAction({ serviceId: service.id, actionType: "inspectionCompletion", composedAgainst, payload: parsed.data, submit })
        : await submitFieldAction({ service, actionType: "inspectionCompletion", payload: parsed.data, submit });

      if (action.kind === "success") {
        setInspection(action.result);
        setComposedAgainst(null);
        setSuccessMessage(`InspecciÃ³n registrada: ${OUTCOME_LABELS[action.result.outcome ?? "INCONCLUSIVE"]}. Siguiente paso: ${action.result.nextStep ? NEXT_STEP_LABELS[action.result.nextStep] : "pendiente de confirmaciÃ³n"}.`);
        const updatedService = await servicesAdapter.get(service.id).catch(() => null);
        if (updatedService) onServiceUpdated?.(updatedService);
      } else if (action.kind === "draft-saved") {
        setComposedAgainst(action.draft.composedAgainst);
        setFormError("No se pudo conectar con el servidor. El resultado quedÃ³ guardado como borrador local; reintente el envÃ­o cuando recupere la conexiÃ³n.");
      } else if (action.kind === "conflict") {
        setConflict({ current: action.current, composedAgainst: action.composedAgainst });
      } else if (action.kind === "still-offline") {
        setFormError("Seguimos sin conexiÃ³n. El borrador se conserva en este dispositivo para reintentar el envÃ­o mÃ¡s tarde.");
      } else {
        setFormError(action.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardDraft = () => {
    clearFieldDraft(service.id, "inspectionCompletion");
    setComposedAgainst(null);
    setConflict(null);
    setOutcome("NO_VIOLATION");
    setCheckedItems(Object.fromEntries((inspection?.checklist ?? []).map((item) => [item.id, false])));
    setConclusion("");
    setFindings("");
    setViolationType(undefined);
    setSeverity(undefined);
    setSuggestedAction(undefined);
    setFormError(null);
  };

  if (loadError || !inspectionId) {
    return <Alert variant="destructive" className="mt-6" role="alert"><AlertTriangle aria-hidden /><AlertTitle>No se pudo cargar la inspecciÃ³n</AlertTitle><AlertDescription>{loadError ?? "El servicio no tiene una inspecciÃ³n ambiental vinculada."}</AlertDescription></Alert>;
  }

  if (!inspection) {
    return <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-secondary)]" role="status">Cargando inspecciÃ³n ambiental…</div>;
  }

  const completed = Boolean(inspection.outcome);
  const hasDraft = Boolean(composedAgainst);
  const checklistComplete = inspection.checklist.every((item) => checkedItems[item.id] === true);

  return (
    <section className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" role="region" aria-labelledby={`inspection-execution-heading-${inputId}`}>
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-action)]"><FileCheck aria-hidden />Control ambiental</div>
          <h2 id={`inspection-execution-heading-${inputId}`} className="mt-1 text-lg font-bold text-[var(--color-text)]">EjecuciÃ³n de inspecciÃ³n ambiental</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{service.id} · Checklist {inspection.checklistVersion} · {inspection.scheduledDate}</p>
        </div>
        <span className="rounded-lg bg-[var(--color-info-fill)] px-2.5 py-1 text-xs font-semibold text-[var(--color-info)]">Punto asignado</span>
      </div>

      {!canExecute && !completed && (
        <Alert className="mt-4" role="status"><CloudOff aria-hidden /><AlertTitle>Modo de solo consulta</AlertTitle><AlertDescription>Esta inspecciÃ³n se encuentra en modo de solo consulta para integrantes de la cuadrilla.</AlertDescription></Alert>
      )}

      {!canExecute && !completed ? (
        <ReadOnlyInspection inspection={inspection} />
      ) : completed ? (
        <InspectionResult inspection={inspection} />
      ) : (
        <form className="mt-5 flex flex-col gap-5" onSubmit={handleSubmit}>
          {hasDraft && <Alert role="status"><CloudOff aria-hidden /><AlertTitle>Borrador local pendiente</AlertTitle><AlertDescription>El resultado se conserva en este dispositivo y requiere un reenvÃ­o manual cuando vuelva la conexiÃ³n.</AlertDescription></Alert>}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${inputId}-outcome`}>Resultado de la inspecciÃ³n <span aria-hidden="true">*</span></FieldLabel>
              <select id={`${inputId}-outcome`} value={outcome} onChange={(event) => setOutcome(environmentalInspectionOutcomeSchema.parse(event.target.value))} disabled={!canExecute || isSubmitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-describedby={`${inputId}-outcome-help`}>
                {environmentalInspectionOutcomeSchema.options.map((value) => <option key={value} value={value}>{OUTCOME_LABELS[value]}</option>)}
              </select>
              <FieldDescription id={`${inputId}-outcome-help`}>Seleccione el resultado que refleja la visita realizada.</FieldDescription>
            </Field>

            <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4">
              <legend className="px-1 text-sm font-semibold text-[var(--color-text)]">Checklist de inspecciÃ³n <span aria-hidden="true">*</span></legend>
              <p className="text-xs text-[var(--color-text-secondary)]">Marque cada control realizado antes de registrar el resultado.</p>
              {inspection.checklist.map((item) => {
                const checkboxId = `${inputId}-check-${item.id}`;
                return <label key={item.id} htmlFor={checkboxId} className="flex min-h-12 items-center gap-3 text-sm text-[var(--color-text)]"><input id={checkboxId} type="checkbox" checked={checkedItems[item.id] === true} onChange={(event) => setCheckedItems((current) => ({ ...current, [item.id]: event.target.checked }))} disabled={!canExecute || isSubmitting} className="size-5 accent-[var(--color-action)]" />{item.label}{item.required ? <span className="text-xs text-[var(--color-text-secondary)]">(obligatorio)</span> : null}</label>;
              })}
              {!checklistComplete && canExecute && <p className="text-xs text-[var(--color-warning)]">Faltan controles por completar.</p>}
            </fieldset>

            {(outcome === "NO_VIOLATION" || outcome === "INCONCLUSIVE") && <Field><FieldLabel htmlFor={`${inputId}-conclusion`}>{outcome === "NO_VIOLATION" ? "ConclusiÃ³n" : "ExplicaciÃ³n de la inspecciÃ³n inconclusa"} <span aria-hidden="true">*</span></FieldLabel><textarea id={`${inputId}-conclusion`} value={conclusion} onChange={(event) => setConclusion(event.target.value)} disabled={!canExecute || isSubmitting} className="min-h-28 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-describedby={`${inputId}-conclusion-help`} /><FieldDescription id={`${inputId}-conclusion-help`}>{outcome === "NO_VIOLATION" ? "Describa brevemente la conclusiÃ³n de la visita." : "Explique quÃ© impidiÃ³ confirmar el resultado."}</FieldDescription></Field>}

            {outcome === "VIOLATION_FOUND" && <>
              <Field><FieldLabel htmlFor={`${inputId}-findings`}>Hallazgos <span aria-hidden="true">*</span></FieldLabel><textarea id={`${inputId}-findings`} value={findings} onChange={(event) => setFindings(event.target.value)} disabled={!canExecute || isSubmitting} className="min-h-28 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor={`${inputId}-violation-type`}>Tipo de infracciÃ³n <span aria-hidden="true">*</span></FieldLabel><select id={`${inputId}-violation-type`} value={violationType ?? ""} onChange={(event) => setViolationType(event.target.value ? environmentalInspectionViolationTypeSchema.parse(event.target.value) : undefined)} disabled={!canExecute || isSubmitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione un tipo</option>{environmentalInspectionViolationTypeSchema.options.map((value) => <option key={value} value={value}>{VIOLATION_TYPE_LABELS[value]}</option>)}</select></Field><Field><FieldLabel htmlFor={`${inputId}-severity`}>Gravedad <span aria-hidden="true">*</span></FieldLabel><select id={`${inputId}-severity`} value={severity ?? ""} onChange={(event) => setSeverity(event.target.value ? environmentalInspectionSeveritySchema.parse(event.target.value) : undefined)} disabled={!canExecute || isSubmitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione una gravedad</option>{environmentalInspectionSeveritySchema.options.map((value) => <option key={value} value={value}>{SEVERITY_LABELS[value]}</option>)}</select></Field></div>
              <Field><FieldLabel htmlFor={`${inputId}-suggested-action`}>AcciÃ³n sugerida <span aria-hidden="true">*</span></FieldLabel><select id={`${inputId}-suggested-action`} value={suggestedAction ?? ""} onChange={(event) => setSuggestedAction(event.target.value ? environmentalInspectionSuggestedActionSchema.parse(event.target.value) : undefined)} disabled={!canExecute || isSubmitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione una acciÃ³n</option>{environmentalInspectionSuggestedActionSchema.options.map((value) => <option key={value} value={value}>{SUGGESTED_ACTION_LABELS[value]}</option>)}</select><FieldDescription>La decisiÃ³n final corresponde a Oficina y no se determina en este formulario.</FieldDescription></Field>
            </>}
          </FieldGroup>

          <EvidenceQueue queuedFiles={queuedFiles} fileValidationError={fileValidationError} onFileSelect={handleFileSelect} onRemoveFile={(id) => setQueuedFiles((current) => current.filter((file) => file.id !== id))} onRetryFile={(file) => void uploadSingleFile(file)} disabled={!canExecute || isSubmitting} existingCount={inspection.attachments?.length ?? 0} />

          {formError && <FieldError id={`${inputId}-form-error`}>{formError}</FieldError>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"><Button type="submit" disabled={!canExecute || isSubmitting} className="min-h-12 gap-2 sm:min-h-10"><FileCheck data-icon="inline-start" aria-hidden />{isSubmitting ? "Registrando inspecciÃ³n…" : hasDraft ? "Reintentar envÃ­o" : "Completar inspecciÃ³n"}</Button></div>
        </form>
      )}

      {successMessage && <Alert className="mt-4" role="status" aria-live="polite"><CheckCircle2 aria-hidden /><AlertTitle>InspecciÃ³n completada</AlertTitle><AlertDescription>{successMessage}</AlertDescription></Alert>}

      <Dialog open={Boolean(conflict)} onOpenChange={(open) => { if (!open) setConflict(null); }}>
        <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
          <DialogHeader><DialogTitle>Conflicto de sincronizaciÃ³n</DialogTitle><DialogDescription>No se aplicÃ³ el borrador local automÃ¡ticamente.</DialogDescription></DialogHeader>
          {conflict && <DraftConflictView serviceId={service.id} actionLabel="completado de inspecciÃ³n" composedAgainst={conflict.composedAgainst} current={conflict.current} onPreserve={() => { setConflict(null); }} onDiscard={() => { discardDraft(); }} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InspectionResult({ inspection }: { inspection: EnvironmentalInspection }) {
  const outcome = inspection.outcome ?? "INCONCLUSIVE";
  return <div className="mt-5 flex flex-col gap-4"><Alert role="status" aria-live="polite"><CheckCircle2 aria-hidden /><AlertTitle>Resultado registrado: {OUTCOME_LABELS[outcome]}</AlertTitle><AlertDescription>El servidor registrÃ³ la inspecciÃ³n. Siguiente paso: {inspection.nextStep ? NEXT_STEP_LABELS[inspection.nextStep] : "pendiente de confirmaciÃ³n"}.</AlertDescription></Alert><dl className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold text-[var(--color-text-secondary)]">Checklist</dt><dd className="mt-1 text-[var(--color-text)]">{inspection.checklist.length} controles registrados</dd></div>{inspection.findings && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--color-text-secondary)]">Hallazgos registrados</dt><dd className="mt-1 text-[var(--color-text)]">{inspection.findings}</dd></div>}{inspection.attachments && inspection.attachments.length > 0 && <div><dt className="text-xs font-semibold text-[var(--color-text-secondary)]">Evidencia</dt><dd className="mt-1 text-[var(--color-text)]">{inspection.attachments.length} archivo(s) asociado(s)</dd></div>}</dl></div>;
}

function ReadOnlyInspection({ inspection }: { inspection: EnvironmentalInspection }) {
  return <div className="mt-5 flex flex-col gap-4"><h3 className="text-sm font-bold text-[var(--color-text)]">Checklist asignado</h3><ul className="flex flex-col gap-2" aria-label="Checklist de inspecciÃ³n en solo consulta">{inspection.checklist.map((item) => <li key={item.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm text-[var(--color-text)]"><span aria-hidden="true" className="size-3 rounded-full border border-[var(--color-border-strong)]" />{item.label}{item.required ? <span className="text-xs text-[var(--color-text-secondary)]">(obligatorio)</span> : null}</li>)}</ul><p className="text-xs text-[var(--color-text-secondary)]">La persona responsable de la cuadrilla registra el resultado y la evidencia de esta inspecciÃ³n.</p></div>;
}

function EvidenceQueue({ queuedFiles, fileValidationError, onFileSelect, onRemoveFile, onRetryFile, disabled, existingCount }: { queuedFiles: QueuedEvidenceFile[]; fileValidationError: string | null; onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void; onRemoveFile: (id: string) => void; onRetryFile: (file: QueuedEvidenceFile) => void; disabled: boolean; existingCount: number }) {
  const inputId = useId();
  return <Card className="rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] ring-0"><CardHeader className="border-b border-[var(--color-border)]"><CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]"><Paperclip aria-hidden />Evidencia de la inspecciÃ³n</CardTitle><CardDescription>{existingCount > 0 ? `${existingCount} archivo(s) ya asociado(s). ` : ""}Puede agregar fotografÃ­as o documentos. Se admiten JPEG, PNG, WebP y PDF hasta 10 MB por archivo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 pt-4"><div className="flex flex-wrap items-center gap-3"><label htmlFor={inputId} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] ${disabled ? "pointer-events-none opacity-50" : ""}`}><Upload data-icon="inline-start" aria-hidden />Seleccionar archivos</label><input id={inputId} type="file" multiple accept={ACCEPTED_FILE_TYPES} onChange={onFileSelect} disabled={disabled} className="sr-only" /><span className="text-xs text-[var(--color-text-secondary)]">La carga se realiza archivo por archivo.</span></div>{fileValidationError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{fileValidationError}</div>}{queuedFiles.length > 0 && <ul className="flex flex-col gap-2" aria-label="Archivos de evidencia seleccionados">{queuedFiles.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm"><span className="flex min-w-0 items-center gap-2"><Paperclip className="size-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden /><span className="truncate text-[var(--color-text)]">{file.status === "success" && file.canonicalFilename ? file.canonicalFilename : file.localFilename}</span></span><span className="flex items-center gap-2 text-xs">{file.status === "pending" && <span className="text-[var(--color-text-secondary)]">Pendiente</span>}{file.status === "uploading" && <span className="text-[var(--color-info)]">Subiendo…</span>}{file.status === "success" && <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-success)]"><CheckCircle2 className="size-3" aria-hidden />Subido</span>}{file.status === "error" && <><span className="text-[var(--color-danger)]">{file.error}</span><Button type="button" variant="outline" size="sm" onClick={() => onRetryFile(file)} className="min-h-10 gap-1"><RefreshCw data-icon="inline-start" aria-hidden />Reintentar carga</Button></>}{file.status !== "uploading" && file.status !== "success" && <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemoveFile(file.id)} aria-label={`Quitar ${file.localFilename}`}><X aria-hidden /></Button>}</span></li>)}</ul>}</CardContent></Card>;
}
