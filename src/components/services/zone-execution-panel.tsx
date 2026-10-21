"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CloudOff,
  FileCheck,
  FileText,
  Paperclip,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback";
import {
  NOT_SERVICED_REASON_LABEL,
  NotServicedReason,
  Service,
  ServiceRequestError,
  containerLocationSchema,
  type Attachment,
  type CompleteServiceInput,
  servicesAdapter,
  STATUS_LABEL,
  ZONE_RESULT_STATUS_LABEL,
  ZoneResult,
  ZoneResultStatus,
} from "@/lib/services";
import { formatArgentinaDateTime } from "@/lib/argentina-date";
import { containersAdapter } from "@/lib/containers";
import { getZoneResultsByServiceId } from "@/lib/services-fixtures";
import {
  clearFieldDraft,
  getFieldDraft,
  resubmitFieldAction,
  submitFieldAction,
  type FieldDraftServiceSnapshot,
} from "@/lib/field-drafts";
import { DraftConflictView } from "./draft-conflict-view";

interface QueuedEvidenceFile {
  id: string; // client id
  zoneId: string;
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  attachmentId?: string;
  error?: string;
}

interface ZoneResultDraftPayload {
  zoneId: string;
  status: ZoneResultStatus;
  reason: NotServicedReason | null;
  notes: string | null;
}

