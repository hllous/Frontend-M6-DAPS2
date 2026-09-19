"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, Paperclip, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { containersAdapter, ContainerRequestError } from "@/lib/containers";

export interface QueuedEvidenceFile {
  id: string;
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  error?: string;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

export function useEvidenceQueue() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedEvidenceFile[]>([]);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileValidationError(null);
    const newQueued: QueuedEvidenceFile[] = [];
    const rejectedErrors: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        rejectedErrors.push(
          `"${file.name}" supera el tamaño máximo permitido de 10 MB.`,
        );
        continue;
      }
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        rejectedErrors.push(
          `"${file.name}" tiene un formato no permitido (${file.type || "desconocido"}). Formatos admitidos: JPEG, PNG, WebP, PDF.`,
        );
        continue;
      }

      newQueued.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        localFilename: file.name,
        idempotencyKey:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: "pending",
      });
    }

    if (rejectedErrors.length > 0) {
      setFileValidationError(rejectedErrors.join(" "));
    }
    if (newQueued.length > 0) {
      setQueuedFiles((prev) => [...prev, ...newQueued]);
    }
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingle = async (
    containerId: string,
    item: QueuedEvidenceFile,
  ): Promise<boolean> => {
    setQueuedFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", error: undefined } : f)),
    );
    try {
      const att = await containersAdapter.uploadEvidence({
        file: item.file,
        containerId,
        idempotencyKey: item.idempotencyKey,
      });
      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "success", canonicalFilename: att.filename } : f,
        ),
      );
      return true;
    } catch (err) {
      const msg =
        err instanceof ContainerRequestError || err instanceof Error
          ? err.message
          : "Error al subir el archivo";
      setQueuedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: msg } : f)),
      );
      return false;
    }
  };

  const uploadAll = async (containerId: string): Promise<boolean> => {
    let allOk = true;
    for (const item of queuedFiles) {
      if (item.status === "success") continue;
      const ok = await uploadSingle(containerId, item);
      if (!ok) allOk = false;
    }
    return allOk;
  };

  const reset = () => {
    setQueuedFiles([]);
    setFileValidationError(null);
  };

  return {
    queuedFiles,
    fileValidationError,
    handleFileSelect,
    removeFile,
    uploadSingle,
    uploadAll,
    reset,
  };
}

interface EvidenceQueueViewProps {
  queuedFiles: QueuedEvidenceFile[];
  fileValidationError: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string) => void;
  onRetryFile?: (item: QueuedEvidenceFile) => void;
  disabled?: boolean;
}

export function EvidenceQueueView({
  queuedFiles,
  fileValidationError,
  onFileSelect,
  onRemoveFile,
  onRetryFile,
  disabled = false,
}: EvidenceQueueViewProps) {
  const inputId = useId();

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-xs font-semibold text-foreground">
            Evidencia adjunta
          </span>
          <span className="text-[11px] text-muted-foreground">
            Opcional. Formatos JPEG, PNG, WebP o PDF hasta 10 MB.
          </span>
        </div>
        <label
          htmlFor={inputId}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-muted cursor-pointer"
          }`}
        >
          <Upload className="size-3.5" aria-hidden />
          <span>Seleccionar archivo</span>
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={onFileSelect}
          disabled={disabled}
          className="sr-only"
        />
      </div>

      {fileValidationError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <span>{fileValidationError}</span>
        </div>
      )}

      {queuedFiles.length > 0 && (
        <ul className="space-y-2" role="list" aria-label="Archivos adjuntos seleccionados">
          {queuedFiles.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <span className="block font-medium text-foreground truncate">
                    {item.status === "success" && item.canonicalFilename
                      ? item.canonicalFilename
                      : item.localFilename}
                  </span>
                  {item.status === "error" && (
                    <span className="block text-[11px] text-destructive">
                      {item.error}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.status === "pending" && (
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                    Pendiente
                  </span>
                )}
                {item.status === "uploading" && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                    Subiendo…
                  </span>
                )}
                {item.status === "success" && (
                  <span className="flex items-center gap-1 rounded bg-[var(--color-success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                    <CheckCircle2 className="size-3" aria-hidden />
                    Subido
                  </span>
                )}
                {item.status === "error" && onRetryFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryFile(item)}
                    className="h-6 gap-1 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="size-3" aria-hidden />
                    <span>Reintentar</span>
                  </Button>
                )}
                {item.status !== "uploading" && item.status !== "success" && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label={`Eliminar ${item.localFilename}`}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
