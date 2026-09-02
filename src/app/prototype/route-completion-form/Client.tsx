"use client";

// PROTOTYPE for Wayfinder ticket "Prototype a complex operational form and
// validate the UI seams". Three presentations share one TanStack Form + Zod
// state model and are switchable with ?variant=A|B|C.
import * as Dialog from "@radix-ui/react-dialog";
import { Temporal } from "@js-temporal/polyfill";
import { useSearchParams } from "next/navigation";
import { Inter } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, FlaskConical, Save, Send, ServerCog, X } from "lucide-react";
import { PrototypeSwitcher, type VariantMeta } from "../map-table/components/PrototypeSwitcher";
import { CompletionSchema, INITIAL_VALUES, type CompletionValues, type EvidenceUpload } from "./model";
import { useCompletionForm } from "./useCompletionForm";
import { VariantA, VariantB, VariantC } from "./variants";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const VARIANTS: VariantMeta[] = [
  { key: "A", name: "Matriz operativa" },
  { key: "B", name: "Mix seleccionado" },
  { key: "C", name: "Paso enfocado" },
];

type DraftState = "clean" | "dirty" | "saved-local" | "submitting" | "submitted" | "conflict";

function DraftWatcher({ values, snapshot, onDirty }: { values: CompletionValues; snapshot: CompletionValues | null; onDirty: () => void }) {
  useEffect(() => {
    if (snapshot && JSON.stringify(values) !== JSON.stringify(snapshot)) onDirty();
  }, [onDirty, snapshot, values]);
  return null;
}