export function ZoneExecutionPanel({
  service,
  canExecute = false,
  onServiceUpdated,
}: {
  service: Service;
  canExecute?: boolean;
  onServiceUpdated?: (updated: Service) => void;
}) {
  const [zoneResults, setZoneResults] = useState<ZoneResult[]>(() =>
    getZoneResultsByServiceId(service.id),
  );

  function computeInitialZoneId(): string {
    const existing = getZoneResultsByServiceId(service.id);
    const unrecorded = service.zoneIds.find((zid) => !existing.some((r) => r.zoneId === zid));
    return unrecorded ?? service.zoneIds[0];
  }

  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => computeInitialZoneId());

  // Mobile disclosure state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);

  // Form state for current zone — restored from a local draft when one exists for this zone
  const [status, setStatus] = useState<ZoneResultStatus>(
    () => getFieldDraft<ZoneResultDraftPayload>(service.id, "zoneResult", computeInitialZoneId())?.payload.status ?? "SERVICED",
  );
  const [reason, setReason] = useState<NotServicedReason | "">(
    () => getFieldDraft<ZoneResultDraftPayload>(service.id, "zoneResult", computeInitialZoneId())?.payload.reason ?? "",
  );
  const [notes, setNotes] = useState(
    () => getFieldDraft<ZoneResultDraftPayload>(service.id, "zoneResult", computeInitialZoneId())?.payload.notes ?? "",
  );
  const [composedAgainst, setComposedAgainst] = useState<FieldDraftServiceSnapshot | null>(
    () => getFieldDraft<ZoneResultDraftPayload>(service.id, "zoneResult", computeInitialZoneId())?.composedAgainst ?? null,
  );
  const [conflict, setConflict] = useState<{
    current: Service;
    composedAgainst: FieldDraftServiceSnapshot;
  } | null>(null);
  const [queuedFilesByZone, setQueuedFilesByZone] = useState<Record<string, QueuedEvidenceFile[]>>({});
  const queuedFiles = queuedFilesByZone[selectedZoneId] ?? [];
  const updateQueuedFilesForZone = (
    zoneId: string,
    update: (files: QueuedEvidenceFile[]) => QueuedEvidenceFile[],
  ) => {
    setQueuedFilesByZone((current) => ({
      ...current,
      [zoneId]: update(current[zoneId] ?? []),
    }));
  };
  const [evidence, setEvidence] = useState<{
    ownerId: string;
    attachments: Attachment[];
    error?: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completion state
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionSuccessMessage, setCompletionSuccessMessage] = useState<string | null>(null);
  const [targetContainer, setTargetContainer] = useState<{
    id: string;
    status: "ACTIVE" | "OVERFLOWED" | "DAMAGED" | "UNDER_REPAIR" | "RELOCATING" | "REMOVED";
  } | null>(null);
  const [containerLocation, setContainerLocation] = useState({
    address: "",
    lat: "",
    lng: "",
  });

  const isContainerTarget = service.mode === "POINT" && service.targetType === "CONTAINER";
  const isContainerRelocating =
    targetContainer?.id === service.targetId && targetContainer?.status === "RELOCATING";

  // Refresh zone results from backend/adapter
  useEffect(() => {
    let isCurrent = true;
    async function loadResults() {
      try {
        const results = await servicesAdapter.getZoneResults(service.id);
        if (isCurrent) {
          setZoneResults(results);
        }
      } catch {
        // Retain initial synchronous fixtures
      }
    }
    void loadResults();
    return () => {
      isCurrent = false;
    };
  }, [service.id]);

  useEffect(() => {
    if (!isContainerTarget || !service.targetId) return;

    let isCurrent = true;
    void containersAdapter
      .get(service.targetId)
      .then((container) => {
        if (isCurrent) setTargetContainer({ id: container.id, status: container.status });
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [isContainerTarget, service.targetId]);

  // Reset form when changing zones — restoring any local draft for the newly selected zone
  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const draft = getFieldDraft<ZoneResultDraftPayload>(service.id, "zoneResult", zoneId);
    setStatus(draft?.payload.status ?? "SERVICED");
    setReason(draft?.payload.reason ?? "");
    setNotes(draft?.payload.notes ?? "");
    setComposedAgainst(draft?.composedAgainst ?? null);
    setConflict(null);
    setFormError(null);
  };

  const selectedZoneResult = zoneResults.find((r) => r.zoneId === selectedZoneId);
  // Both Campo and Oficina read evidence from the persisted ZoneResult owner.
  useEffect(() => {
    if (!selectedZoneResult) return;
    let isCurrent = true;
    const ownerId = selectedZoneResult.id;
    void servicesAdapter.getZoneResultEvidence(ownerId)
      .then((attachments) => {
        if (isCurrent) setEvidence({ ownerId, attachments });
      })
      .catch(() => {
        if (isCurrent) setEvidence({
          ownerId, attachments: [],
          error: "No se pudo cargar la evidencia. Recargue el servicio para reintentar.",
        });
      });
    return () => { isCurrent = false; };
  }, [selectedZoneResult]);
  const currentEvidence = evidence?.ownerId === selectedZoneResult?.id ? evidence : null;
  const persistedAttachments = [...new Map([
    ...(selectedZoneResult?.attachments ?? []),
    ...(currentEvidence?.attachments ?? []),
  ].map((attachment) => [attachment.id, attachment])).values()];
  const selectedZoneIndex = service.zoneIds.indexOf(selectedZoneId);
  const selectedZoneName =
    selectedZoneIndex >= 0 && service.zoneNames[selectedZoneIndex]
      ? service.zoneNames[selectedZoneIndex]
      : selectedZoneId;

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newQueued: QueuedEvidenceFile[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      zoneId: selectedZoneId,
      file,
      localFilename: file.name,
      idempotencyKey:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random()}`,
      status: "pending",
    }));

    updateQueuedFilesForZone(selectedZoneId, (prev) => [...prev, ...newQueued]);
    // Reset file input value so same file can be re-selected if removed
    e.target.value = "";
  };

  const handleRemoveFile = (fileId: string) => {
    updateQueuedFilesForZone(selectedZoneId, (prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadSingleFile = async (
    item: QueuedEvidenceFile,
    zoneResultId: string,
  ): Promise<boolean> => {
    updateQueuedFilesForZone(item.zoneId, (prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", error: undefined } : f)),
    );
    try {
      const att = await servicesAdapter.uploadEvidence({
        file: item.file,
        ownerType: "ZONE_RESULT",
        ownerId: zoneResultId,
        serviceId: service.id,
        idempotencyKey: item.idempotencyKey,
      });

      setEvidence((prev) => ({
        ownerId: zoneResultId,
        attachments: [...(prev?.ownerId === zoneResultId ? prev.attachments : []), att],
      }));

      updateQueuedFilesForZone(item.zoneId, (prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: "success",
                canonicalFilename: att.filename,
                attachmentId: att.id,
              }
            : f,
        ),
      );
      return true;
    } catch (err) {
      const msg = err instanceof ServiceRequestError ? err.message : "Error al subir el archivo";
      updateQueuedFilesForZone(item.zoneId, (prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: msg } : f)),
      );
      return false;
    }
  };

  const handleRetryUpload = async (item: QueuedEvidenceFile) => {
    if (!selectedZoneResult) return;
    const uploaded = await uploadSingleFile(item, selectedZoneResult.id);
    if (uploaded) notifySuccess("Evidencia cargada.");
    else notifyError("No se pudo cargar la evidencia. Puede reintentar la carga.");
    const everyFileUploaded =
      uploaded && queuedFiles.every((file) => file.id === item.id || file.status === "success");
    if (everyFileUploaded) updateQueuedFilesForZone(item.zoneId, () => []);
    // Refresh zone results to include newly uploaded attachment
    try {
      const refreshed = await servicesAdapter.getZoneResults(service.id);
      setZoneResults(refreshed);
    } catch {
      // Ignored
    }
  };

  async function afterZoneResultRecorded(createdResult: ZoneResult) {
    // Upload any queued evidence files with individual progress/retry capability.
    // Evidence-upload retry is idempotent and exempt from draft handling (ticket 5).
    let hasUploadErrors = false;
    if (queuedFiles.length > 0) {
      for (const queued of queuedFiles) {
        const ok = await uploadSingleFile(queued, createdResult.id);
        if (!ok) {
          hasUploadErrors = true;
        }
      }
    }

    if (!hasUploadErrors) updateQueuedFilesForZone(createdResult.zoneId, () => []);

    const refreshed = await servicesAdapter.getZoneResults(service.id);
    setZoneResults(refreshed);

    // Auto-advance to next unrecorded zone only if all uploads succeeded
    if (!hasUploadErrors) {
      const nextUnrecorded = service.zoneIds.find((zid) => !refreshed.some((r) => r.zoneId === zid));
      if (nextUnrecorded) {
        handleSelectZone(nextUnrecorded);
      }
    }
  }

  const handleSubmitZoneResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (status !== "SERVICED" && !reason) {
      setFormError("El motivo es obligatorio para resultados parciales o no atendidos.");
      return;
    }

    if (status !== "SERVICED" && queuedFiles.length === 0) {
      setFormError(
        "Se requiere adjuntar evidencia documental o fotográfica para resultados parciales o no atendidos.",
      );
      return;
    }

    const payload: ZoneResultDraftPayload = {
      zoneId: selectedZoneId,
      status,
      reason: status === "SERVICED" ? null : (reason as NotServicedReason),
      notes: notes.trim() || null,
    };
    const submitZoneResult = (p: ZoneResultDraftPayload) =>
      servicesAdapter.recordZoneResult(service.id, p);

    setIsSubmitting(true);
    try {
      // A composedAgainst anchor already exists (manual resubmission of a local
      // draft): re-check the Service before applying it, per ADR-0001.
      if (composedAgainst) {
        const outcome = await resubmitFieldAction({
          serviceId: service.id,
          actionType: "zoneResult",
          scope: selectedZoneId,
          composedAgainst,
          payload,
          submit: submitZoneResult,
        });

        if (outcome.kind === "success") {
          setComposedAgainst(null);
          notifySuccess("Resultado de la zona registrado.");
          await afterZoneResultRecorded(outcome.result);
          return;
        }
        if (outcome.kind === "conflict") {
          setConflict({ current: outcome.current, composedAgainst: outcome.composedAgainst });
          return;
        }
        if (outcome.kind === "still-offline") {
          setFormError(
            "Seguimos sin conexión. El borrador se conserva en este dispositivo para reintentar el envío más tarde.",
          );
          return;
        }
        setFormError(outcome.message);
        return;
      }

      const outcome = await submitFieldAction({
        service,
        actionType: "zoneResult",
        scope: selectedZoneId,
        payload,
        submit: submitZoneResult,
      });

      if (outcome.kind === "success") {
        notifySuccess("Resultado de la zona registrado.");
        await afterZoneResultRecorded(outcome.result);
        return;
      }
      if (outcome.kind === "draft-saved") {
        setComposedAgainst(outcome.draft.composedAgainst);
        setFormError(
          "No se pudo conectar con el servidor. El resultado quedó guardado como borrador local: puede reintentar el envío cuando recupere la conexión.",
        );
        return;
      }
      setFormError(outcome.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  function handlePreserveDraft() {
    setConflict(null);
  }

  function handleDiscardDraft() {
    clearFieldDraft(service.id, "zoneResult", selectedZoneId);
    setComposedAgainst(null);
    setConflict(null);
    setStatus("SERVICED");
    setReason("");
    setNotes("");
    setFormError(null);
  }

  // Completion handling
  const allZonesRecorded =
    service.zoneIds.length > 0 &&
    service.zoneIds.every((zid) => zoneResults.some((r) => r.zoneId === zid));

  const handleCompleteService = async () => {
    setCompletionError(null);
    setCompletionSuccessMessage(null);

    let completionInput: CompleteServiceInput | undefined;
    if (isContainerRelocating) {
      const latitude = containerLocation.lat.trim();
      const longitude = containerLocation.lng.trim();
      const missingCoordinates = [
        ...(latitude ? [] : ["latitud"]),
        ...(longitude ? [] : ["longitud"]),
      ];
      if (missingCoordinates.length > 0) {
        const missingLabel = missingCoordinates.join(" y la ");
        const verb = missingCoordinates.length === 1 ? "es obligatoria" : "son obligatorias";
        setCompletionError(`La ${missingLabel} ${verb} para completar la reubicación.`);
        return;
      }

      const parsedLocation = containerLocationSchema.safeParse({
        address: containerLocation.address,
        lat: Number(latitude),
        lng: Number(longitude),
      });
      if (!parsedLocation.success) {
        setCompletionError(parsedLocation.error.issues.map((issue) => issue.message).join(" "));
        return;
      }
      completionInput = { containerLocation: parsedLocation.data };
    }

    setIsCompleting(true);
    try {
      const updated = await servicesAdapter.complete(service.id, completionInput);
      if (onServiceUpdated) {
        onServiceUpdated(updated);
      }
      setCompletionSuccessMessage(
        `Servicio finalizado con estado: ${STATUS_LABEL[updated.status]} (${updated.status})`,
      );
    } catch (err) {
      const msg =
        err instanceof ServiceRequestError
          ? err.message
          : "Error al completar el servicio en el servidor.";
      setCompletionError(msg);
    } finally {
      setIsCompleting(false);
    }
  };

  const getResultTag = (zoneId: string) => {
    const res = zoneResults.find((r) => r.zoneId === zoneId);
    if (!res) return { label: "Pendiente", variant: "subtle" as const };
    switch (res.status) {
      case "SERVICED":
        return { label: "Atendida", variant: "success" as const };
      case "PARTIAL":
        return { label: "Parcial", variant: "warning" as const };
      case "NOT_SERVICED":
        return { label: "No atendida", variant: "danger" as const };
    }
  };

  const isCompletedService =
    service.status === "COMPLETED" || service.status === "PARTIALLY_COMPLETED";

  return (
    <div
      role="region"
      aria-labelledby="zone-execution-heading"
      className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 min-[761px]:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 id="zone-execution-heading" className="text-lg font-bold text-[var(--color-text)]">
            Registro de ejecución de zonas
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {service.mode === "ROUTE"
              ? "Recorrido por zonas: registre el resultado de cada zona en cualquier orden."
              : "Servicio puntual: registre el resultado de la zona correspondiente."}
          </p>
        </div>

        {isContainerRelocating && (
          <FieldSet className="mb-4 rounded-xl border border-[var(--color-info-line)] bg-[var(--color-info-fill)]/30 p-4">
            <FieldLegend className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-info)]">
              Nueva ubicación del contenedor
            </FieldLegend>
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Se enviará junto con la finalización del Servicio. No se requiere una confirmación adicional.
            </p>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor={`container-location-address-${service.id}`} className="text-xs font-semibold text-[var(--color-text)]">Nueva dirección</FieldLabel>
                <Input
                  id={`container-location-address-${service.id}`}
                  value={containerLocation.address}
                  onChange={(event) => setContainerLocation((current) => ({ ...current, address: event.target.value }))}
                  required
                />
              </Field>
              <FieldGroup className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`container-location-lat-${service.id}`} className="text-xs font-semibold text-[var(--color-text)]">Latitud</FieldLabel>
                  <Input
                    id={`container-location-lat-${service.id}`}
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={containerLocation.lat}
                    onChange={(event) => setContainerLocation((current) => ({ ...current, lat: event.target.value }))}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`container-location-lng-${service.id}`} className="text-xs font-semibold text-[var(--color-text)]">Longitud</FieldLabel>
                  <Input
                    id={`container-location-lng-${service.id}`}
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={containerLocation.lng}
                    onChange={(event) => setContainerLocation((current) => ({ ...current, lng: event.target.value }))}
                    required
                  />
                </Field>
              </FieldGroup>
            </FieldGroup>
          </FieldSet>
        )}

        {/* Completion Action Button */}
        {canExecute && service.status === "IN_PROGRESS" && (
          <div className="flex flex-col sm:items-end gap-1">
            <Button
              type="button"
              variant={allZonesRecorded ? "default" : "outline"}
              size="sm"
              disabled={!allZonesRecorded || isCompleting}
              onClick={handleCompleteService}
              className="gap-1.5 font-bold text-xs"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span>{isCompleting ? "Finalizando..." : "Completar servicio"}</span>
            </Button>
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
              {allZonesRecorded
                ? "Todas las zonas registradas. Listo para finalizar."
                : `Pendiente: ${service.zoneIds.length - zoneResults.length} de ${service.zoneIds.length} zona(s)`}
            </span>
          </div>
        )}
      </div>

      {completionSuccessMessage && (
        <Alert variant="success" className="mt-4 text-xs font-semibold" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden />
          <AlertTitle>Servicio completado</AlertTitle>
          <AlertDescription>{completionSuccessMessage}</AlertDescription>
        </Alert>
      )}

      {completionError && (
        <Alert variant="danger" className="mt-4 text-xs font-semibold" role="alert">
          <AlertTriangle aria-hidden />
          <AlertTitle>No se pudo completar el servicio</AlertTitle>
          <AlertDescription>{completionError}</AlertDescription>
        </Alert>
      )}

      {/* Mobile Zone Navigation Disclosure */}
      <div className="min-[761px]:hidden mt-4">
        <Button
          variant="outline"
          type="button"
          ref={mobileToggleRef}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-zone-nav"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="h-auto min-h-12 w-full justify-between rounded-xl border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
        >
          <span className="flex items-center gap-2">
            <span>Zona: {selectedZoneName}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                getResultTag(selectedZoneId).variant === "success"
                  ? "bg-[var(--color-success-fill)] text-[var(--color-success)]"
                  : getResultTag(selectedZoneId).variant === "warning"
                  ? "bg-[var(--color-warning-fill)] text-[var(--color-warning)]"
                  : getResultTag(selectedZoneId).variant === "danger"
                  ? "bg-[var(--color-danger-fill)] text-[var(--color-danger)]"
                  : "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
              }`}
            >
              {getResultTag(selectedZoneId).label}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${
              isMobileNavOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </Button>

        {isMobileNavOpen && (
          <ItemGroup
            id="mobile-zone-nav"
            aria-label="Navegación de zonas del servicio"
            className="mt-2 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-2"
          >
            {service.zoneIds.map((zoneId, idx) => {
              const name = service.zoneNames[idx] ?? zoneId;
              const tag = getResultTag(zoneId);
              const isCurrent = zoneId === selectedZoneId;

              return (
                <Item key={zoneId} className="border-0 p-0">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      handleSelectZone(zoneId);
                      setIsMobileNavOpen(false);
                      // Restore focus correctly to the disclosure trigger
                      mobileToggleRef.current?.focus();
                    }}
                    className={`h-auto min-h-12 w-full justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-[var(--color-action)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <span>{name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isCurrent
                          ? "bg-white/20 text-white"
                          : tag.variant === "success"
                          ? "bg-[var(--color-success-fill)] text-[var(--color-success)]"
                          : tag.variant === "warning"
                          ? "bg-[var(--color-warning-fill)] text-[var(--color-warning)]"
                          : tag.variant === "danger"
                          ? "bg-[var(--color-danger-fill)] text-[var(--color-danger)]"
                          : "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {tag.label}
                    </span>
                  </Button>
                </Item>
              );
            })}
          </ItemGroup>
        )}
      </div>

      {/* Main Layout: Desktop Sidebar Nav + Uninterrupted Zone Form */}
      <div className="mt-5 grid grid-cols-1 min-[761px]:grid-cols-12 gap-6">
        {/* Desktop Zone Navigation */}
        <aside
          aria-label="Navegación de zonas del servicio"
          className="hidden min-[761px]:block min-[761px]:col-span-4 border-r border-[var(--color-border)] pr-4"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            Zonas asignadas ({zoneResults.length}/{service.zoneIds.length})
          </p>
          <ItemGroup aria-label="Zonas asignadas" className="gap-1.5">
            {service.zoneIds.map((zoneId, idx) => {
              const name = service.zoneNames[idx] ?? zoneId;
              const tag = getResultTag(zoneId);
              const isCurrent = zoneId === selectedZoneId;

              return (
                <Item key={zoneId} className="border-0 p-0">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => handleSelectZone(zoneId)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`h-auto min-h-12 w-full justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-[var(--color-action)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-canvas)] border border-transparent hover:border-[var(--color-border)]"
                    }`}
                  >
                    <span className="truncate mr-2">{name}</span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isCurrent
                          ? "bg-white/20 text-white"
                          : tag.variant === "success"
                          ? "bg-[var(--color-success-fill)] text-[var(--color-success)]"
                          : tag.variant === "warning"
                          ? "bg-[var(--color-warning-fill)] text-[var(--color-warning)]"
                          : tag.variant === "danger"
                          ? "bg-[var(--color-danger-fill)] text-[var(--color-danger)]"
                          : "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {tag.label}
                    </span>
                  </Button>
                </Item>
              );
            })}
          </ItemGroup>
        </aside>

        {/* Zone Result Form or Detail View */}
        <div className="min-[761px]:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Zona seleccionada
              </span>
              <h3 className="text-base font-bold text-[var(--color-text)]">
                {selectedZoneName}
              </h3>
            </div>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                getResultTag(selectedZoneId).variant === "success"
                  ? "bg-[var(--color-success-fill)] text-[var(--color-success)] border border-[var(--color-success-line)]"
                  : getResultTag(selectedZoneId).variant === "warning"
                  ? "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border border-[var(--color-warning-line)]"
                  : getResultTag(selectedZoneId).variant === "danger"
                  ? "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border border-[var(--color-danger-line)]"
                  : "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
              }`}
            >
              {getResultTag(selectedZoneId).label}
            </span>
          </div>

          {/* If Zone Result is already recorded */}
          {selectedZoneResult ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-success)]">
                <FileCheck className="h-4 w-4" aria-hidden />
                <span>Resultado registrado el {formatArgentinaDateTime(selectedZoneResult.recordedAt)}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)] block">
                    Resultado:
                  </span>
                  <span className="font-bold text-[var(--color-text)] mt-0.5 block">
                    {ZONE_RESULT_STATUS_LABEL[selectedZoneResult.status]}
                  </span>
                </div>
                {selectedZoneResult.reason && (
                  <div>
                    <span className="font-semibold text-[var(--color-text-secondary)] block">
                      Motivo de excepción:
                    </span>
                    <span className="font-bold text-[var(--color-warning)] mt-0.5 block">
                      {NOT_SERVICED_REASON_LABEL[selectedZoneResult.reason]}
                    </span>
                  </div>
                )}
              </div>

              {selectedZoneResult.notes && (
                <div className="text-xs">
                  <span className="font-semibold text-[var(--color-text-secondary)] block">
                    Observaciones:
                  </span>
                  <p className="mt-1 text-[var(--color-text)] bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-border)]">
                    {selectedZoneResult.notes}
                  </p>
                </div>
              )}

              {/* Attachments List */}
              <div className="text-xs">
                {(() => {
                  const queuedToDisplay = queuedFiles.filter(
                    (q) =>
                      !persistedAttachments.some(
                        (att) =>
                          att.id === q.attachmentId,
                      ),
                  );
                  const totalCount = persistedAttachments.length + queuedToDisplay.length;

                  return (
                    <>
                      <span className="font-semibold text-[var(--color-text-secondary)] block mb-2">
                        Evidencia adjunta ({totalCount}):
                      </span>
                      {!currentEvidence && (
                        <Alert variant="info" role="status"><AlertTitle>Cargando evidencia…</AlertTitle></Alert>
                      )}
                      {currentEvidence?.error && (
                        <Alert variant="danger" role="alert"><AlertTitle>No se pudo cargar la evidencia</AlertTitle><AlertDescription>{currentEvidence.error}</AlertDescription></Alert>
                      )}
                      {totalCount === 0 && currentEvidence && !currentEvidence.error ? (
                        <p className="text-[var(--color-text-secondary)] italic">
                          Sin archivos adjuntos.
                        </p>
                      ) : (
                        <ItemGroup aria-label="Evidencia adjunta" className="gap-1.5">
                          {persistedAttachments.map((att) => (
                            <Item
                              key={att.id}
                              variant="outline"
                              className="flex-nowrap border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs"
                            >
                              <ItemMedia variant="icon" className="text-[var(--color-text-secondary)]"><Paperclip aria-hidden /></ItemMedia>
                              <ItemContent className="min-w-0">
                                <ItemTitle className="max-w-full truncate text-xs font-semibold text-[var(--color-text)]">{att.filename}</ItemTitle>
                                <ItemDescription className="text-[10px]">{att.contentType}</ItemDescription>
                              </ItemContent>
                              <ItemActions className="ml-auto shrink-0 text-[10px] text-[var(--color-text-secondary)]">
                                {att.uploadedAt.slice(0, 10)}
                              </ItemActions>
                            </Item>
                          ))}
                          {queuedToDisplay.map((item) => (
                            <Item
                              key={item.id}
                              variant="outline"
                              className="flex-nowrap border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs"
                            >
                              <ItemMedia variant="icon" className="text-[var(--color-text-secondary)]"><Paperclip aria-hidden /></ItemMedia>
                              <ItemContent className="min-w-0">
                                <ItemTitle className="max-w-full truncate text-xs font-semibold text-[var(--color-text)]">
                                    {item.status === "success" && item.canonicalFilename
                                      ? item.canonicalFilename
                                      : item.localFilename}
                                </ItemTitle>
                                {item.status === "error" && <ItemDescription className="text-[10px] text-[var(--color-danger)]">{item.error}</ItemDescription>}
                              </ItemContent>

                              <ItemActions className="ml-auto shrink-0">
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
                              </ItemActions>
                            </Item>
                          ))}
                        </ItemGroup>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : !canExecute ? (
            /* Read-only Member view when not recorded */
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 text-center text-xs text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text)]">
                Resultado pendiente de registro
              </p>
              <p className="mt-1">
                La persona responsable de la cuadrilla registrará el resultado de esta zona.
              </p>
            </div>
          ) : isCompletedService ? (
            /* Service is already completed */
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 text-center text-xs text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text)]">Servicio finalizado</p>
              <p className="mt-1">No se pueden registrar nuevos resultados en este servicio.</p>
            </div>
          ) : conflict ? (
            <DraftConflictView
              serviceId={service.id}
              actionLabel="resultado de zona"
              composedAgainst={conflict.composedAgainst}
              current={conflict.current}
              onPreserve={handlePreserveDraft}
              onDiscard={handleDiscardDraft}
            />
          ) : (
            /* Crew Leader uninterrupted Form to record result */
            <form noValidate onSubmit={handleSubmitZoneResult} className="space-y-4 text-xs">
              {composedAgainst && (
                <Alert variant="warning" role="status">
                  <CloudOff aria-hidden />
                  <AlertTitle>Borrador local pendiente de envío</AlertTitle>
                  <AlertDescription>Los datos se conservaron en este dispositivo; reenvíelos manualmente cuando recupere la conexión.</AlertDescription>
                </Alert>
              )}

              {formError && (
                <Alert variant="danger" role="alert">
                  <AlertTriangle aria-hidden />
                  <AlertTitle>No se pudo guardar el resultado</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              {/* Status radio selection */}
              <FieldSet className="gap-2">
                <FieldLegend className="font-bold text-[var(--color-text)]">
                  Resultado de la zona *
                </FieldLegend>
                <RadioGroup
                  aria-label="Resultado de la zona"
                  required
                  value={status}
                  onValueChange={(value) => setStatus(value as ZoneResultStatus)}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <FieldLabel
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "SERVICED"
                        ? "border-[var(--color-action)] bg-[var(--color-action)]/5 text-[var(--color-action)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <RadioGroupItem value="SERVICED" />
                    <span>Atendida</span>
                  </FieldLabel>

                  <FieldLabel
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "PARTIAL"
                        ? "border-[var(--color-warning)] bg-[var(--color-warning-fill)]/20 text-[var(--color-warning)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <RadioGroupItem value="PARTIAL" />
                    <span>Parcial</span>
                  </FieldLabel>

                  <FieldLabel
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "NOT_SERVICED"
                        ? "border-[var(--color-danger)] bg-[var(--color-danger-fill)]/20 text-[var(--color-danger)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <RadioGroupItem value="NOT_SERVICED" />
                    <span>No atendida</span>
                  </FieldLabel>
                </RadioGroup>
              </FieldSet>

              {/* Reason selection: mandatory if PARTIAL or NOT_SERVICED */}
              {status !== "SERVICED" && (
                <Field>
                  <FieldLabel
                    htmlFor="zone-reason-select"
                    className="w-full items-center justify-between font-bold text-[var(--color-text)]"
                  >
                    Motivo de la excepción * <span className="text-[10px] text-[var(--color-warning)]">Obligatorio</span>
                  </FieldLabel>
                  <Combobox
                    id="zone-reason-select"
                    value={reason}
                    onChange={(value) => setReason(value as NotServicedReason | "")}
                    options={(Object.keys(NOT_SERVICED_REASON_LABEL) as NotServicedReason[]).map((value) => ({ value, label: NOT_SERVICED_REASON_LABEL[value] }))}
                    placeholder="Seleccione un motivo..."
                    searchPlaceholder="Buscar motivo"
                    emptyText="No hay motivos coincidentes"
                    aria-required="true"
                  />
                </Field>
              )}

              {/* Notes */}
              <Field>
                <FieldLabel htmlFor="zone-notes" className="font-bold text-[var(--color-text)]">
                  Observaciones operativas (opcional)
                </FieldLabel>
                <Textarea
                  id="zone-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre el estado de la zona, incidencias o desvíos..."
                />
              </Field>

              {/* Evidence upload section */}
              <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">
                      Evidencia adjunta
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {status === "SERVICED"
                        ? "Opcional en caso de finalización completa."
                        : "Obligatoria para resultados parciales o no atendidos (fotografía o acta)."}
                    </span>
                  </div>
                  <FieldLabel
                    htmlFor="evidence-input"
                    className="inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    <span>Seleccionar archivo</span>
                  </FieldLabel>
                  <Input
                    id="evidence-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </div>

                {queuedFiles.length > 0 && (
                  <ItemGroup aria-label="Evidencia seleccionada" className="mt-3 gap-2">
                    {queuedFiles.map((item) => (
                      <Item
                        key={item.id}
                        variant="outline"
                        className="flex-nowrap border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs"
                      >
                        <ItemMedia variant="icon" className="text-[var(--color-text-secondary)]"><Paperclip aria-hidden /></ItemMedia>
                        <ItemContent className="min-w-0">
                          {/* Retain local filename until success, then switch to canonical filename */}
                          <ItemTitle className="max-w-full truncate font-semibold text-[var(--color-text)]">
                              {item.status === "success" && item.canonicalFilename
                                ? item.canonicalFilename
                                : item.localFilename}
                          </ItemTitle>
                          {item.status === "error" && <ItemDescription className="text-[10px] text-[var(--color-danger)]">{item.error}</ItemDescription>}
                        </ItemContent>

                        <ItemActions className="ml-auto shrink-0">
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
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              aria-label={`Eliminar ${item.localFilename}`}
                              className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          )}
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto font-bold text-xs gap-1.5"
                >
                  <FileCheck className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    {isSubmitting
                      ? "Guardando resultado..."
                      : composedAgainst
                      ? "Reintentar envío"
                      : "Guardar resultado de zona"}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
