"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Pause,
  Paperclip,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NOT_SERVICED_REASON_LABEL,
  NotServicedReason,
  Service,
  ServiceRequestError,
  servicesAdapter,
} from "@/lib/services";
import {
  clearFieldDraft,
  getFieldDraft,
  resubmitFieldAction,
  submitFieldAction,
  type FieldDraftServiceSnapshot,
} from "@/lib/field-drafts";
import { DraftConflictView } from "./draft-conflict-view";

interface SuspendDraftPayload {
  reason: NotServicedReason;
  note: string;
}

interface QueuedEvidenceFile {
  id: string;
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  error?: string;
}

interface SuspendServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSuspended: (updatedService: Service) => void;
}

export function SuspendServiceDialog({
  open,
  onOpenChange,
  service,
  onSuspended,
}: SuspendServiceDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-[var(--color-border)] bg-[var(--color-surface)]">
        <SuspendServiceForm
          key={service.id}
          service={service}
          onOpenChange={onOpenChange}
          onSuspended={onSuspended}
        />
      </DialogContent>
    </Dialog>
  );
}

function SuspendServiceForm({
  service,
  onOpenChange,
  onSuspended,
}: {
  service: Service;
  onOpenChange: (open: boolean) => void;
  onSuspended: (updatedService: Service) => void;
}) {
  const formId = useId();

  const existingDraft = getFieldDraft<SuspendDraftPayload>(service.id, "suspend");

  const [reason, setReason] = useState<NotServicedReason | "">(existingDraft?.payload.reason ?? "");
  const [note, setNote] = useState(existingDraft?.payload.note ?? "");
  const [composedAgainst, setComposedAgainst] = useState<FieldDraftServiceSnapshot | null>(
    existingDraft?.composedAgainst ?? null,
  );
  const [conflict, setConflict] = useState<{
    current: Service;
    composedAgainst: FieldDraftServiceSnapshot;
  } | null>(null);
  const [draftPending, setDraftPending] = useState(Boolean(existingDraft));
  const [queuedFiles, setQueuedFiles] = useState<QueuedEvidenceFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newQueued: QueuedEvidenceFile[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      localFilename: file.name,
      idempotencyKey:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random()}`,
      status: "pending",
    }));

    setQueuedFiles((prev) => [...prev, ...newQueued]);
    e.target.value = "";
  };

  const handleRemoveFile = (fileId: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadSingleFile = async (item: QueuedEvidenceFile): Promise<boolean> => {
    setQueuedFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", error: undefined } : f)),
    );
    try {
      const att = await servicesAdapter.uploadEvidence({
        file: item.file,
        ownerType: "SERVICE",
        ownerId: service.id,
        idempotencyKey: item.idempotencyKey,
      });
      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "success", canonicalFilename: att.filename } : f,
        ),
      );
      return true;
    } catch (err) {
      const msg = err instanceof ServiceRequestError ? err.message : "Error al subir el archivo";
      setQueuedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: msg } : f)),
      );
      return false;
    }
  };

  const handleRetryUpload = async (item: QueuedEvidenceFile) => {
    await uploadSingleFile(item);
  };

  async function afterSuspended(updated: Service) {
    if (queuedFiles.length > 0) {
      for (const queued of queuedFiles) {
        await uploadSingleFile(queued);
      }
    }
    onSuspended(updated);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason) {
      setErrorMessage("Debe seleccionar un motivo de suspensión.");
      return;
    }
    if (!note.trim()) {
      setErrorMessage("Debe indicar una nota describiendo la suspensión.");
      return;
    }

    const payload: SuspendDraftPayload = { reason: reason as NotServicedReason, note: note.trim() };
    setIsSubmitting(true);

    // A composedAgainst anchor already exists (this is a manual resubmission of a
    // local draft): re-check the Service before applying it, per ADR-0001.
    if (composedAgainst) {
      const outcome = await resubmitFieldAction({
        serviceId: service.id,
        actionType: "suspend",
        composedAgainst,
        payload,
        submit: (p) => servicesAdapter.suspend(service.id, p),
      });

      if (outcome.kind === "success") {
        await afterSuspended(outcome.result);
        return;
      }
      if (outcome.kind === "conflict") {
        setConflict({ current: outcome.current, composedAgainst: outcome.composedAgainst });
        setIsSubmitting(false);
        return;
      }
      if (outcome.kind === "still-offline") {
        setDraftPending(true);
        setErrorMessage(
          "Seguimos sin conexión. El borrador se conserva en este dispositivo para reintentar el envío más tarde.",
        );
        setIsSubmitting(false);
        return;
      }
      setErrorMessage(outcome.message);
      setIsSubmitting(false);
      return;
    }

    const outcome = await submitFieldAction({
      service,
      actionType: "suspend",
      payload,
      submit: (p) => servicesAdapter.suspend(service.id, p),
    });

    if (outcome.kind === "success") {
      await afterSuspended(outcome.result);
      return;
    }
    if (outcome.kind === "draft-saved") {
      setComposedAgainst(outcome.draft.composedAgainst);
      setDraftPending(true);
      setErrorMessage(
        "No se pudo conectar con el servidor. La suspensión quedó guardada como borrador local: puede reintentar el envío cuando recupere la conexión.",
      );
      setIsSubmitting(false);
      return;
    }
    setErrorMessage(outcome.message);
    setIsSubmitting(false);
  }

  function handlePreserveDraft() {
    setConflict(null);
  }

  function handleDiscardDraft() {
    clearFieldDraft(service.id, "suspend");
    setComposedAgainst(null);
    setDraftPending(false);
    setConflict(null);
    setReason("");
    setNote("");
    setErrorMessage(null);
  }

  return (
    <>
      <DialogHeader className="border-b border-[var(--color-border)] p-6 pb-4 bg-[var(--color-canvas)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
          <Pause className="h-4 w-4" aria-hidden />
          <span>Suspensión de servicio en curso</span>
        </div>
        <DialogTitle className="text-xl font-bold text-[var(--color-text)]">
          Suspender {service.id}
        </DialogTitle>
        <DialogDescription className="text-xs text-[var(--color-text-secondary)]">
          Registre el motivo de la interrupción. El servicio pasará a estado Suspendido hasta que la
          persona responsable de la cuadrilla lo reanude.
        </DialogDescription>
      </DialogHeader>

      {conflict ? (
        <div className="p-6">
          <DraftConflictView
            serviceId={service.id}
            actionLabel="suspensión"
            composedAgainst={conflict.composedAgainst}
            current={conflict.current}
            onPreserve={handlePreserveDraft}
            onDiscard={handleDiscardDraft}
          />
        </div>
      ) : (
      <form id={formId} noValidate onSubmit={handleSubmit} className="p-6 space-y-5">
        {draftPending && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-3 text-xs text-[var(--color-warning)]"
          >
            <CloudOff className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <div className="font-semibold">
              Borrador local pendiente de envío. Los datos se conservaron en este dispositivo;
              reenvíelos manualmente cuando recupere la conexión.
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-xs text-[var(--color-danger)]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <div className="font-semibold">{errorMessage}</div>
          </div>
        )}

        <FieldGroup className="space-y-4">
          <Field>
            <FieldLabel htmlFor={`${formId}-reason`}>
              Motivo de suspensión <span className="text-[var(--color-danger)]" aria-hidden>*</span>
            </FieldLabel>
            <select
              id={`${formId}-reason`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as NotServicedReason);
                setErrorMessage(null);
              }}
              required
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            >
              <option value="">Seleccione un motivo…</option>
              {(Object.keys(NOT_SERVICED_REASON_LABEL) as NotServicedReason[]).map((r) => (
                <option key={r} value={r}>
                  {NOT_SERVICED_REASON_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${formId}-note`}>
              Nota <span className="text-[var(--color-danger)]" aria-hidden>*</span>
            </FieldLabel>
            <textarea
              id={`${formId}-note`}
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrorMessage(null);
              }}
              required
              placeholder="Describa la causa de la interrupción y cualquier detalle relevante para Oficina…"
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            />
            <FieldDescription>
              Obligatoria. Explica el motivo seleccionado con el detalle operativo del caso.
            </FieldDescription>
          </Field>

          <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--color-text)] block text-xs">
                  Evidencia adjunta
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Opcional, cuando sea aplicable (ej. fotografía del desperfecto o del obstáculo).
                </span>
              </div>
              <label
                htmlFor={`${formId}-evidence-input`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                <span>Seleccionar archivo</span>
              </label>
              <input
                id={`${formId}-evidence-input`}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="sr-only"
              />
            </div>

            {queuedFiles.length > 0 && (
              <ul className="mt-3 space-y-2" role="list">
                {queuedFiles.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />
                      <div className="min-w-0">
                        <span className="font-semibold text-[var(--color-text)] truncate block">
                          {item.status === "success" && item.canonicalFilename
                            ? item.canonicalFilename
                            : item.localFilename}
                        </span>
                        {item.status === "error" && (
                          <span className="text-[10px] text-[var(--color-danger)] block">
                            {item.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "pending" && (
                        <span className="rounded bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                          Pendiente
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="rounded bg-[var(--color-info-fill)] px-2 py-0.5 text-[10px] text-[var(--color-info)]">
                          Subiendo...
                        </span>
                      )}
                      {item.status === "success" && (
                        <span className="rounded bg-[var(--color-success-fill)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-success)] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Subido
                        </span>
                      )}
                      {item.status === "error" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryUpload(item)}
                          className="h-6 gap-1 px-2 text-[10px] text-[var(--color-danger)] hover:bg-[var(--color-danger-fill)]/30"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Reintentar</span>
                        </Button>
                      )}
                      {item.status !== "uploading" && item.status !== "success" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(item.id)}
                          aria-label={`Eliminar ${item.localFilename}`}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FieldGroup>

        <DialogFooter className="border-t border-[var(--color-border)] pt-4 gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="default"
            size="sm"
            disabled={isSubmitting}
            className="text-xs font-semibold gap-1.5"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden />
            <span>
              {isSubmitting
                ? "Suspendiendo..."
                : draftPending
                ? "Reintentar envío"
                : "Suspender servicio"}
            </span>
          </Button>
        </DialogFooter>
      </form>
      )}
    </>
  );
}
