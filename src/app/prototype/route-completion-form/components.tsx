"use client";

import * as Select from "@radix-ui/react-select";
import * as Tabs from "@radix-ui/react-tabs";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  CloudOff,
  FileImage,
  LoaderCircle,
  RefreshCcw,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { REASONS, ZONE_STATUSES, type EvidenceUpload, type ZoneStatus } from "./model";

const STATUS_COPY: Record<ZoneStatus, string> = {
  SERVICED: "Atendida",
  PARTIAL: "Parcial",
  NOT_SERVICED: "No atendida",
};

export function StatusPill({ status }: { status: ZoneStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "SERVICED" && "bg-emerald-50 text-emerald-700",
        status === "PARTIAL" && "bg-amber-50 text-amber-800",
        status === "NOT_SERVICED" && "bg-red-50 text-red-700",
      )}
    >
      {status === "SERVICED" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {STATUS_COPY[status]}
    </span>
  );
}

function RadixSelect({
  value,
  onValueChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  label: string;
}) {
  return (
    <Select.Root value={value || undefined} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={label}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-left text-sm text-neutral-800 outline-none transition focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon><ChevronDown className="h-4 w-4 text-neutral-500" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-[0_14px_40px_rgba(15,44,89,0.16)]"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-10 cursor-default select-none items-center rounded-lg py-2 pl-9 pr-3 text-sm text-neutral-800 outline-none data-[highlighted]:bg-navy/5 data-[highlighted]:text-navy"
              >
                <Select.ItemIndicator className="absolute left-3"><Check className="h-4 w-4" /></Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function ZoneStatusSelect({ value, onChange }: { value: ZoneStatus; onChange: (value: ZoneStatus) => void }) {
  return (
    <RadixSelect
      value={value}
      onValueChange={(next) => onChange(next as ZoneStatus)}
      label="Resultado de la zona"
      placeholder="Elegí un resultado"
      options={ZONE_STATUSES.map((status) => ({ value: status, label: STATUS_COPY[status] }))}
    />
  );
}

export function ReasonSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <RadixSelect
      value={value}
      onValueChange={onChange}
      label="Motivo de la excepción"
      placeholder="Elegí un motivo"
      options={REASONS.map((reason) => ({ value: reason, label: reason }))}
    />
  );
}

export function FieldLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-neutral-800">
      {children}
      {optional && <span className="text-xs font-normal text-neutral-500">Opcional</span>}
    </span>
  );
}

export function FieldError({ errors }: { errors: unknown[] }) {
  if (!errors.length) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700" role="alert">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {errors.map((error) => typeof error === "string" ? error : (error as { message?: string }).message).filter(Boolean).join(" ")}
    </p>
  );
}

export function EvidenceQueue({
  zoneId,
  uploads,
  offline,
  onAdd,
  onRetry,
  onRemove,
}: {
  zoneId: string;
  uploads: EvidenceUpload[];
  offline: boolean;
  onAdd: (zoneId: string, files: FileList | null) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <label className="group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center transition hover:border-navy/50 hover:bg-navy/[0.025] focus-within:ring-2 focus-within:ring-navy focus-within:ring-offset-2">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(event) => {
            onAdd(zoneId, event.target.files);
            event.currentTarget.value = "";
          }}
        />
        {offline ? <CloudOff className="h-6 w-6 text-amber-700" /> : <Camera className="h-6 w-6 text-navy" />}
        <span className="mt-2 text-sm font-semibold text-neutral-800">
          {offline ? "Guardar foto en el borrador" : "Tomar foto o elegir archivo"}
        </span>
        <span className="mt-1 text-xs text-neutral-500">JPG, PNG o HEIC · se sube por archivo</span>
      </label>

      <ul className="mt-3 space-y-2" aria-label="Archivos de evidencia">
        {uploads.map((upload) => (
          <li key={upload.id} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5">
            <FileImage className="h-5 w-5 shrink-0 text-neutral-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800">{upload.fileName}</p>
              <p className="text-xs text-neutral-500">
                {upload.state === "queued" && "En el borrador · pendiente de envío manual"}
                {upload.state === "uploading" && "Subiendo…"}
                {upload.state === "uploaded" && "Subida · referencia vinculada"}
                {upload.state === "failed" && "Falló la subida · el archivo sigue disponible"}
              </p>
            </div>
            {upload.state === "uploading" && <LoaderCircle className="h-4 w-4 animate-spin text-navy" />}
            {upload.state === "uploaded" && <Check className="h-4 w-4 text-emerald-700" />}
            {upload.state === "failed" && (
              <button type="button" onClick={() => onRetry(upload.id)} className="rounded-md p-2 text-navy hover:bg-navy/5" aria-label={`Reintentar ${upload.fileName}`}>
                <RefreshCcw className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => onRemove(upload.id)} className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700" aria-label={`Quitar ${upload.fileName}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResultEvidenceTabs({ result, evidence, showEvidence = false }: { result: ReactNode; evidence: ReactNode; showEvidence?: boolean }) {
  const [tab, setTab] = useState<"result" | "evidence">("result");

  useEffect(() => {
    if (showEvidence) setTab("evidence");
  }, [showEvidence]);

  return (
    <Tabs.Root value={tab} onValueChange={(value) => setTab(value as "result" | "evidence")}>
      <Tabs.List className="mb-5 flex border-b border-neutral-200" aria-label="Datos de la zona">
        <Tabs.Trigger value="result" className="border-b-2 border-transparent px-1 pb-2.5 pr-5 text-sm font-semibold text-neutral-500 data-[state=active]:border-navy data-[state=active]:text-navy">Resultado</Tabs.Trigger>
        <Tabs.Trigger value="evidence" className="border-b-2 border-transparent px-5 pb-2.5 text-sm font-semibold text-neutral-500 data-[state=active]:border-navy data-[state=active]:text-navy">Evidencia</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="result" className="outline-none">{result}</Tabs.Content>
      <Tabs.Content value="evidence" className="outline-none">{evidence}</Tabs.Content>
    </Tabs.Root>
  );
}

export function UploadArchitectureNote() {
  return (
    <div className="mt-3 flex gap-2 rounded-xl bg-navy/[0.045] p-3 text-xs leading-5 text-navy">
      <UploadCloud className="mt-0.5 h-4 w-4 shrink-0" />
      Cada archivo conserva una clave de idempotencia. Reintentar repite la misma carga; no crea evidencia duplicada.
    </div>
  );
}
