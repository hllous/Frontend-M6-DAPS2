"use client";
import { errorMessage } from "@/lib/error-message";

import { useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  RefreshCw,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  EVIDENCE_FILE_SIZE_LABEL,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "@/lib/evidence-limits";
import { containersAdapter, ContainerRequestError } from "@/lib/containers";
import { EvidenceUploadField } from "./evidence-upload-field";

export interface QueuedEvidenceFile {
  id: string;
  file: File;
  localFilename: string;
  idempotencyKey: string;
  status: "pending" | "uploading" | "success" | "error";
  canonicalFilename?: string;
  error?: string;
}

export const MAX_FILE_SIZE = MAX_EVIDENCE_FILE_SIZE_BYTES;
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,application/pdf";

export function useEvidenceQueue() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedEvidenceFile[]>([]);
  const [fileValidationError, setFileValidationError] = useState<string | null>(
    null,
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileValidationError(null);
    const newQueued: QueuedEvidenceFile[] = [];
    const rejectedErrors: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        rejectedErrors.push(
          `"${file.name}" pesa más de ${EVIDENCE_FILE_SIZE_LABEL}.`,
        );
        continue;
      }
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        rejectedErrors.push(
          `"${file.name}" no es una foto ni un PDF.`,
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
      prev.map((f) =>
        f.id === item.id ? { ...f, status: "uploading", error: undefined } : f,
      ),
    );
    try {
      const att = await containersAdapter.uploadEvidence({
        file: item.file,
        containerId,
        idempotencyKey: item.idempotencyKey,
      });
      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "success", canonicalFilename: att.filename }
            : f,
        ),
      );
      return true;
    } catch (err) {
      const msg = errorMessage(err, "No se pudo subir el archivo. Intente nuevamente.");
      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "error", error: msg } : f,
        ),
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

  const errorId = `${inputId}-error`;

  return (
    <Field data-invalid={Boolean(fileValidationError)} data-disabled={disabled}>
      <p className="text-sm font-medium text-foreground">Evidencia adjunta</p>
      <FieldDescription id={`${inputId}-help`}>
        Formatos JPEG, PNG, WebP o PDF hasta {EVIDENCE_FILE_SIZE_LABEL}.
      </FieldDescription>
      <EvidenceUploadField
        id={inputId}
        accept={ACCEPTED_FILE_TYPES}
        describedBy={`${inputId}-help${fileValidationError ? ` ${errorId}` : ""}`}
        multiple
        onChange={onFileSelect}
        disabled={disabled}
        invalid={Boolean(fileValidationError)}
      />
      {fileValidationError && (
        <Alert id={errorId} variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertDescription>{fileValidationError}</AlertDescription>
        </Alert>
      )}
      {queuedFiles.length > 0 && (
        <ItemGroup
          aria-label="Archivos adjuntos seleccionados"
          className="gap-2"
        >
          {queuedFiles.map((item) => (
            <Item
              key={item.id}
              variant="outline"
              size="sm"
              className="flex-wrap"
            >
              <ItemMedia variant="icon">
                <Paperclip aria-hidden />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="break-all">
                  {item.status === "success" && item.canonicalFilename
                    ? item.canonicalFilename
                    : item.localFilename}
                </ItemTitle>
                {item.status === "error" && (
                  <Alert variant="destructive">
                    <AlertDescription>{item.error}</AlertDescription>
                  </Alert>
                )}
              </ItemContent>
              <ItemActions className="flex-wrap">
                {item.status === "pending" && (
                  <Badge variant="secondary">Pendiente</Badge>
                )}
                {item.status === "uploading" && (
                  <Badge variant="info">
                    <Spinner data-icon="inline-start" />
                    Subiendo…
                  </Badge>
                )}
                {item.status === "success" && (
                  <Badge variant="success">
                    <CheckCircle2 data-icon="inline-start" aria-hidden />
                    Subido
                  </Badge>
                )}
                {item.status === "error" && onRetryFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onRetryFile(item)}
                  >
                    <RefreshCw data-icon="inline-start" aria-hidden />
                    Reintentar
                  </Button>
                )}
                {item.status !== "uploading" && item.status !== "success" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={() => onRemoveFile(item.id)}
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
  );
}
