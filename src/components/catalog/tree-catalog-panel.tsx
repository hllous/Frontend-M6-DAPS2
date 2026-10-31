"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CircleOff, Eye, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCaption } from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup } from "@/components/ui/item";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { DetailFieldsSkeleton, RecordCardSkeleton } from "./catalog-a-loading";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

const NO_TREES: Tree[] = [];

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
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedDetail, setLoadedDetail] = useState<DetailState | null>(null);
  const [surveyTree, setSurveyTree] = useState<Tree | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Tree | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
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
        if (isCurrent) setState({ status: "error", message: errorMessage(caught, "No se pudieron cargar los árboles.") });
      }
    }
    void loadTrees();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  const openCreate = () => {
    setEditingTree(null);
    setForm(emptyForm);
    setFormError(null);
    setZoneError(null);
    setFormOpen(true);
  };

  const openEdit = (tree: Tree) => {
    setEditingTree(tree);
    setForm({ surveyCode: tree.surveyCode, zoneId: tree.zoneId, species: tree.species ?? "", address: tree.address ?? "", lat: tree.lat === null ? "" : String(tree.lat), lng: tree.lng === null ? "" : String(tree.lng), heightM: tree.heightM === null ? "" : String(tree.heightM), diameterCm: tree.diameterCm === null ? "" : String(tree.diameterCm), active: tree.active });
    setFormError(null);
    setZoneError(null);
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
        if (isCurrent) setLoadedDetail({ treeId, status: "error", message: errorMessage(caught, "No se pudo cargar el detalle del árbol.") });
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
      setZoneError(parsed.error.issues.find((issue) => issue.path.includes("zoneId"))?.message ?? null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTree) {
        await treesAdapter.update(editingTree.id, parsed.data as TreeUpdateInput);
        setNotice("Árbol actualizado.");
      } else {
        await treesAdapter.create(parsed.data as TreeCreateInput);
        setNotice("Árbol creado.");
      }
      setFormOpen(false);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(caught instanceof TreeRequestError ? caught.message : errorMessage(caught, "No se pudo guardar el árbol."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = async (tree: Tree) => {
    setDeactivateError(null);
    setIsSubmittingDeactivate(true);
    try {
      await treesAdapter.remove(tree.id);
      setDeactivateTarget(null);
      setNotice("Árbol dado de baja.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(caught instanceof TreeRequestError ? caught.message : "No se pudo dar de baja el árbol.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  const treeColumns: DataTableColumn<Tree>[] = [
    { id: "surveyCode", header: "Código de relevamiento", accessorFn: (tree) => tree.surveyCode, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3 font-mono text-xs" }, cell: ({ row }) => row.original.surveyCode },
    { id: "species", header: "Especie", accessorFn: (tree) => tree.species, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3 font-medium" }, cell: ({ row }) => row.original.species ?? "—" },
    { id: "zone", header: "Zona", accessorFn: (tree) => tree.zoneId, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3" }, cell: ({ row }) => zoneLabel(zones, row.original.zoneId, zonesLoaded) },
    { id: "address", header: "Ubicación", accessorFn: (tree) => tree.address, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "max-w-[230px] whitespace-normal px-4 py-3" }, cell: ({ row }) => row.original.address ?? "Sin dirección registrada" },
    { id: "measures", header: "Medidas", accessorFn: (tree) => tree.heightM, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3 tabular-nums" }, cell: ({ row }) => <>{formatMeasurement(row.original.heightM, "m")} · {formatMeasurement(row.original.diameterCm, "cm")}</> },
    { id: "status", header: "Estado", accessorFn: (tree) => tree.active, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3" }, cell: ({ row }) => { const tree = row.original; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${tree.active ? "bg-[var(--color-success-fill)] text-[var(--color-success)]" : "bg-muted text-muted-foreground"}`}>{tree.active ? <Check className="size-4" aria-hidden /> : <CircleOff className="size-4" aria-hidden />}{tree.active ? "Activo" : "Inactivo"}</span>; } },
    { id: "actions", header: () => <span className="sr-only">Acciones</span>, enableSorting: false, meta: { headClassName: "h-auto whitespace-normal px-4 py-3 font-bold text-inherit", cellClassName: "whitespace-normal px-4 py-3" }, cell: ({ row }) => { const tree = row.original; return <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openDetail(tree)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(tree)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{tree.active ? <Button type="button" size="sm" variant="destructive" onClick={() => setDeactivateTarget(tree)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div>; } },
  ];
  const treeTable = useDataTable({ data: state.status === "ready" ? state.items : NO_TREES, columns: treeColumns, getRowId: (tree) => tree.id });

  return (
    <section aria-labelledby="trees-title" className="flex flex-col gap-6">
      <CatalogPageHeader
        title="Árboles"
        titleId="trees-title"
        actions={<>
          <Link className={buttonVariants({ variant: "outline" })} href={TREE_INTERVENTIONS_HREF}>Intervenciones de arbolado</Link>
          {canManage ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar árbol</Button> : null}
        </>}
      />

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Solo consulta</p> : null}
      {notice ? <Alert role="status"><AlertDescription>{notice}</AlertDescription></Alert> : null}

      <FieldGroup className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(240px,1fr)_200px_160px]">
        <Field>
          <FieldLabel htmlFor="tree-search">Buscar por especie o dirección</FieldLabel>
          <Input id="tree-search" aria-label="Buscar árbol" placeholder="Especie o dirección" value={search} maxLength={MAX_SEARCH_LENGTH} onChange={(event) => setParams({ q: event.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="tree-zone-filter">Zona</FieldLabel>
          <Select items={{ all: "Todas", ...Object.fromEntries(zones.map((zone) => [zone.id, zone.name])) }} value={zoneFilter} onValueChange={(value) => setParams({ zone: value === "all" ? null : String(value) })}>
            <SelectTrigger id="tree-zone-filter" aria-label="Filtrar árboles por zona"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">Todas</SelectItem>
              {zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
            </SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="tree-active-filter">Estado</FieldLabel>
          <Select items={{ all: "Todos", true: "Activos", false: "Inactivos" }} value={activeFilter} onValueChange={(value) => setParams({ active: value === "all" ? null : String(value) })}>
            <SelectTrigger id="tree-active-filter" aria-label="Filtrar árboles por estado"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      {state.status === "loading" ? <LoadingRegion label="Árboles registrados" className="flex flex-col gap-6"><Skeleton className="h-5 w-36" />
        <TableRowsSkeleton className="relative hidden overflow-x-auto rounded-xl border border-border bg-card md:block [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground [&_td]:px-4 [&_td]:py-3" rowCount={4} rowHeight="h-[65px]" actionsClassName="whitespace-nowrap text-right [&>*]:!inline-block [&>*]:!h-8 [&>*]:ml-2" actionColumn actionCount={3} columnLabels={["Código de relevamiento", "Especie", "Zona", "Ubicación", "Medidas", "Estado", "Acciones"]} columnWidths={["w-24", "w-28", "w-24", "w-40", "w-24", "w-16", "w-40"]} />
        <div className="grid gap-3 md:hidden">{Array.from({ length: PAGE_SIZE }, (_, card) => <RecordCardSkeleton key={card} />)}</div>
      </LoadingRegion> : null}
      {state.status === "error" ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{state.message}</span><Button type="button" variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></AlertDescription></Alert> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin árboles</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.total} {state.total === 1 ? "árbol encontrado" : "árboles encontrados"}</p>
        <div className="relative hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <DataTable
            table={treeTable}
            container={false}
            className="w-full min-w-[980px] text-left text-sm"
            headerClassName="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"
            rowProps={(row) => { const selected = row.original.id === surveyTreeSelection; return { "aria-current": selected ? "true" : undefined, className: `border-border last:border-0 ${selected ? "bg-[var(--color-info-fill)] hover:bg-[var(--color-info-fill)]" : "hover:bg-transparent"}` }; }}
          ><TableCaption className="sr-only">Catálogo de árboles</TableCaption></DataTable>
        </div>
        <div className="grid gap-3 md:hidden">{state.items.map((tree) => <article key={tree.id} aria-current={tree.id === surveyTreeSelection ? "true" : undefined} className={`rounded-xl border p-4 ${tree.id === surveyTreeSelection ? "border-[var(--color-accent)] bg-[var(--color-info-fill)]" : "border-border bg-card"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{tree.surveyCode}</p><h2 className="mt-1 font-semibold">{tree.species ?? "—"}</h2></div><span className="inline-flex items-center gap-1 text-sm">{tree.active ? <Check className="size-4 text-[var(--color-success)]" aria-hidden /> : <CircleOff className="size-4 text-muted-foreground" aria-hidden />}{tree.active ? "Activo" : "Inactivo"}</span></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona</dt><dd className="mt-0.5">{zoneLabel(zones, tree.zoneId, zonesLoaded)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicación</dt><dd className="mt-0.5">{tree.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medidas</dt><dd className="mt-0.5 tabular-nums">{formatMeasurement(tree.heightM, "m")} · {formatMeasurement(tree.diameterCm, "cm")}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openDetail(tree)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => openEdit(tree)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{tree.active ? <Button type="button" size="sm" variant="destructive" onClick={() => setDeactivateTarget(tree)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</div></article>)}</div>
      </> : null}

      {state.status === "ready" && state.items.length > 0 ? <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <Field className="min-w-64 flex-1">
          <FieldLabel htmlFor="tree-survey-selection">Árbol para relevar</FieldLabel>
          <Select items={Object.fromEntries(state.items.map((tree) => [tree.id, `${tree.surveyCode} · ${tree.species ?? "Especie no registrada"}`]))} value={state.items.some((tree) => tree.id === surveyTreeSelection) ? surveyTreeSelection : null} onValueChange={(value) => setParams({ tree: value ? String(value) : null }, false)}>
            <SelectTrigger id="tree-survey-selection" aria-label="Árbol para relevar"><SelectValue placeholder="Seleccione un árbol" /></SelectTrigger>
            <SelectContent><SelectGroup>{state.items.map((tree) => <SelectItem key={tree.id} value={tree.id}>{tree.surveyCode} · {tree.species ?? "Especie no registrada"}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <Button type="button" variant="outline" disabled={!surveyTreeSelection} onClick={() => setSurveyTree(state.items.find((tree) => tree.id === surveyTreeSelection) ?? null)}>Ver historial de relevamientos</Button>
      </div> : null}
      {state.status === "ready" && state.totalPages > 1 ? (() => {
        const pageUrl = (targetPage: number) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("page", String(targetPage));
          return `${pathname}?${next.toString()}`;
        };
        return <Pagination aria-label="Paginación de árboles" className="items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Página {page} de {state.totalPages}</span>
          <PaginationContent>
            <PaginationItem><PaginationPrevious href={page > 1 ? pageUrl(page - 1) : undefined} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : undefined} /></PaginationItem>
            <PaginationItem><PaginationNext href={page < state.totalPages ? pageUrl(page + 1) : undefined} aria-disabled={page >= state.totalPages} className={page >= state.totalPages ? "pointer-events-none opacity-50" : undefined} /></PaginationItem>
          </PaginationContent>
        </Pagination>;
      })() : null}
      {surveyTree ? <TreeSurveyPanel tree={surveyTree} scenario={scenario} onClose={() => setSurveyTree(null)} /> : null}
      {canRequestIntervention ? <Button type="button" variant="outline" disabled={!surveyTreeSelection} onClick={() => { setInterventionTreeIds([surveyTreeSelection]); setInterventionOpen(true); }}>Solicitar intervención sobre el árbol seleccionado</Button> : null}
      {canRequestIntervention ? <TreeInterventionRequestDialog key={`${interventionOpen}-${interventionTreeIds.join(",")}`} open={interventionOpen} onOpenChange={setInterventionOpen} trees={state.status === "ready" ? state.items : []} initialTreeIds={interventionTreeIds} onCreated={() => setNotice("Solicitud de intervención creada. Estado inicial: solicitada.")} /> : null}

      <CatalogDeactivationDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del árbol ${deactivateTarget?.surveyCode ?? ""}`.trim()}
        consequence="El árbol quedará inactivo."
        confirmAction={`Dar de baja el árbol ${deactivateTarget?.surveyCode ?? ""}`.trim()}
        safeAlternative={`Conservar árbol ${deactivateTarget?.surveyCode ?? ""}`.trim()}
        footerClassName="flex-col items-stretch sm:flex-row"
        isSubmitting={isSubmittingDeactivate}
        onConfirm={() => deactivateTarget && void deactivate(deactivateTarget)}
      >
        {deactivateError ? <Alert variant="destructive"><AlertDescription>{deactivateError}</AlertDescription></Alert> : null}
      </CatalogDeactivationDialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent key={editingTree?.id ?? "create"} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTree ? "Editar árbol" : "Registrar árbol"}</DialogTitle><DialogDescription>{editingTree ? "Actualice los datos del ejemplar. El código de relevamiento es inmutable." : "Complete los datos del ejemplar censado."}</DialogDescription></DialogHeader>
          {formError ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
          <form id="tree-form" onSubmit={(event) => void submitForm(event)} noValidate>
            <FieldGroup className="gap-4">
              <Field><FieldLabel htmlFor="tree-survey-code">Código de relevamiento</FieldLabel><Input id="tree-survey-code" value={form.surveyCode} disabled={Boolean(editingTree)} onChange={(event) => setForm({ ...form, surveyCode: event.target.value })} required={!editingTree} aria-describedby={editingTree ? "tree-survey-code-help" : undefined} /><FieldDescription className="text-xs leading-4" id="tree-survey-code-help">Identifica el ejemplar en el censo y no se puede cambiar.</FieldDescription></Field>
              <Field><FieldLabel htmlFor="tree-species">Especie</FieldLabel><Input id="tree-species" value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value })} required /></Field>
              <Field data-invalid={Boolean(zoneError)}>
                <FieldLabel htmlFor="tree-zone">Zona operativa <span aria-hidden="true">(obligatorio)</span></FieldLabel>
                <Select items={Object.fromEntries(zones.map((zone) => [zone.id, zone.name]))} value={form.zoneId || null} onValueChange={(value) => { setForm({ ...form, zoneId: String(value ?? "") }); setZoneError(null); }}>
                  <SelectTrigger id="tree-zone" aria-label="Zona operativa" aria-required="true" aria-invalid={Boolean(zoneError)} aria-describedby={zoneError ? "tree-zone-error" : undefined}><SelectValue placeholder="Seleccione una zona" /></SelectTrigger>
                  <SelectContent><SelectGroup>{zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
                
                {zoneError ? <FieldError id="tree-zone-error">{zoneError}</FieldError> : null}
              </Field>
              <Field><FieldLabel htmlFor="tree-address">Dirección</FieldLabel><Input id="tree-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /><FieldDescription className="text-xs leading-4">Opcional. Se utiliza junto con la especie en la búsqueda.</FieldDescription></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field><FieldLabel htmlFor="tree-lat">Latitud</FieldLabel><Input id="tree-lat" type="number" min="-90" max="90" step="any" value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} /></Field>
                <Field><FieldLabel htmlFor="tree-lng">Longitud</FieldLabel><Input id="tree-lng" type="number" min="-180" max="180" step="any" value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field><FieldLabel htmlFor="tree-height">Altura (m)</FieldLabel><Input id="tree-height" type="number" min="0" max="999.99" step="any" value={form.heightM} onChange={(event) => setForm({ ...form, heightM: event.target.value })} required /></Field>
                <Field><FieldLabel htmlFor="tree-diameter">Diámetro (cm)</FieldLabel><Input id="tree-diameter" type="number" min="0" max="9999.9" step="any" value={form.diameterCm} onChange={(event) => setForm({ ...form, diameterCm: event.target.value })} required /></Field>
              </div>
              {editingTree ? <Field orientation="horizontal" className="items-center"><Checkbox id="tree-active" checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: Boolean(checked) })} /><FieldLabel htmlFor="tree-active" className="font-normal">Activo</FieldLabel></Field> : null}
            </FieldGroup>
          </form>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="tree-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar árbol"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle del árbol {detailTree?.surveyCode ?? ""}</DialogTitle></DialogHeader>
          {detail.status === "loading" ? <LoadingRegion label="Detalle del árbol"><DetailFieldsSkeleton fieldCount={9} /></LoadingRegion> : null}
          {detail.status === "error" ? <Alert variant="destructive"><AlertDescription>{detail.message}</AlertDescription></Alert> : null}
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
      {surveys === null ? <Alert variant="destructive"><AlertDescription>No se pudieron cargar los relevamientos.</AlertDescription></Alert>
        : surveys.total === 0 ? <p className="text-sm text-muted-foreground">Sin relevamientos registrados.</p>
        : <>
          <p className="text-xs text-muted-foreground">{surveys.total > surveys.surveys.length ? `Últimos ${surveys.surveys.length} de ${surveys.total}` : `${surveys.total} ${surveys.total === 1 ? "relevamiento" : "relevamientos"}`}, del más reciente al más antiguo.</p>
          <ItemGroup className="gap-1 text-sm">{surveys.surveys.map((survey) => <Item key={survey.id} variant="outline" className="justify-between"><span>{formatSurveyDate(survey.surveyedAt)}</span><span className="font-medium">Riesgo {RISK_LEVEL_LABELS[survey.riskLevel].toLowerCase()}</span></Item>)}</ItemGroup>
        </>}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={onOpenSurveys}>Ver historial de relevamientos</Button>
    </section>

    <section aria-labelledby="tree-detail-work" className="flex flex-col gap-2">
      <h3 id="tree-detail-work" className="text-sm font-semibold">Intervenciones y servicios</h3>
      {/* ponytail: el backend no filtra GET /tree-interventions ni GET /services por árbol; hasta que lo haga,
          la ficha deriva a la cola en vez de traer todas las intervenciones y filtrarlas en el cliente. */}
      <Link className="self-start text-sm font-semibold text-[var(--color-action)] underline" href={TREE_INTERVENTIONS_HREF}>Ir a intervenciones de arbolado</Link>
    </section>
  </div>;
}
