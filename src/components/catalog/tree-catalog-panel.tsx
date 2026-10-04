"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CircleOff, Eye, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  treeCreateInputSchema,
  treeUpdateInputSchema,
  treeMapHref,
  treesAdapter,
  TreeRequestError,
  type Tree,
  type TreeCreateInput,
  type TreeQuery,
  type TreeUpdateInput,
} from "@/lib/trees";
import type { OperationalScenario } from "@/lib/scenarios";
import { RISK_LEVEL_LABELS, treeSurveysAdapter, type TreeSurveysPage } from "@/lib/tree-surveys";
import { zoneLabel, zonesAdapter, type Zone } from "@/lib/zones";
import { TreeSurveyPanel } from "./tree-survey-panel";
import { TreeInterventionRequestDialog } from "./tree-interventions-panel";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: Tree[]; total: number; totalPages: number }
  | { status: "error"; message: string };

type DetailState = { treeId: string } & (
  | { status: "ready"; tree: Tree; surveys: TreeSurveysPage | null }
  | { status: "error"; message: string }
);

type TreeForm = {
  surveyCode: string;
  zoneId: string;
  species: string;
  address: string;
  lat: string;
  lng: string;
  heightM: string;
  diameterCm: string;
  active: boolean;
};

const emptyForm: TreeForm = {
  surveyCode: "",
  zoneId: "",
  species: "",
  address: "",
  lat: "",
  lng: "",
  heightM: "",
  diameterCm: "",
  active: true,
};

const PAGE_SIZE = 20;
const RECENT_SURVEYS = 5;
const TREE_INTERVENTIONS_HREF = "/app/catalog/tree-interventions";

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function treeFormPayload(form: TreeForm) {
  return {
    zoneId: form.zoneId,
    species: form.species,
    address: form.address.trim() || undefined,
    lat: parseOptionalNumber(form.lat),
    lng: parseOptionalNumber(form.lng),
    heightM: parseOptionalNumber(form.heightM),
    diameterCm: parseOptionalNumber(form.diameterCm),
    active: form.active,
  };
}

function formatMeasurement(value: number | null, unit: string) {
  return value === null ? "—" : `${value} ${unit}`;
}

function formatSurveyDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

