"use client";

import { useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Pause,
  Paperclip,
  RefreshCw,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
  const preventCloseRef = useRef(false);

  if (!service) return null;

  const requestOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && preventCloseRef.current) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent className="max-w-lg">
        <SuspendServiceForm
          key={service.id}
          service={service}
          onOpenChange={requestOpenChange}
          onPendingEvidenceChange={(pending) => {
            preventCloseRef.current = pending;
          }}
          onSuspended={onSuspended}
        />
      </DialogContent>
    </Dialog>
  );
}

function SuspendServiceForm({
  service,
  onOpenChange,
  onPendingEvidenceChange,
  onSuspended,
}: {
  service: Service;
  onOpenChange: (open: boolean) => void;
  onPendingEvidenceChange: (pending: boolean) => void;
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
  const [suspendedService, setSuspendedService] = useState<Service | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ reason?: string; note?: string }>({});
  const pendingEvidenceCount = queuedFiles.filter((file) => file.status !== "success").length;

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
    if (!suspendedService) return;

    setIsSubmitting(true);
    const uploaded = await uploadSingleFile(item);
    const everyFileUploaded =
      uploaded && queuedFiles.every((file) => file.id === item.id || file.status === "success");
    if (everyFileUploaded) {
      finishSuspension(suspendedService);
      return;
    }
    setIsSubmitting(false);
  };

  function finishSuspension(updated: Service) {
    onPendingEvidenceChange(false);
    setIsSubmitting(false);
    onSuspended(updated);
    onOpenChange(false);
  }

  async function afterSuspended(updated: Service) {
    if (queuedFiles.length === 0) {
      finishSuspension(updated);
      return;
    }

    onPendingEvidenceChange(true);
    let everyFileUploaded = true;
    for (const queued of queuedFiles) {
      if (!(await uploadSingleFile(queued))) everyFileUploaded = false;
    }

    if (everyFileUploaded) {
      finishSuspension(updated);
      return;
    }

    setSuspendedService(updated);
    setIsSubmitting(false);
  }

  async function handleRetryPendingUploads() {
    if (!suspendedService) return;

    setIsSubmitting(true);
    let everyFileUploaded = true;
    for (const queued of queuedFiles.filter((file) => file.status !== "success")) {
      if (!(await uploadSingleFile(queued))) everyFileUploaded = false;
    }

    if (everyFileUploaded) {
      finishSuspension(suspendedService);
      return;
    }
    setIsSubmitting(false);
  }

  function handleConfirmDiscard() {
    if (!suspendedService) return;

    setConfirmDiscardOpen(false);
    setQueuedFiles([]);
    finishSuspension(suspendedService);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason) {
      setErrorMessage(null);
      setFieldErrors({ reason: "Debe seleccionar un motivo de suspensión." });
      return;
    }
    if (!note.trim()) {
      setErrorMessage(null);
      setFieldErrors({ note: "Debe indicar una nota describiendo la suspensión." });
      return;
    }

    setFieldErrors({});
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

  const reasonItems = NOT_SERVICED_REASON_LABEL;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
          <Pause className="size-4" aria-hidden />
          <span>Suspensión de servicio en curso</span>
        </div>
        <DialogTitle>
          {suspendedService ? `Servicio suspendido · ${service.title}` : `Suspender ${service.title}`}
        </DialogTitle>
        <DialogDescription>
          {suspendedService
            ? "La suspensión se registró. Revise el estado de la evidencia y reintente las cargas pendientes."
            : "Registre el motivo de la interrupción. El servicio pasará a estado Suspendido hasta que la persona responsable de la cuadrilla lo reanude."}
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
        {conflict ? (
          <DraftConflictView
            serviceId={service.id}
            actionLabel="suspensión"
            composedAgainst={conflict.composedAgainst}
            current={conflict.current}
            onPreserve={handlePreserveDraft}
            onDiscard={handleDiscardDraft}
          />
        ) : (
          <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            {suspendedService && (
              <Alert variant="warning">
                <AlertCircle aria-hidden />
                <AlertDescription>
                  Servicio suspendido; falta subir {pendingEvidenceCount}{" "}
                  {pendingEvidenceCount === 1 ? "archivo." : "archivos."} El servicio ya está suspendido;
                  reintente la carga o descarte los archivos pendientes.
                </AlertDescription>
              </Alert>
            )}

            {draftPending && (
              <Alert variant="warning" role="status">
                <CloudOff aria-hidden />
                <AlertDescription>
                  Borrador local pendiente de envío. Los datos se conservaron en este dispositivo;
                  reenvíelos manualmente cuando recupere la conexión.
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert variant="danger">
                <AlertCircle aria-hidden />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              {!suspendedService && (
                <>
                  <Field data-invalid={Boolean(fieldErrors.reason) || undefined}>
                    <FieldLabel htmlFor={`${formId}-reason`}>
                      Motivo de suspensión <span aria-hidden>*</span>
                    </FieldLabel>
                    <Select
                      value={reason || null}
                      items={reasonItems}
                      onValueChange={(value) => {
                        setReason(value as NotServicedReason);
                        setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                        setErrorMessage(null);
                      }}
                    >
                      <SelectTrigger
                        id={`${formId}-reason`}
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.reason) || undefined}
                        aria-describedby={fieldErrors.reason ? `${formId}-reason-error` : undefined}
                      >
                        <SelectValue placeholder="Seleccione un motivo…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(Object.keys(NOT_SERVICED_REASON_LABEL) as NotServicedReason[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {NOT_SERVICED_REASON_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldErrors.reason && <FieldError id={`${formId}-reason-error`}>{fieldErrors.reason}</FieldError>}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors.note) || undefined}>
                    <FieldLabel htmlFor={`${formId}-note`}>
                      Nota <span aria-hidden>*</span>
                    </FieldLabel>
                    <Textarea
                      id={`${formId}-note`}
                      rows={3}
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, note: undefined }));
                        setErrorMessage(null);
                      }}
                      required
                      aria-invalid={Boolean(fieldErrors.note)}
                      aria-describedby={fieldErrors.note ? `${formId}-note-help ${formId}-note-error` : `${formId}-note-help`}
                      placeholder="Describa la causa de la interrupción y cualquier detalle relevante para Oficina…"
                    />
                    <FieldDescription id={`${formId}-note-help`}>
                      Obligatoria. Se envía junto con el motivo seleccionado; entre ambos no pueden
                      superar los 500 caracteres.
                    </FieldDescription>
                    {fieldErrors.note && <FieldError id={`${formId}-note-error`}>{fieldErrors.note}</FieldError>}
                  </Field>
                </>
              )}

              <Field>
                {suspendedService ? (
                  <FieldTitle>Archivos de evidencia</FieldTitle>
                ) : (
                  <FieldLabel htmlFor={`${formId}-evidence-input`}>Evidencia adjunta</FieldLabel>
                )}
                <FieldDescription>
                  {suspendedService
                    ? "Los archivos que no se hayan subido conservan su estado y pueden reintentarse."
                    : "Opcional, cuando sea aplicable (ej. fotografía del desperfecto o del obstáculo)."}
                </FieldDescription>
                {!suspendedService && (
                  <Input
                    id={`${formId}-evidence-input`}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelect}
                  />
                )}

                {queuedFiles.length > 0 && (
                  <ItemGroup className="gap-2">
                    {queuedFiles.map((item) => (
                      <Item key={item.id} variant="outline" size="sm">
                        <ItemMedia variant="icon">
                          <Paperclip aria-hidden />
                        </ItemMedia>
                        <ItemContent className="min-w-0">
                          <ItemTitle className="max-w-full truncate">
                            {item.status === "success" && item.canonicalFilename
                              ? item.canonicalFilename
                              : item.localFilename}
                          </ItemTitle>
                          {item.status === "error" && (
                            <ItemDescription className="text-destructive">{item.error}</ItemDescription>
                          )}
                        </ItemContent>
                        <ItemActions>
                          {item.status === "pending" && <Badge variant="neutral">Pendiente</Badge>}
                          {item.status === "uploading" && (
                            <Badge variant="info">
                              <Spinner data-icon="inline-start" aria-hidden="true" />
                              Subiendo...
                            </Badge>
                          )}
                          {item.status === "success" && (
                            <Badge variant="success">
                              <CheckCircle2 data-icon="inline-start" aria-hidden />
                              Subido
                            </Badge>
                          )}
                          {item.status === "error" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryUpload(item)}
                              disabled={isSubmitting}
                            >
                              <RefreshCw data-icon="inline-start" aria-hidden />
                              <span>Reintentar</span>
                            </Button>
                          )}
                          {!suspendedService && item.status !== "uploading" && item.status !== "success" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveFile(item.id)}
                              aria-label={`Eliminar ${item.localFilename}`}
                            >
                              <X aria-hidden />
                            </Button>
                          )}
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                )}
              </Field>
            </FieldGroup>
          </form>
        )}
      </div>

      {!conflict && (
        <DialogFooter className="flex-wrap">
          {suspendedService ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setConfirmDiscardOpen(true)}
                className="mr-auto text-destructive"
              >
                Descartar archivos pendientes
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || pendingEvidenceCount === 0}
                onClick={handleRetryPendingUploads}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <RefreshCw data-icon="inline-start" aria-hidden />}
                <span>Reintentar archivos pendientes</span>
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" form={formId} disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? (
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                ) : draftPending ? (
                  <RefreshCw data-icon="inline-start" aria-hidden />
                ) : (
                  <Pause data-icon="inline-start" aria-hidden />
                )}
                <span>{draftPending ? "Reintentar envío" : "Suspender servicio"}</span>
              </Button>
            </>
          )}
        </DialogFooter>
      )}

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar archivos pendientes</DialogTitle>
            <DialogDescription>
              Los archivos pendientes no se enviarán y se quitarán de esta ventana. El servicio ya está suspendido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDiscardOpen(false)}>
              Seguir con los archivos
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDiscard}>
              Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