export function RouteCompletionPrototype() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "B";
  const [offline, setOffline] = useState(false);
  const [serverChanged, setServerChanged] = useState(false);
  const failNextUpload = useRef(false);
  const cancelledUploadIds = useRef(new Set<string>());
  const [uploads, setUploads] = useState<EvidenceUpload[]>([]);
  const [draftState, setDraftState] = useState<DraftState>("dirty");
  const [draftSnapshot, setDraftSnapshot] = useState<CompletionValues | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [invalidZoneIndex, setInvalidZoneIndex] = useState<number | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [currentCrew, setCurrentCrew] = useState("Cuadrilla Norte 2");

  async function submit(values: CompletionValues) {
    if (offline) {
      setDraftSnapshot(values);
      setDraftState("saved-local");
      return;
    }
    if (serverChanged && draftSnapshot) {
      setDraftState("conflict");
      setConflictOpen(true);
      return;
    }
    const stamped = { ...values, recordedAt: values.recordedAt || Temporal.Now.instant().toString() };
    form.setFieldValue("recordedAt", stamped.recordedAt);
    setDraftState("submitting");
    await new Promise((resolve) => setTimeout(resolve, 650));
    setDraftState("submitted");
    setDraftSnapshot(null);
  }

  const form = useCompletionForm(submit);
  const capturedAt = useMemo(
    () => Temporal.Now.instant().toZonedDateTimeISO("America/Argentina/Buenos_Aires").toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }),
    [],
  );

  function updateEvidenceReference(zoneId: string, uploadId: string, remove = false) {
    const index = form.state.values.zoneResults.findIndex((zone) => zone.zoneId === zoneId);
    if (index < 0) return;
    const current = form.getFieldValue(`zoneResults[${index}].evidenceIds`);
    form.setFieldValue(
      `zoneResults[${index}].evidenceIds`,
      remove ? current.filter((id) => id !== uploadId) : Array.from(new Set([...current, uploadId])),
    );
  }

  function finishUpload(id: string, zoneId: string) {
    setTimeout(() => {
      if (cancelledUploadIds.current.has(id)) return;
      const failed = failNextUpload.current;
      if (failed) failNextUpload.current = false;
      setUploads((current) => current.map((upload) => upload.id === id ? { ...upload, state: failed ? "failed" : "uploaded" } : upload));
      if (!failed) updateEvidenceReference(zoneId, id);
    }, 700);
  }

  function addFiles(zoneId: string, files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = crypto.randomUUID();
      const upload: EvidenceUpload = {
        id,
        zoneId,
        fileName: file.name,
        size: file.size,
        state: offline ? "queued" : "uploading",
        idempotencyKey: crypto.randomUUID(),
      };
      setUploads((current) => [...current, upload]);
      if (offline) updateEvidenceReference(zoneId, id);
      else finishUpload(id, zoneId);
    });
    setDraftState("dirty");
  }

  function retryUpload(id: string) {
    const upload = uploads.find((item) => item.id === id);
    if (!upload || offline) return;
    setUploads((current) => current.map((item) => item.id === id ? { ...item, state: "uploading" } : item));
    finishUpload(id, upload.zoneId);
  }

  function removeUpload(id: string) {
    const upload = uploads.find((item) => item.id === id);
    cancelledUploadIds.current.add(id);
    if (upload) updateEvidenceReference(upload.zoneId, id, true);
    setUploads((current) => current.filter((item) => item.id !== id));
  }

  function clearZoneUploads(zoneId: string) {
    uploads.filter((upload) => upload.zoneId === zoneId).forEach((upload) => cancelledUploadIds.current.add(upload.id));
    setUploads((current) => current.filter((upload) => upload.zoneId !== zoneId));
  }

  function reconnect() {
    setOffline(false);
    const queued = uploads.filter((upload) => upload.state === "queued");
    setUploads((current) => current.map((upload) => upload.state === "queued" ? { ...upload, state: "uploading" } : upload));
    queued.forEach((upload) => finishUpload(upload.id, upload.zoneId));
  }

  const shared = {
    form,
    uploads,
    offline,
    onAddFiles: addFiles,
    onRetry: retryUpload,
    onRemove: removeUpload,
    onZoneServiced: clearZoneUploads,
    invalidZoneIndex,
  };
  const uploadsBlockingSubmission = !offline && uploads.some((upload) => upload.state !== "uploaded");

  return (
    <div className={`${inter.className} prototype-form flex min-h-screen flex-col bg-[#FAFAFA] text-[#1A1A1A]`}>
      <header className="bg-navy text-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><FlaskConical className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold tracking-tight">M6 · Ambiente e Higiene</p>
              <p className="text-xs text-blue-100">Prototipo descartable · cierre de recorrido</p>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-white/15 md:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">SER-2026-0184 · Recolección domiciliaria</p>
            <p className="text-xs text-blue-100">Ruta 04 Norte · {currentCrew} · captura {capturedAt}</p>
          </div>
          <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100">En curso</span>
        </div>
      </header>

      <div className="border-b border-neutral-200 bg-white px-4 py-2.5 lg:px-7">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => offline ? reconnect() : setOffline(true)}
            className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${offline ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
          >
            {offline ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
            {offline ? "Sin conexión · reconectar" : "En línea · simular corte"}
          </button>
          <button
            type="button"
            onClick={() => setServerChanged((value) => !value)}
            className={serverChanged
              ? "flex min-h-9 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-800"
              : "flex min-h-9 items-center gap-2 rounded-lg bg-neutral-100 px-3 text-sm font-semibold text-neutral-700"}
          >
            <ServerCog className="h-4 w-4" />{serverChanged ? "El Service cambió" : "Simular cambio servidor"}
          </button>
          <button type="button" onClick={() => { failNextUpload.current = true; }} className="min-h-9 rounded-lg bg-neutral-100 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-200">Fallará la próxima foto</button>
          <div className="flex-1" />
          <span className="text-xs font-medium text-neutral-500">Estado: <strong className="text-neutral-800">{draftState}</strong></span>
        </div>
      </div>

      {draftState === "saved-local" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-sm">
            <Save className="h-4 w-4" />
            <strong>Borrador guardado en este dispositivo.</strong>
            <span>No se enviará solo. Reconectá y elegí “Enviar borrador”.</span>
          </div>
        </div>
      )}

      {draftState === "conflict" && !conflictOpen && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-red-950">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <strong>El borrador está bloqueado por un conflicto.</strong>
            <button type="button" onClick={() => setConflictOpen(true)} className="font-semibold text-red-900 underline decoration-red-400 underline-offset-4">Revisar versiones</button>
          </div>
        </div>
      )}

      {validationMessage && (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
          <div className="mx-auto max-w-[1600px]">{validationMessage}</div>
        </div>
      )}

      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const result = CompletionSchema.safeParse(form.state.values);
          if (!result.success) {
            const zoneIssue = result.error.issues.find((issue) => issue.path[0] === "zoneResults");
            const zoneIndex = typeof zoneIssue?.path[1] === "number" ? zoneIssue.path[1] : null;
            setInvalidZoneIndex(zoneIndex);
            setValidationMessage(zoneIndex === null ? result.error.issues[0]?.message ?? "Revisá los campos obligatorios." : `Revisá ${form.state.values.zoneResults[zoneIndex].zoneName}: ${zoneIssue?.message}`);
            void form.handleSubmit();
            setTimeout(() => {
              const target = zoneIndex === null
                ? document.querySelector<HTMLElement>("[data-form-field=\"overallNote\"]")
                : document.querySelector<HTMLElement>(`[data-zone-index="${zoneIndex}"]`);
              target?.focus();
            }, 0);
            return;
          }
          setInvalidZoneIndex(null);
          setValidationMessage(null);
          void form.handleSubmit();
        }}
      >
        {variant === "A" && <VariantA {...shared} />}
        {variant === "B" && <VariantB {...shared} />}
        {variant === "C" && <VariantC {...shared} />}

        <div className="mt-auto border-t border-neutral-200 bg-white px-4 py-4 pb-24 lg:px-7">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3">
            <form.Field name="overallNote">
              {(field) => (
                <label className="min-w-[260px] flex-1" data-form-field="overallNote" tabIndex={-1}>
                  <span className="sr-only">Observación general opcional</span>
                  <input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="Observación general (opcional)" className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2" />
                  {field.state.meta.errors.length > 0 && <span role="alert" className="mt-1 block text-sm text-red-700">{field.state.meta.errors.map((error) => typeof error === "string" ? error : (error as { message?: string }).message).filter(Boolean).join(" ")}</span>}
                </label>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <button type="submit" disabled={!canSubmit || isSubmitting || uploadsBlockingSubmission} title={uploadsBlockingSubmission ? "Resolvé las cargas pendientes antes de enviar" : undefined} className="flex min-h-11 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50">
                  {offline ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {offline ? (draftState === "saved-local" ? "Borrador guardado" : "Guardar borrador local") : draftSnapshot ? (draftState === "dirty" ? "Enviar cambios" : "Enviar borrador") : "Enviar resultados y completar"}
                </button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </form>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => <DraftWatcher values={values} snapshot={draftSnapshot} onDirty={() => { if (draftState === "saved-local") setDraftState("dirty"); }} />}
      </form.Subscribe>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {offline ? "Sin conexión." : "Con conexión."} Estado del borrador: {draftState}. {uploads.filter((upload) => upload.state === "queued").length} archivos guardados localmente. {uploads.filter((upload) => upload.state === "uploading").length} archivos subiendo. {uploads.filter((upload) => upload.state === "uploaded").length} archivos subidos. {uploads.filter((upload) => upload.state === "failed").length} cargas fallidas.
      </div>

      <form.Subscribe selector={(state) => ({ values: state.values, errors: state.errors, canSubmit: state.canSubmit })}>
        {(state) => (
          <details className="fixed bottom-4 right-4 z-40 hidden w-[430px] max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-700 bg-neutral-950 text-white shadow-[0_18px_48px_rgba(0,0,0,0.3)] xl:block">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold">Estado observable · TanStack Form + Zod</summary>
            <pre className="max-h-72 overflow-auto border-t border-white/10 p-4 text-[10px] leading-4 text-neutral-300">{JSON.stringify({ ...state, draftState, offline, uploads }, null, 2)}</pre>
          </details>
        )}
      </form.Subscribe>

      <Dialog.Root open={conflictOpen} onOpenChange={setConflictOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-navy/55" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(15,44,89,0.35)] outline-none sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-coral"><AlertTriangle className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-xl font-bold tracking-[-0.02em] text-neutral-950">El Service cambió mientras trabajabas</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-neutral-600">La versión del servidor fue reasignada a Cuadrilla Centro 1 a las 16:08. Tu borrador no se aplicó y sigue intacto en este dispositivo.</Dialog.Description>
              </div>
              <Dialog.Close className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Cerrar"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-neutral-100 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Tu base</p><p className="mt-2 text-sm font-semibold">Cuadrilla Norte 2</p><p className="mt-1 text-xs text-neutral-600">Actualizado 15:14 · 1 excepción</p></div>
              <div className="rounded-xl bg-red-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Servidor actual</p><p className="mt-2 text-sm font-semibold">Cuadrilla Centro 1</p><p className="mt-1 text-xs text-red-700">Actualizado 16:08 · reasignado</p></div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setConflictOpen(false); setDraftState("conflict"); }} className="min-h-11 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Conservar y volver</button>
              <button type="button" onClick={() => {
                uploads.forEach((upload) => cancelledUploadIds.current.add(upload.id));
                form.reset({ ...INITIAL_VALUES, baseUpdatedAt: "2026-09-02T19:08:00Z" });
                setUploads([]);
                setConflictOpen(false);
                setDraftSnapshot(null);
                setDraftState("clean");
                setServerChanged(false);
                setCurrentCrew("Cuadrilla Centro 1");
              }} className="min-h-11 rounded-xl bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-light">Descartar y cargar versión actual</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {draftState === "submitted" && (
        <div role="status" className="fixed left-1/2 top-20 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(4,120,87,0.3)]"><CheckCircle2 className="h-4 w-4" />Resultados enviados; el servidor calculará el estado final.</div>
      )}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
