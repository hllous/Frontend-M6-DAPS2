"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/legacy-field";
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
  WASTE_TYPE_LABELS,
} from "@/lib/green-points";
import type { OperationalScenario } from "@/lib/scenarios";
import { zoneLabel, zonesAdapter, type Zone } from "@/lib/zones";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

import styles from "./catalog-panel.module.css";

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

type PointFormField = keyof PointForm;
type PointFormFieldErrors = Partial<Record<PointFormField, string>>;

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
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<GreenPoint | null>(null);
  const [form, setForm] = useState<PointForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<PointFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailPoint, setDetailPoint] = useState<GreenPoint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deactivatingPoint, setDeactivatingPoint] = useState<GreenPoint | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

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
    }).catch(() => undefined).finally(() => {
      if (isCurrent) setZonesLoaded(true);
    });
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
        if (isCurrent) setState({ status: "error", message: errorMessage(caught, "No se pudieron cargar los puntos verdes.") });
      }
    }
    void loadPoints();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  const openCreate = () => {
    setEditingPoint(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (point: GreenPoint) => {
    setEditingPoint(point);
    setForm({ code: point.code, name: point.name, zoneId: point.zoneId, wasteTypes: point.wasteTypes, address: point.address ?? "", lat: point.lat === null ? "" : String(point.lat), lng: point.lng === null ? "" : String(point.lng), active: point.active });
    setFieldErrors({});
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
      setDetailError(errorMessage(caught, "No se pudo cargar el detalle del punto verde."));
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleWasteType = (wasteType: WasteType) => {
    setForm((current) => ({ ...current, wasteTypes: current.wasteTypes.includes(wasteType) ? current.wasteTypes.filter((item) => item !== wasteType) : [...current.wasteTypes, wasteType] }));
    setFieldErrors((current) => ({ ...current, wasteTypes: undefined }));
    setFormError(null);
  };

  const updateFormField = <K extends PointFormField,>(field: K, value: PointForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const payload = pointFormPayload(form);
    const parsed = editingPoint
      ? greenPointUpdateInputSchema.safeParse(payload)
      : greenPointCreateInputSchema.safeParse({ code: form.code, ...payload });
    if (!parsed.success) {
      const nextFieldErrors: PointFormFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && field in emptyForm && !nextFieldErrors[field as PointFormField]) {
          nextFieldErrors[field as PointFormField] = issue.message;
        }
      }
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setFormError(parsed.error.issues[0]?.message ?? "Revise los datos del formulario.");
      }
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
      setFormError(caught instanceof GreenPointRequestError ? caught.message : errorMessage(caught, "No se pudo guardar el punto verde."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = (point: GreenPoint) => {
    setNotice(null);
    setDeactivateError(null);
    setDeactivatingPoint(point);
  };

  const confirmDeactivation = async () => {
    if (!deactivatingPoint) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await greenPointsAdapter.remove(deactivatingPoint.id);
      setDeactivatingPoint(null);
      setNotice("Punto verde dado de baja. Se conserva su referencia histórica.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(caught instanceof GreenPointRequestError ? caught.message : "No se pudo dar de baja el punto verde.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  return (
    <section aria-labelledby="green-points-title" className="flex flex-col gap-6">
      <CatalogPageHeader
        title="Puntos verdes"
        titleId="green-points-title"
        description="Puntos de entrega voluntaria, su ubicación y el conjunto completo de residuos que aceptan."
        actions={canManage ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar punto verde</Button> : null}
      />

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el catálogo, pero no administrarlo.</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{notice}</p> : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_190px_150px]">
        <label className="flex flex-col gap-1 text-sm font-semibold">Buscar por nombre o dirección<input aria-label="Buscar punto verde" className={formControlClass} placeholder="Nombre o dirección" value={search} maxLength={MAX_SEARCH_LENGTH} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Zona<select aria-label="Filtrar puntos verdes por zona" className={formControlClass} value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}><option value="all">Todas</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Residuo aceptado<select aria-label="Filtrar puntos verdes por residuo" className={formControlClass} value={wasteTypeFilter} onChange={(event) => setWasteTypeFilter(event.target.value as WasteType | "all")}><option value="all">Todos</option>{wasteTypes.map((type) => <option key={type} value={type}>{WASTE_TYPE_LABELS[type]}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Estado<select aria-label="Filtrar puntos verdes por estado" className={formControlClass} value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as "all" | "true" | "false")}><option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
      </div>

      {state.status === "loading" ? <div role="status" aria-label="Cargando puntos verdes" className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin puntos verdes</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.total} {state.total === 1 ? "punto verde encontrado" : "puntos verdes encontrados"}</p>
        <div className={`${styles.tableWrap} hidden md:block`}>
          <table className={styles.table}>
            <caption className="sr-only">Catálogo de puntos verdes</caption>
            <thead><tr><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Zona</th><th scope="col">Residuos aceptados</th><th scope="col">Ubicación</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{state.items.map((point) => (
              <tr key={point.id}>
                <th scope="row" data-label="Código">{point.code}</th>
                <td data-label="Nombre">{point.name}</td>
                <td data-label="Zona">{zoneLabel(zones, point.zoneId, zonesLoaded)}</td>
                <td data-label="Residuos aceptados">{point.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</td>
                <td data-label="Ubicación" className="max-w-[220px]">{point.address ?? "Sin dirección registrada"}</td>
                <td data-label="Estado"><span className="inline-flex items-center gap-1.5">{point.active ? <Check className="size-4 text-[var(--color-success)]" aria-hidden /> : null}{point.active ? "Activo" : "Inactivo"}</span></td>
                <td className={styles.actions} data-label="Acciones"><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(point)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(point)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{point.active ? <Button type="button" size="sm" variant="destructive" onClick={() => deactivate(point)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">{state.items.map((point) => <article key={point.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{point.code}</p><h2 className="mt-1 font-semibold">{point.name}</h2></div><span className="text-sm">{point.active ? "Activo" : "Inactivo"}</span></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona</dt><dd className="mt-0.5">{zoneLabel(zones, point.zoneId, zonesLoaded)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residuos aceptados</dt><dd className="mt-0.5">{point.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicación</dt><dd className="mt-0.5">{point.address ?? "Sin dirección registrada"}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(point)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(point)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{point.active ? <Button type="button" size="sm" variant="destructive" onClick={() => void deactivate(point)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></article>)}</div>
      </> : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPoint ? "Editar punto verde" : "Registrar punto verde"}</DialogTitle>
            <DialogDescription>
              {editingPoint
                ? "Actualice los datos del punto. La selección de residuos reemplaza el conjunto completo aceptado."
                : "Complete los datos del punto de entrega voluntaria."}
            </DialogDescription>
          </DialogHeader>
          {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
          <form id="green-point-form" onSubmit={(event) => void submitForm(event)} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="green-point-code">Código</FieldLabel>
                <input
                  id="green-point-code"
                  className={formControlClass}
                  value={form.code}
                  disabled={Boolean(editingPoint)}
                  onChange={(event) => updateFormField("code", event.target.value)}
                  required={!editingPoint}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={["green-point-code-help", fieldErrors.code ? "green-point-code-error" : null].filter(Boolean).join(" ")}
                />
                <FieldDescription id="green-point-code-help">El código identifica el punto en la vía pública y no se puede cambiar.</FieldDescription>
                {fieldErrors.code ? <FieldError id="green-point-code-error">{fieldErrors.code}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="green-point-name">Nombre</FieldLabel>
                <input
                  id="green-point-name"
                  className={formControlClass}
                  value={form.name}
                  onChange={(event) => updateFormField("name", event.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "green-point-name-error" : undefined}
                />
                {fieldErrors.name ? <FieldError id="green-point-name-error">{fieldErrors.name}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="green-point-zone">Zona operativa</FieldLabel>
                <select
                  id="green-point-zone"
                  className={formControlClass}
                  value={form.zoneId}
                  onChange={(event) => updateFormField("zoneId", event.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.zoneId)}
                  aria-describedby={fieldErrors.zoneId ? "green-point-zone-error" : undefined}
                >
                  <option value="">Seleccione una zona</option>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}
                </select>
                {fieldErrors.zoneId ? <FieldError id="green-point-zone-error">{fieldErrors.zoneId}</FieldError> : null}
              </Field>
              <fieldset
                className="grid gap-2"
                aria-invalid={Boolean(fieldErrors.wasteTypes)}
                aria-describedby={fieldErrors.wasteTypes ? "green-point-waste-types-error" : undefined}
              >
                <legend className="text-sm font-semibold">Residuos aceptados</legend>
                <p className="text-xs text-muted-foreground">La selección representa el conjunto completo actual; no es una lista ordenada.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {wasteTypes.map((type) => (
                    <label key={type} className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm max-[760px]:min-h-12">
                      <input type="checkbox" checked={form.wasteTypes.includes(type)} onChange={() => toggleWasteType(type)} />
                      {WASTE_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
                {fieldErrors.wasteTypes ? <FieldError id="green-point-waste-types-error">{fieldErrors.wasteTypes}</FieldError> : null}
              </fieldset>
              <Field>
                <FieldLabel htmlFor="green-point-address">Dirección</FieldLabel>
                <input
                  id="green-point-address"
                  className={formControlClass}
                  value={form.address}
                  onChange={(event) => updateFormField("address", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={fieldErrors.address ? "green-point-address-error" : undefined}
                />
                <FieldDescription>Opcional. Permite encontrar el punto junto con su ubicación geográfica.</FieldDescription>
                {fieldErrors.address ? <FieldError id="green-point-address-error">{fieldErrors.address}</FieldError> : null}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="green-point-lat">Latitud</FieldLabel>
                  <input
                    id="green-point-lat"
                    className={formControlClass}
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={form.lat}
                    onChange={(event) => updateFormField("lat", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.lat)}
                    aria-describedby={fieldErrors.lat ? "green-point-lat-error" : undefined}
                  />
                  {fieldErrors.lat ? <FieldError id="green-point-lat-error">{fieldErrors.lat}</FieldError> : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="green-point-lng">Longitud</FieldLabel>
                  <input
                    id="green-point-lng"
                    className={formControlClass}
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={form.lng}
                    onChange={(event) => updateFormField("lng", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.lng)}
                    aria-describedby={fieldErrors.lng ? "green-point-lng-error" : undefined}
                  />
                  {fieldErrors.lng ? <FieldError id="green-point-lng-error">{fieldErrors.lng}</FieldError> : null}
                </Field>
              </div>
              {editingPoint ? <label className="flex min-h-10 items-center gap-2 text-sm max-[760px]:min-h-12"><input type="checkbox" checked={form.active} onChange={(event) => updateFormField("active", event.target.checked)} /> Activo</label> : null}
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="green-point-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar punto verde"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogDeactivationDialog
        open={Boolean(deactivatingPoint)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingPoint(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        consequence="El punto verde quedará inactivo y no estará disponible para nuevas consultas operativas. Sus registros históricos conservarán la referencia."
        confirmAction={`Dar de baja el punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        safeAlternative={`Conservar el punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{deactivateError}</p> : null}
      </CatalogDeactivationDialog>

      <Dialog open={Boolean(detailPoint)} onOpenChange={(open) => !open && setDetailPoint(null)}><DialogContent><DialogHeader><DialogTitle>Detalle del punto verde {detailPoint?.code}</DialogTitle><DialogDescription>Información del emplazamiento y del conjunto completo de residuos aceptados.</DialogDescription></DialogHeader>{detailLoading ? <p role="status">Cargando detalle…</p> : null}{detailError ? <p role="alert" className="text-sm text-destructive">{detailError}</p> : null}{detailPoint && !detailLoading && !detailError ? <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</dt><dd className="mt-0.5 font-medium">{detailPoint.name}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</dt><dd className="mt-0.5 font-medium">{detailPoint.active ? "Activo" : "Inactivo"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona operativa</dt><dd className="mt-0.5 font-medium">{zoneLabel(zones, detailPoint.zoneId, zonesLoaded)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residuos aceptados</dt><dd className="mt-0.5 font-medium">{detailPoint.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5 font-medium">{detailPoint.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latitud</dt><dd className="mt-0.5 font-medium">{detailPoint.lat ?? "Sin registrar"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Longitud</dt><dd className="mt-0.5 font-medium">{detailPoint.lng ?? "Sin registrar"}</dd></div></dl> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setDetailPoint(null)}>Cerrar detalle</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
