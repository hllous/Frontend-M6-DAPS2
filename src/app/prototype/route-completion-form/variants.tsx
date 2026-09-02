"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ListChecks, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceQueue, FieldError, StatusPill, UploadArchitectureNote } from "./components";
import { ZoneResultSchema, type CompletionValues, type EvidenceUpload } from "./model";
import type { CompletionForm } from "./useCompletionForm";
import { ZoneResultFields } from "./ZoneFields";

type VariantProps = {
  form: CompletionForm;
  uploads: EvidenceUpload[];
  offline: boolean;
  onAddFiles: (zoneId: string, files: FileList | null) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onZoneServiced: (zoneId: string) => void;
  invalidZoneIndex: number | null;
};

function ZoneNavigation({
  zones,
  selectedIndex,
  onSelect,
}: {
  zones: CompletionValues["zoneResults"];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="p-2" aria-label="Zonas del recorrido">
      {zones.map((zone, index) => (
        <button
          key={zone.zoneId}
          type="button"
          aria-current={selectedIndex === index ? "true" : undefined}
          onClick={() => onSelect(index)}
          className={cn("mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left", selectedIndex === index ? "bg-navy text-white" : "hover:bg-neutral-100")}
        >
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", selectedIndex === index ? "bg-white/15" : "bg-neutral-100 text-neutral-600")}>{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{zone.zoneName}</span>
            <span className={cn("block text-xs", selectedIndex === index ? "text-blue-100" : "text-neutral-500")}>{zone.zoneId}</span>
          </span>
          <StatusPill status={zone.status} />
        </button>
      ))}
    </nav>
  );
}

function EvidenceForZone(props: VariantProps & { zoneId: string }) {
  const zoneIndex = props.form.state.values.zoneResults.findIndex((zone) => zone.zoneId === props.zoneId);
  return (
    <div>
      <props.form.Field name={`zoneResults[${zoneIndex}].evidenceIds`}>
        {(field) => (
          <>
            <EvidenceQueue
              zoneId={props.zoneId}
              uploads={props.uploads.filter((upload) => upload.zoneId === props.zoneId)}
              offline={props.offline}
              onAdd={props.onAddFiles}
              onRetry={props.onRetry}
              onRemove={props.onRemove}
            />
            <FieldError errors={field.state.meta.errors} />
          </>
        )}
      </props.form.Field>
      <UploadArchitectureNote />
    </div>
  );
}

export function VariantA(props: VariantProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([1]));

  useEffect(() => {
    if (props.invalidZoneIndex === null) return;
    setExpanded((current) => new Set(Array.from(current).concat(props.invalidZoneIndex!)));
  }, [props.invalidZoneIndex]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 lg:px-7">
      <div className="mb-5 flex items-end justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.025em] text-navy">Matriz de cierre por zona</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">Recomendada para recorridos largos: hace visibles los faltantes y permite comparar resultados sin perder contexto.</p>
        </div>
        <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 lg:block">Vista densa · escritorio/tablet</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <props.form.Subscribe selector={(state) => state.values.zoneResults}>
          {(zones) => zones.map((zone, index) => (
            <details
              key={zone.zoneId}
              open={expanded.has(index)}
              onToggle={(event) => {
                const open = event.currentTarget.open;
                setExpanded((current) => {
                  const next = new Set(current);
                  if (open) next.add(index); else next.delete(index);
                  return next;
                });
              }}
              data-zone-index={index}
              tabIndex={-1}
              className="group border-b border-neutral-200 outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 marker:content-none hover:bg-neutral-50 lg:px-6">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold", zone.status === "SERVICED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900">{zone.zoneName}</p>
                  <p className="text-xs text-neutral-500">{zone.zoneId}</p>
                </div>
                <StatusPill status={zone.status} />
                <span className="hidden min-w-28 text-right text-xs text-neutral-500 sm:block">
                  {zone.evidenceIds.length ? `${zone.evidenceIds.length} archivo(s)` : zone.status === "SERVICED" ? "Sin evidencia" : "Evidencia pendiente"}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 transition group-open:rotate-90" />
              </summary>
              <div className="border-t border-neutral-100 bg-neutral-50/55 px-4 py-5 lg:px-20">
                <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
                  <ZoneResultFields form={props.form} index={index} evidence={<></>} onZoneServiced={props.onZoneServiced} />
                  <div>
                    <p className="mb-2 text-sm font-semibold text-neutral-800">Evidencia de esta zona</p>
                    <EvidenceForZone {...props} zoneId={zone.zoneId} />
                  </div>
                </div>
              </div>
            </details>
          ))}
        </props.form.Subscribe>
      </div>
    </div>
  );
}