export function TreeCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("tree:manage");
  const canRequestIntervention = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("treeIntervention:request");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const activeParam = searchParams.get("active");
  const activeFilter: "all" | "true" | "false" = activeParam === "true" || activeParam === "false" ? activeParam : "all";
  const zoneFilter = searchParams.get("zone") ?? "all";
  const surveyTreeSelection = searchParams.get("tree") ?? "";
  const detailId = searchParams.get("detail");
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  // Filtros, página y árbol seleccionado viven en la URL; los filtros reinician la página.
  const setParams = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (resetPage) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };
  const [formOpen, setFormOpen] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [form, setForm] = useState<TreeForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedDetail, setLoadedDetail] = useState<DetailState | null>(null);
  const [surveyTree, setSurveyTree] = useState<Tree | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Tree | null>(null);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [interventionTreeIds, setInterventionTreeIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo<TreeQuery>(() => ({
    active: activeFilter === "all" ? undefined : activeFilter === "true",
    zoneId: zoneFilter === "all" ? undefined : zoneFilter,
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [activeFilter, search, zoneFilter, page]);

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
    async function loadTrees() {
      setState({ status: "loading" });
      try {
        const result = await treesAdapter.list(query);
        if (isCurrent) setState({ status: "ready", items: result.trees, total: result.total, totalPages: result.totalPages });
      } catch (caught) {
        if (isCurrent) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar los árboles." });
      }
    }
    void loadTrees();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  const openCreate = () => {
    setEditingTree(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (tree: Tree) => {
    setEditingTree(tree);
    setForm({ surveyCode: tree.surveyCode, zoneId: tree.zoneId, species: tree.species ?? "", address: tree.address ?? "", lat: tree.lat === null ? "" : String(tree.lat), lng: tree.lng === null ? "" : String(tree.lng), heightM: tree.heightM === null ? "" : String(tree.heightM), diameterCm: tree.diameterCm === null ? "" : String(tree.diameterCm), active: tree.active });
    setFormError(null);
    setFormOpen(true);
  };

  // La ficha se abre desde la URL (`detail`) y también selecciona el árbol (`tree`), así el
  // mapa y el selector de relevamientos quedan sincronizados con la lista.
  useEffect(() => {
    if (!detailId) return;
    let isCurrent = true;
    async function loadDetail(treeId: string) {
      try {
        const [tree, surveys] = await Promise.all([
          treesAdapter.get(treeId),
          treeSurveysAdapter.getTreeSurveys(treeId, { page: 1, pageSize: RECENT_SURVEYS }).catch(() => null),
        ]);
        if (isCurrent) setLoadedDetail({ treeId, status: "ready", tree, surveys });
      } catch (caught) {
        if (isCurrent) setLoadedDetail({ treeId, status: "error", message: caught instanceof Error ? caught.message : "No se pudo cargar el detalle del árbol." });
      }
    }
    void loadDetail(detailId);
    return () => { isCurrent = false; };
  }, [detailId]);

  const openDetail = (tree: Tree) => {
    setLoadedDetail(null);
    setParams({ tree: tree.id, detail: tree.id }, false);
  };
  const closeDetail = () => setParams({ detail: null }, false);
  // Lo cargado para otro árbol no se muestra: mientras llega el nuevo, la ficha queda en "cargando".
  const detail = loadedDetail && loadedDetail.treeId === detailId ? loadedDetail : { status: "loading" as const };
  const detailTree = detail.status === "ready" ? detail.tree : state.status === "ready" ? state.items.find((tree) => tree.id === detailId) : undefined;
  const openSurveyHistory = (tree: Tree) => {
    closeDetail();
    setSurveyTree(tree);
  };

  useEffect(() => {
    if (surveyTree) document.getElementById("tree-surveys-title")?.scrollIntoView?.({ block: "start" });
  }, [surveyTree]);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const payload = treeFormPayload(form);
    const parsed = editingTree
      ? treeUpdateInputSchema.safeParse(payload)
      : treeCreateInputSchema.safeParse({ surveyCode: form.surveyCode, ...payload });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise los datos del formulario.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTree) {
        await treesAdapter.update(editingTree.id, parsed.data as TreeUpdateInput);
        setNotice("Árbol actualizado con éxito.");
      } else {
        await treesAdapter.create(parsed.data as TreeCreateInput);
        setNotice("Árbol creado con éxito.");
      }
      setFormOpen(false);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(caught instanceof TreeRequestError ? caught.message : caught instanceof Error ? caught.message : "No se pudo guardar el árbol.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = async (tree: Tree) => {
    setNotice(null);
    setDeactivateTarget(null);
    try {
      await treesAdapter.remove(tree.id);
      setNotice("Árbol dado de baja. Se conserva su referencia histórica.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setNotice(caught instanceof TreeRequestError ? caught.message : "No se pudo dar de baja el árbol.");
    }
  };

  return (
    <section aria-labelledby="trees-title" className="flex flex-col gap-6">
      <CatalogPageHeader
        title="Árboles"
        titleId="trees-title"
        description="Censo de arbolado urbano, ubicación y medidas registradas para cada ejemplar."
        actions={canManage ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar árbol</Button> : null}
      />

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el censo, pero no administrarlo.</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{notice}</p> : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(240px,1fr)_200px_160px]">
        <label className="flex flex-col gap-1 text-sm font-semibold">Buscar por especie o dirección<input aria-label="Buscar árbol" className={formControlClass} placeholder="Especie o dirección" value={search} maxLength={MAX_SEARCH_LENGTH} onChange={(event) => setParams({ q: event.target.value })} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Zona<select aria-label="Filtrar árboles por zona" className={formControlClass} value={zoneFilter} onChange={(event) => setParams({ zone: event.target.value === "all" ? null : event.target.value })}><option value="all">Todas</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Estado<select aria-label="Filtrar árboles por estado" className={formControlClass} value={activeFilter} onChange={(event) => setParams({ active: event.target.value === "all" ? null : event.target.value })}><option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
      </div>

      {state.status === "loading" ? <div role="status" aria-label="Cargando árboles" className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin árboles</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.total} {state.total === 1 ? "árbol encontrado" : "árboles encontrados"}</p>
        <div className="relative hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <table className="w-full min-w-[980px] text-left text-sm"><caption className="sr-only">Catálogo de árboles</caption><thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Código de relevamiento</th><th className="px-4 py-3">Especie</th><th className="px-4 py-3">Zona</th><th className="px-4 py-3">Ubicación</th><th className="px-4 py-3">Medidas</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.items.map((tree) => <tr key={tree.id} aria-current={tree.id === surveyTreeSelection ? "true" : undefined} className={`border-b border-border last:border-0 ${tree.id === surveyTreeSelection ? "bg-[var(--color-info-fill)]" : ""}`}><td className="px-4 py-3 font-mono text-xs">{tree.surveyCode}</td><td className="px-4 py-3 font-medium">{tree.species ?? "—"}</td><td className="px-4 py-3">{zoneLabel(zones, tree.zoneId, zonesLoaded)}</td><td className="max-w-[230px] px-4 py-3">{tree.address ?? "Sin dirección registrada"}</td><td className="px-4 py-3 tabular-nums">{formatMeasurement(tree.heightM, "m")} · {formatMeasurement(tree.diameterCm, "cm")}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${tree.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{tree.active ? <Check className="size-4" aria-hidden /> : <CircleOff className="size-4" aria-hidden />}{tree.active ? "Activo" : "Inactivo"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openDetail(tree)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(tree)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{tree.active ? <Button type="button" size="sm" variant="destructive" onClick={() => setDeactivateTarget(tree)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></td></tr>)}</tbody></table>
        </div>
        <div className="grid gap-3 md:hidden">{state.items.map((tree) => <article key={tree.id} aria-current={tree.id === surveyTreeSelection ? "true" : undefined} className={`rounded-xl border p-4 ${tree.id === surveyTreeSelection ? "border-[var(--color-accent)] bg-[var(--color-info-fill)]" : "border-border bg-card"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{tree.surveyCode}</p><h2 className="mt-1 font-semibold">{tree.species ?? "—"}</h2></div><span className="inline-flex items-center gap-1 text-sm">{tree.active ? <Check className="size-4 text-emerald-700" aria-hidden /> : <CircleOff className="size-4 text-muted-foreground" aria-hidden />}{tree.active ? "Activo" : "Inactivo"}</span></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona</dt><dd className="mt-0.5">{zoneLabel(zones, tree.zoneId, zonesLoaded)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicación</dt><dd className="mt-0.5">{tree.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medidas</dt><dd className="mt-0.5 tabular-nums">{formatMeasurement(tree.heightM, "m")} · {formatMeasurement(tree.diameterCm, "cm")}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openDetail(tree)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(tree)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{tree.active ? <Button type="button" size="sm" variant="destructive" onClick={() => setDeactivateTarget(tree)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></article>)}</div>
      </> : null}

      {state.status === "ready" && state.items.length > 0 ? <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"><label className="flex min-w-64 flex-1 flex-col gap-1 text-sm font-semibold">Árbol para relevar<select aria-label="Árbol para relevar" className={formControlClass} value={state.items.some((tree) => tree.id === surveyTreeSelection) ? surveyTreeSelection : ""} onChange={(event) => setParams({ tree: event.target.value || null }, false)}><option value="">Seleccione un árbol</option>{state.items.map((tree) => <option key={tree.id} value={tree.id}>{tree.surveyCode} · {tree.species ?? "Especie no registrada"}</option>)}</select></label><Button type="button" variant="outline" disabled={!surveyTreeSelection} onClick={() => setSurveyTree(state.items.find((tree) => tree.id === surveyTreeSelection) ?? null)}>Ver historial de relevamientos</Button></div> : null}
      {state.status === "ready" && state.totalPages > 1 ? <nav aria-label="Paginación de árboles" className="flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) }, false)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {page} de {state.totalPages}</span><Button type="button" variant="outline" disabled={page >= state.totalPages} onClick={() => setParams({ page: String(page + 1) }, false)}>Siguiente</Button></nav> : null}
      {surveyTree ? <TreeSurveyPanel tree={surveyTree} scenario={scenario} onClose={() => setSurveyTree(null)} /> : null}
      {canRequestIntervention ? <Button type="button" variant="outline" disabled={!surveyTreeSelection} onClick={() => { setInterventionTreeIds([surveyTreeSelection]); setInterventionOpen(true); }}>Solicitar intervención sobre el árbol seleccionado</Button> : null}
      {canRequestIntervention ? <TreeInterventionRequestDialog key={`${interventionOpen}-${interventionTreeIds.join(",")}`} open={interventionOpen} onOpenChange={setInterventionOpen} trees={state.status === "ready" ? state.items : []} initialTreeIds={interventionTreeIds} onCreated={() => setNotice("Solicitud de intervención creada. Estado inicial: solicitada.")} /> : null}

      <Dialog open={Boolean(deactivateTarget)} onOpenChange={(open) => !open && setDeactivateTarget(null)}><DialogContent><DialogHeader><DialogTitle>Dar de baja el árbol {deactivateTarget?.surveyCode}</DialogTitle><DialogDescription>El árbol quedará inactivo y se conservará su referencia histórica. ¿Desea continuar?</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>Cancelar</Button><Button type="button" variant="destructive" onClick={() => deactivateTarget && void deactivate(deactivateTarget)}>Confirmar baja</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>{editingTree ? "Editar árbol" : "Registrar árbol"}</DialogTitle><DialogDescription>{editingTree ? "Actualice los datos del ejemplar. El código de relevamiento es inmutable." : "Complete los datos del ejemplar censado."}</DialogDescription></DialogHeader>{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}<form id="tree-form" onSubmit={(event) => void submitForm(event)} noValidate><FieldGroup><Field><FieldLabel htmlFor="tree-survey-code">Código de relevamiento</FieldLabel><input id="tree-survey-code" className={formControlClass} value={form.surveyCode} disabled={Boolean(editingTree)} onChange={(event) => setForm({ ...form, surveyCode: event.target.value })} required={!editingTree} aria-describedby={editingTree ? "tree-survey-code-help" : undefined} /><FieldDescription id="tree-survey-code-help">Identifica el ejemplar en el censo y no se puede cambiar.</FieldDescription></Field><Field><FieldLabel htmlFor="tree-species">Especie</FieldLabel><input id="tree-species" className={formControlClass} value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value })} required /></Field><Field><FieldLabel htmlFor="tree-zone">Zona operativa</FieldLabel><select id="tree-zone" className={formControlClass} value={form.zoneId} onChange={(event) => setForm({ ...form, zoneId: event.target.value })} required><option value="">Seleccione una zona</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></Field><Field><FieldLabel htmlFor="tree-address">Dirección</FieldLabel><input id="tree-address" className={formControlClass} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /><FieldDescription>Opcional. Se utiliza junto con la especie en la búsqueda.</FieldDescription></Field><div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor="tree-lat">Latitud</FieldLabel><input id="tree-lat" className={formControlClass} type="number" min="-90" max="90" step="any" value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} /></Field><Field><FieldLabel htmlFor="tree-lng">Longitud</FieldLabel><input id="tree-lng" className={formControlClass} type="number" min="-180" max="180" step="any" value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} /></Field></div><div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor="tree-height">Altura (m)</FieldLabel><input id="tree-height" className={formControlClass} type="number" min="0" max="999.99" step="any" value={form.heightM} onChange={(event) => setForm({ ...form, heightM: event.target.value })} required /></Field><Field><FieldLabel htmlFor="tree-diameter">Diámetro (cm)</FieldLabel><input id="tree-diameter" className={formControlClass} type="number" min="0" max="9999.9" step="any" value={form.diameterCm} onChange={(event) => setForm({ ...form, diameterCm: event.target.value })} required /></Field></div>{editingTree ? <label className="flex min-h-10 items-center gap-2 text-sm max-[760px]:min-h-12"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activo</label> : null}</FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="tree-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar árbol"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle del árbol {detailTree?.surveyCode ?? ""}</DialogTitle><DialogDescription>Información del ejemplar, su historial de relevamientos y el trabajo relacionado.</DialogDescription></DialogHeader>
          {detail.status === "loading" ? <p role="status">Cargando detalle…</p> : null}
          {detail.status === "error" ? <p role="alert" className="text-sm text-destructive">{detail.message}</p> : null}
          {detail.status === "ready" ? <TreeDetailBody tree={detail.tree} surveys={detail.surveys} zoneText={zoneLabel(zones, detail.tree.zoneId, zonesLoaded)} onOpenSurveys={() => openSurveyHistory(detail.tree)} /> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={closeDetail}>Cerrar detalle</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TreeDetailBody({ tree, surveys, zoneText, onOpenSurveys }: { tree: Tree; surveys: TreeSurveysPage | null; zoneText: string; onOpenSurveys: () => void }) {
  const hasLocation = tree.lat !== null && tree.lng !== null;
  return <div className="flex flex-col gap-6">
    <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Especie</dt><dd className="mt-0.5 font-medium">{tree.species}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</dt><dd className="mt-0.5 font-medium">{tree.active ? "Activo" : "Inactivo"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona operativa</dt><dd className="mt-0.5 font-medium">{zoneText}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código de relevamiento</dt><dd className="mt-0.5 font-mono text-xs">{tree.surveyCode}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5 font-medium">{tree.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Altura</dt><dd className="mt-0.5 font-medium tabular-nums">{formatMeasurement(tree.heightM, "m")}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diámetro</dt><dd className="mt-0.5 font-medium tabular-nums">{formatMeasurement(tree.diameterCm, "cm")}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latitud</dt><dd className="mt-0.5 font-medium tabular-nums">{tree.lat ?? "Sin registrar"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Longitud</dt><dd className="mt-0.5 font-medium tabular-nums">{tree.lng ?? "Sin registrar"}</dd></div></dl>
    {hasLocation ? <Link className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[var(--color-action)] underline" href={treeMapHref(tree.id)}><MapPinned className="size-4" aria-hidden />Ver en el mapa</Link> : null}

    <section aria-labelledby="tree-detail-surveys" className="flex flex-col gap-2">
      <h3 id="tree-detail-surveys" className="text-sm font-semibold">Relevamientos</h3>
      {surveys === null ? <p role="alert" className="text-sm text-destructive">No se pudieron cargar los relevamientos.</p>
        : surveys.total === 0 ? <p className="text-sm text-muted-foreground">Sin relevamientos registrados.</p>
        : <>
          <p className="text-xs text-muted-foreground">{surveys.total > surveys.surveys.length ? `Últimos ${surveys.surveys.length} de ${surveys.total}` : `${surveys.total} ${surveys.total === 1 ? "relevamiento" : "relevamientos"}`}, del más reciente al más antiguo.</p>
          <ul className="flex flex-col gap-1 text-sm">{surveys.surveys.map((survey) => <li key={survey.id} className="flex justify-between gap-3 rounded-md border border-border px-3 py-2"><span>{formatSurveyDate(survey.surveyedAt)}</span><span className="font-medium">Riesgo {RISK_LEVEL_LABELS[survey.riskLevel].toLowerCase()}</span></li>)}</ul>
        </>}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={onOpenSurveys}>Ver historial de relevamientos</Button>
    </section>

    <section aria-labelledby="tree-detail-work" className="flex flex-col gap-2">
      <h3 id="tree-detail-work" className="text-sm font-semibold">Intervenciones y servicios</h3>
      {/* ponytail: el backend no filtra GET /tree-interventions ni GET /services por árbol; hasta que lo haga,
          la ficha deriva a la cola en vez de traer todas las intervenciones y filtrarlas en el cliente. */}
      <p className="text-sm text-muted-foreground">Las intervenciones que incluyen este árbol, y los servicios vinculados a cada una, se consultan en la cola de intervenciones de arbolado.</p>
      <Link className="self-start text-sm font-semibold text-[var(--color-action)] underline" href={TREE_INTERVENTIONS_HREF}>Ir a intervenciones de arbolado</Link>
    </section>
  </div>;
}
