"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileCheck,
  FileText,
  Paperclip,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NOT_SERVICED_REASON_LABEL,
  NotServicedReason,
  Service,
  ServiceRequestError,
  servicesAdapter,
  STATUS_LABEL,
  ZONE_RESULT_STATUS_LABEL,
  ZoneResult,
  ZoneResultStatus,
} from "@/lib/services";
import { getZoneResultsByServiceId } from "@/lib/services-fixtures";

interface QueuedEvidenceFile {
  id: string; // client id
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  error?: string;
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
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => {
    const existing = getZoneResultsByServiceId(service.id);
    const unrecorded = service.zoneIds.find((zid) => !existing.some((r) => r.zoneId === zid));
    return unrecorded ?? service.zoneIds[0];
  });

  // Mobile disclosure state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);

  // Form state for current zone
  const [status, setStatus] = useState<ZoneResultStatus>("SERVICED");
  const [reason, setReason] = useState<NotServicedReason | "">("");
  const [notes, setNotes] = useState("");
  const [queuedFiles, setQueuedFiles] = useState<QueuedEvidenceFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completion state
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionSuccessMessage, setCompletionSuccessMessage] = useState<string | null>(null);

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

  // Reset form when changing zones
  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setStatus("SERVICED");
    setReason("");
    setNotes("");
    setQueuedFiles([]);
    setFormError(null);
  };

  const selectedZoneResult = zoneResults.find((r) => r.zoneId === selectedZoneId);
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
      file,
      localFilename: file.name,
      idempotencyKey:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random()}`,
      status: "pending",
    }));

    setQueuedFiles((prev) => [...prev, ...newQueued]);
    // Reset file input value so same file can be re-selected if removed
    e.target.value = "";
  };

  const handleRemoveFile = (fileId: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadSingleFile = async (
    item: QueuedEvidenceFile,
    zoneResultId: string,
  ): Promise<boolean> => {
    setQueuedFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", error: undefined } : f)),
    );
    try {
      const att = await servicesAdapter.uploadEvidence({
        file: item.file,
        ownerType: "ZONE_RESULT",
        ownerId: zoneResultId,
        idempotencyKey: item.idempotencyKey,
      });

      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: "success",
                canonicalFilename: att.filename,
              }
            : f,
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
    if (!selectedZoneResult) return;
    await uploadSingleFile(item, selectedZoneResult.id);
    // Refresh zone results to include newly uploaded attachment
    try {
      const refreshed = await servicesAdapter.getZoneResults(service.id);
      setZoneResults(refreshed);
    } catch {
      // Ignored
    }
  };

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

    setIsSubmitting(true);
    try {
      // 1. Record ZoneResult
      const createdResult = await servicesAdapter.recordZoneResult(service.id, {
        zoneId: selectedZoneId,
        status,
        reason: status === "SERVICED" ? null : (reason as NotServicedReason),
        notes: notes.trim() || null,
      });

      // 2. Upload any queued evidence files with individual progress/retry capability
      let hasUploadErrors = false;
      if (queuedFiles.length > 0) {
        for (const queued of queuedFiles) {
          const ok = await uploadSingleFile(queued, createdResult.id);
          if (!ok) {
            hasUploadErrors = true;
          }
        }
      }

      // 3. Refresh results
      const refreshed = await servicesAdapter.getZoneResults(service.id);
      setZoneResults(refreshed);

      // 4. Auto-advance to next unrecorded zone only if all uploads succeeded
      if (!hasUploadErrors) {
        const nextUnrecorded = service.zoneIds.find((zid) => !refreshed.some((r) => r.zoneId === zid));
        if (nextUnrecorded) {
          handleSelectZone(nextUnrecorded);
        }
      }
    } catch (err) {
      const msg =
        err instanceof ServiceRequestError
          ? err.message
          : "Ocurrió un error al registrar el resultado de la zona.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completion handling
  const allZonesRecorded =
    service.zoneIds.length > 0 &&
    service.zoneIds.every((zid) => zoneResults.some((r) => r.zoneId === zid));

  const handleCompleteService = async () => {
    setCompletionError(null);
    setCompletionSuccessMessage(null);
    setIsCompleting(true);
    try {
      const updated = await servicesAdapter.complete(service.id);
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
      className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6"
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
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-success-line)] bg-[var(--color-success-fill)]/40 p-3 text-xs font-semibold text-[var(--color-success)]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>{completionSuccessMessage}</span>
        </div>
      )}

      {completionError && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/40 p-3 text-xs font-semibold text-[var(--color-danger)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span>{completionError}</span>
        </div>
      )}

      {/* Mobile Zone Navigation Disclosure */}
      <div className="md:hidden mt-4">
        <button
          type="button"
          ref={mobileToggleRef}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-zone-nav"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)]"
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
        </button>

        {isMobileNavOpen && (
          <ul
            id="mobile-zone-nav"
            role="list"
            className="mt-2 space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-2"
          >
            {service.zoneIds.map((zoneId, idx) => {
              const name = service.zoneNames[idx] ?? zoneId;
              const tag = getResultTag(zoneId);
              const isCurrent = zoneId === selectedZoneId;

              return (
                <li key={zoneId}>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectZone(zoneId);
                      setIsMobileNavOpen(false);
                      // Restore focus correctly to the disclosure trigger
                      mobileToggleRef.current?.focus();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
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
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Main Layout: Desktop Sidebar Nav + Uninterrupted Zone Form */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Desktop Zone Navigation */}
        <aside
          aria-label="Navegación de zonas del servicio"
          className="hidden md:block md:col-span-4 border-r border-[var(--color-border)] pr-4"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            Zonas asignadas ({zoneResults.length}/{service.zoneIds.length})
          </p>
          <ul className="space-y-1.5" role="list">
            {service.zoneIds.map((zoneId, idx) => {
              const name = service.zoneNames[idx] ?? zoneId;
              const tag = getResultTag(zoneId);
              const isCurrent = zoneId === selectedZoneId;

              return (
                <li key={zoneId}>
                  <button
                    type="button"
                    onClick={() => handleSelectZone(zoneId)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-[var(--color-action)] text-white shadow-sm"
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
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Zone Result Form or Detail View */}
        <div className="md:col-span-8">
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
                <span>Resultado registrado el {selectedZoneResult.recordedAt}</span>
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
                      !selectedZoneResult.attachments.some(
                        (att) =>
                          att.filename === q.canonicalFilename || att.filename === q.localFilename,
                      ),
                  );
                  const totalCount = selectedZoneResult.attachments.length + queuedToDisplay.length;

                  return (
                    <>
                      <span className="font-semibold text-[var(--color-text-secondary)] block mb-2">
                        Evidencia adjunta ({totalCount}):
                      </span>
                      {totalCount === 0 ? (
                        <p className="text-[var(--color-text-secondary)] italic">
                          Sin archivos adjuntos.
                        </p>
                      ) : (
                        <ul className="space-y-1.5" role="list">
                          {selectedZoneResult.attachments.map((att) => (
                            <li
                              key={att.id}
                              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />
                                <span className="font-semibold text-[var(--color-text)] truncate">
                                  {att.filename}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-secondary)]">
                                  ({att.contentType})
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0">
                                {att.uploadedAt.slice(0, 10)}
                              </span>
                            </li>
                          ))}
                          {queuedToDisplay.map((item) => (
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
                              </div>
                            </li>
                          ))}
                        </ul>
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
          ) : (
            /* Crew Leader uninterrupted Form to record result */
            <form noValidate onSubmit={handleSubmitZoneResult} className="space-y-4 text-xs">
              {formError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/40 p-3 text-xs font-semibold text-[var(--color-danger)]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{formError}</span>
                </div>
              )}

              {/* Status radio selection */}
              <fieldset className="space-y-2">
                <legend className="font-bold text-[var(--color-text)]">
                  Resultado de la zona *
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "SERVICED"
                        ? "border-[var(--color-action)] bg-[var(--color-action)]/5 text-[var(--color-action)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone-status"
                      value="SERVICED"
                      checked={status === "SERVICED"}
                      onChange={() => setStatus("SERVICED")}
                      className="sr-only"
                    />
                    <span>Atendida</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "PARTIAL"
                        ? "border-[var(--color-warning)] bg-[var(--color-warning-fill)]/20 text-[var(--color-warning)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone-status"
                      value="PARTIAL"
                      checked={status === "PARTIAL"}
                      onChange={() => setStatus("PARTIAL")}
                      className="sr-only"
                    />
                    <span>Parcial</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                      status === "NOT_SERVICED"
                        ? "border-[var(--color-danger)] bg-[var(--color-danger-fill)]/20 text-[var(--color-danger)] font-bold"
                        : "border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="zone-status"
                      value="NOT_SERVICED"
                      checked={status === "NOT_SERVICED"}
                      onChange={() => setStatus("NOT_SERVICED")}
                      className="sr-only"
                    />
                    <span>No atendida</span>
                  </label>
                </div>
              </fieldset>

              {/* Reason selection: mandatory if PARTIAL or NOT_SERVICED */}
              {status !== "SERVICED" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="zone-reason-select"
                    className="font-bold text-[var(--color-text)] flex items-center justify-between"
                  >
                    <span>Motivo de la excepción *</span>
                    <span className="text-[10px] text-[var(--color-warning)]">Obligatorio</span>
                  </label>
                  <select
                    id="zone-reason-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as NotServicedReason)}
                    required
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action)]"
                  >
                    <option value="">Seleccione un motivo...</option>
                    {(Object.keys(NOT_SERVICED_REASON_LABEL) as NotServicedReason[]).map((r) => (
                      <option key={r} value={r}>
                        {NOT_SERVICED_REASON_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label htmlFor="zone-notes" className="font-bold text-[var(--color-text)]">
                  Observaciones operativas (opcional)
                </label>
                <textarea
                  id="zone-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre el estado de la zona, incidencias o desvíos..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action)]"
                />
              </div>

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
                  <label
                    htmlFor="evidence-input"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    <span>Seleccionar archivo</span>
                  </label>
                  <input
                    id="evidence-input"
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
                            {/* Retain local filename until success, then switch to canonical filename */}
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

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto font-bold text-xs gap-1.5"
                >
                  <FileCheck className="h-3.5 w-3.5" aria-hidden />
                  <span>{isSubmitting ? "Guardando resultado..." : "Guardar resultado de zona"}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