export function VariantB(props: VariantProps) {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [mobileZonesOpen, setMobileZonesOpen] = useState(false);
  const mobileZoneTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (props.invalidZoneIndex !== null) setSelectedIndex(props.invalidZoneIndex);
  }, [props.invalidZoneIndex]);

  return (
    <div className="grid min-h-[680px] flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-neutral-200 bg-white lg:border-b-0 lg:border-r">
        <div className="hidden lg:block">
          <div className="border-b border-neutral-200 px-5 py-5">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-navy">Zonas del recorrido</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Elegí una zona y resolvé resultado, detalle y evidencia en un único formulario.</p>
          </div>
          <props.form.Subscribe selector={(state) => state.values.zoneResults}>
            {(zones) => <ZoneNavigation zones={zones} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />}
          </props.form.Subscribe>
        </div>

        <div className="lg:hidden">
          <props.form.Subscribe selector={(state) => state.values.zoneResults}>
            {(zones) => {
              const selected = zones[selectedIndex];
              return (
                <>
                  <button
                    ref={mobileZoneTrigger}
                    type="button"
                    aria-expanded={mobileZonesOpen}
                    aria-controls="mobile-zone-list"
                    onClick={() => setMobileZonesOpen((open) => !open)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">{selectedIndex + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-neutral-500">Zona seleccionada · tocar para {mobileZonesOpen ? "plegar" : "desplegar"}</span>
                      <span className="block truncate text-sm font-bold text-neutral-900">{selected.zoneName}</span>
                    </span>
                    <StatusPill status={selected.status} />
                    <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition", mobileZonesOpen && "rotate-180")} />
                  </button>
                  {mobileZonesOpen && (
                    <div id="mobile-zone-list" className="border-t border-neutral-200">
                      <ZoneNavigation zones={zones} selectedIndex={selectedIndex} onSelect={(index) => {
                        setSelectedIndex(index);
                        setMobileZonesOpen(false);
                        setTimeout(() => mobileZoneTrigger.current?.focus(), 0);
                      }} />
                    </div>
                  )}
                </>
              );
            }}
          </props.form.Subscribe>
        </div>
      </aside>
      <section className="bg-[#FAFAFA] px-4 py-6 sm:px-7 lg:px-10">
        <props.form.Subscribe selector={(state) => state.values.zoneResults[selectedIndex]}>
          {(zone) => (
            <div className="mx-auto max-w-3xl outline-none" data-zone-index={selectedIndex} tabIndex={-1}>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Zona {selectedIndex + 1} de 4 · {zone.zoneId}</p>
                  <h3 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-neutral-950">{zone.zoneName}</h3>
                </div>
                <StatusPill status={zone.status} />
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
                <ZoneResultFields
                  form={props.form}
                  index={selectedIndex}
                  evidence={<EvidenceForZone {...props} zoneId={zone.zoneId} />}
                  onZoneServiced={props.onZoneServiced}
                />
              </div>
            </div>
          )}
        </props.form.Subscribe>
      </section>
    </div>
  );
}

export function VariantC(props: VariantProps) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (props.invalidZoneIndex !== null) setStep(props.invalidZoneIndex);
  }, [props.invalidZoneIndex]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:px-6">
      <props.form.Subscribe selector={(state) => state.values.zoneResults}>
        {(zones) => {
          const zone = zones[step];
          return (
            <>
              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy">Zona {step + 1} de {zones.length}</span>
                  <span className="text-neutral-500">{zones.filter((item) => item.status === "SERVICED").length} sin excepción</span>
                </div>
                <div className="flex gap-1.5" aria-hidden>
                  {zones.map((item, index) => <span key={item.zoneId} className={cn("h-1.5 flex-1 rounded-full", index === step ? "bg-navy" : item.status === "SERVICED" ? "bg-emerald-300" : "bg-amber-300")} />)}
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-navy sm:p-7" data-zone-index={step} tabIndex={-1}>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">{zone.zoneId}</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-neutral-950">{zone.zoneName}</h2>
                  </div>
                  {zone.evidenceIds.length > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-navy"><Paperclip className="h-3.5 w-3.5" />{zone.evidenceIds.length}</span>}
                </div>
                {stepError && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{stepError}</p>}
                <ZoneResultFields form={props.form} index={step} evidence={<EvidenceForZone {...props} zoneId={zone.zoneId} />} onZoneServiced={props.onZoneServiced} />
              </div>
              <div className="sticky bottom-16 mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_12px_32px_rgba(15,44,89,0.12)]">
                <button type="button" disabled={step === 0} onClick={() => { setStepError(null); setStep((value) => value - 1); }} className="flex min-h-11 items-center gap-1 rounded-xl px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button>
                <div className="flex-1" />
                {step < zones.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const result = ZoneResultSchema.safeParse(zone);
                      if (!result.success) {
                        setStepError(result.error.issues[0]?.message ?? "Revisá los datos obligatorios de esta zona.");
                        return;
                      }
                      setStepError(null);
                      setStep((value) => value + 1);
                    }}
                    className="flex min-h-11 items-center gap-1 rounded-xl bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-light"
                  >Siguiente<ChevronRight className="h-4 w-4" /></button>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><ListChecks className="h-4 w-4" />Recorrido revisado</span>
                )}
              </div>
            </>
          );
        }}
      </props.form.Subscribe>
    </div>
  );
}
