"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  greenPointCreateInputSchema,
  greenPointUpdateInputSchema,
  greenPointsAdapter,
  GreenPointRequestError,
  wasteTypeSchema,
  type GreenPoint,
  type GreenPointCreateInput,
  type GreenPointQuery,
  type GreenPointUpdateInput,
  type WasteType,
} from "@/lib/green-points";
import type { OperationalScenario } from "@/lib/scenarios";
import { zonesAdapter, type Zone } from "@/lib/zones";

const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  HOUSEHOLD: "Domiciliarios",
  RECYCLABLE: "Reciclables",
  BULKY: "Voluminosos",
  GREEN: "Verdes",
  MIXED: "Mixtos",
};

const wasteTypes = wasteTypeSchema.options;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: GreenPoint[]; total: number }
  | { status: "error"; message: string };

type PointForm = {
  code: string;
  name: string;
  zoneId: string;
  wasteTypes: WasteType[];
  address: string;
  lat: string;
  lng: string;
  active: boolean;
};

const emptyForm: PointForm = {
  code: "",
  name: "",
  zoneId: "",
  wasteTypes: ["RECYCLABLE"],
  address: "",
  lat: "",
  lng: "",
  active: true,
};

function zoneName(zones: Zone[], zoneId: string) {
  const zone = zones.find((candidate) => candidate.id === zoneId);
  return zone ? `${zone.code} · ${zone.name}` : zoneId;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function pointFormPayload(form: PointForm) {
  return {
    name: form.name,
    zoneId: form.zoneId,
    wasteTypes: form.wasteTypes,
    address: form.address.trim() || undefined,
    lat: parseOptionalNumber(form.lat),
    lng: parseOptionalNumber(form.lng),
    active: form.active,
  };
}

export function GreenPointCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("greenPoint:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<GreenPoint | null>(null);
  const [form, setForm] = useState<PointForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailPoint, setDetailPoint] = useState<GreenPoint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo<GreenPointQuery>(() => ({
    active: activeFilter === "all" ? undefined : activeFilter === "true",
    zoneId: zoneFilter === "all" ? undefined : zoneFilter,
    wasteType: wasteTypeFilter === "all" ? undefined : wasteTypeFilter,
    search: search.trim() || undefined,
    pageSize: 100,
  }), [activeFilter, search, wasteTypeFilter, zoneFilter]);

  useEffect(() => {
    let isCurrent = true;
    void zonesAdapter.list({ pageSize: 100 }).then((page) => {
      if (isCurrent) setZones(page.zones);
    }).catch(() => undefined);
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function loadPoints() {
      setState({ status: "loading" });
      try {
        const page = await greenPointsAdapter.list(query);
        if (isCurrent) setState({ status: "ready", items: page.greenPoints, total: page.total });
      } catch (caught) {
        if (isCurrent) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar los puntos verdes." });
      }
    }
    void loadPoints();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  const openCreate = () => {
    setEditingPoint(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (point: GreenPoint) => {
    setEditingPoint(point);
    setForm({ code: point.code, name: point.name, zoneId: point.zoneId, wasteTypes: point.wasteTypes, address: point.address ?? "", lat: point.lat === null ? "" : String(point.lat), lng: point.lng === null ? "" : String(point.lng), active: point.active });
    setFormError(null);
    setFormOpen(true);
  };

  const openDetail = async (point: GreenPoint) => {
    setDetailPoint(point);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetailPoint(await greenPointsAdapter.get(point.id));
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : "No se pudo cargar el detalle del punto verde.");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleWasteType = (wasteType: WasteType) => {
    setForm((current) => ({ ...current, wasteTypes: current.wasteTypes.includes(wasteType) ? current.wasteTypes.filter((item) => item !== wasteType) : [...current.wasteTypes, wasteType] }));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const payload = pointFormPayload(form);
    const parsed = editingPoint
      ? greenPointUpdateInputSchema.safeParse(payload)
      : greenPointCreateInputSchema.safeParse({ code: form.code, ...payload });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise los datos del formulario.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPoint) {
        await greenPointsAdapter.update(editingPoint.id, parsed.data as GreenPointUpdateInput);
        setNotice("Punto verde actualizado con éxito.");
      } else {
        await greenPointsAdapter.create(parsed.data as GreenPointCreateInput);
        setNotice("Punto verde creado con éxito.");
      }
      setFormOpen(false);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(caught instanceof GreenPointRequestError ? caught.message : caught instanceof Error ? caught.message : "No se pudo guardar el punto verde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = async (point: GreenPoint) => {
    setNotice(null);
    try {
      await greenPointsAdapter.remove(point.id);
      setNotice("Punto verde dado de baja. Se conserva su referencia histórica.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setNotice(caught instanceof GreenPointRequestError ? caught.message : "No se pudo dar de baja el punto verde.");
    }
  };

  return (
    <section aria-labelledby="green-points-title" className="flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="green-points-title" className="text-2xl font-semibold tracking-tight">Puntos verdes</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Puntos de entrega voluntaria, su ubicación y el conjunto completo de residuos que aceptan.</p>
        </div>
        {canManage ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar punto verde</Button> : null}
      </div>

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el catálogo, pero no administrarlo.</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{notice}</p> : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_180px_190px_150px]">
        <label className="flex flex-col gap-1 text-sm font-semibold">Buscar por nombre o dirección<input aria-label="Buscar punto verde" className={formControlClass} placeholder="Nombre o dirección" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Zona<select aria-label="Filtrar puntos verdes por zona" className={formControlClass} value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}><option value="all">Todas</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Residuo aceptado<select aria-label="Filtrar puntos verdes por residuo" className={formControlClass} value={wasteTypeFilter} onChange={(event) => setWasteTypeFilter(event.target.value as WasteType | "all")}><option value="all">Todos</option>{wasteTypes.map((type) => <option key={type} value={type}>{WASTE_TYPE_LABELS[type]}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Estado<select aria-label="Filtrar puntos verdes por estado" className={formControlClass} value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as "all" | "true" | "false")}><option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
      </div>

      {state.status === "loading" ? <div role="status" aria-label="Cargando puntos verdes" className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin puntos verdes</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.total} {state.total === 1 ? "punto verde encontrado" : "puntos verdes encontrados"}</p>
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Catálogo de puntos verdes</caption><thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Zona</th><th className="px-4 py-3">Residuos aceptados</th><th className="px-4 py-3">Ubicación</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.items.map((point) => <tr key={point.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono text-xs">{point.code}</td><td className="px-4 py-3 font-medium">{point.name}</td><td className="px-4 py-3">{zoneName(zones, point.zoneId)}</td><td className="px-4 py-3">{point.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</td><td className="max-w-[220px] px-4 py-3">{point.address ?? "Sin dirección registrada"}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5">{point.active ? <Check className="size-4 text-[var(--color-success)]" aria-hidden /> : null}{point.active ? "Activo" : "Inactivo"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(point)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(point)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{point.active ? <Button type="button" size="sm" variant="destructive" onClick={() => void deactivate(point)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></td></tr>)}</tbody></table>
        </div>
        <div className="grid gap-3 md:hidden">{state.items.map((point) => <article key={point.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{point.code}</p><h2 className="mt-1 font-semibold">{point.name}</h2></div><span className="text-sm">{point.active ? "Activo" : "Inactivo"}</span></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona</dt><dd className="mt-0.5">{zoneName(zones, point.zoneId)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residuos aceptados</dt><dd className="mt-0.5">{point.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicación</dt><dd className="mt-0.5">{point.address ?? "Sin dirección registrada"}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(point)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(point)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{point.active ? <Button type="button" size="sm" variant="destructive" onClick={() => void deactivate(point)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></article>)}</div>
      </> : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>{editingPoint ? "Editar punto verde" : "Registrar punto verde"}</DialogTitle><DialogDescription>{editingPoint ? "Actualice los datos del punto. La selección de residuos reemplaza el conjunto completo aceptado." : "Complete los datos del punto de entrega voluntaria."}</DialogDescription></DialogHeader>{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}<form id="green-point-form" onSubmit={(event) => void submitForm(event)} noValidate><FieldGroup><Field><FieldLabel htmlFor="green-point-code">Código</FieldLabel><input id="green-point-code" className={formControlClass} value={form.code} disabled={Boolean(editingPoint)} onChange={(event) => setForm({ ...form, code: event.target.value })} required={!editingPoint} aria-describedby={editingPoint ? "green-point-code-help" : undefined} /><FieldDescription id="green-point-code-help">El código identifica el punto en la vía pública y no se puede cambiar.</FieldDescription></Field><Field><FieldLabel htmlFor="green-point-name">Nombre</FieldLabel><input id="green-point-name" className={formControlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field><Field><FieldLabel htmlFor="green-point-zone">Zona operativa</FieldLabel><select id="green-point-zone" className={formControlClass} value={form.zoneId} onChange={(event) => setForm({ ...form, zoneId: event.target.value })} required><option value="">Seleccione una zona</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></Field><fieldset className="grid gap-2"><legend className="text-sm font-semibold">Residuos aceptados</legend><p className="text-xs text-muted-foreground">La selección representa el conjunto completo actual; no es una lista ordenada.</p><div className="grid gap-2 sm:grid-cols-2">{wasteTypes.map((type) => <label key={type} className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm max-[760px]:min-h-12"><input type="checkbox" checked={form.wasteTypes.includes(type)} onChange={() => toggleWasteType(type)} />{WASTE_TYPE_LABELS[type]}</label>)}</div></fieldset><Field><FieldLabel htmlFor="green-point-address">Dirección</FieldLabel><input id="green-point-address" className={formControlClass} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /><FieldDescription>Opcional. Permite encontrar el punto junto con su ubicación geográfica.</FieldDescription></Field><div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor="green-point-lat">Latitud</FieldLabel><input id="green-point-lat" className={formControlClass} type="number" step="any" value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} /></Field><Field><FieldLabel htmlFor="green-point-lng">Longitud</FieldLabel><input id="green-point-lng" className={formControlClass} type="number" step="any" value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} /></Field></div>{editingPoint ? <label className="flex min-h-10 items-center gap-2 text-sm max-[760px]:min-h-12"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activo</label> : null}</FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="green-point-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar punto verde"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(detailPoint)} onOpenChange={(open) => !open && setDetailPoint(null)}><DialogContent><DialogHeader><DialogTitle>Detalle del punto verde {detailPoint?.code}</DialogTitle><DialogDescription>Información del emplazamiento y del conjunto completo de residuos aceptados.</DialogDescription></DialogHeader>{detailLoading ? <p role="status">Cargando detalle…</p> : null}{detailError ? <p role="alert" className="text-sm text-destructive">{detailError}</p> : null}{detailPoint && !detailLoading && !detailError ? <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</dt><dd className="mt-0.5 font-medium">{detailPoint.name}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</dt><dd className="mt-0.5 font-medium">{detailPoint.active ? "Activo" : "Inactivo"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona operativa</dt><dd className="mt-0.5 font-medium">{zoneName(zones, detailPoint.zoneId)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residuos aceptados</dt><dd className="mt-0.5 font-medium">{detailPoint.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5 font-medium">{detailPoint.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latitud</dt><dd className="mt-0.5 font-medium">{detailPoint.lat ?? "Sin registrar"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Longitud</dt><dd className="mt-0.5 font-medium">{detailPoint.lng ?? "Sin registrar"}</dd></div></dl> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setDetailPoint(null)}>Cerrar detalle</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
