"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleX, Clock3, Eye, Info, Plus, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import { treeInterventionCreateInputSchema, treeInterventionsAdapter, type TreeIntervention, type TreeInterventionCreateInput, type TreeInterventionDetail, type TreeInterventionStatus, type TreeInterventionType, type TreeInterventionQuery } from "@/lib/tree-interventions";
import type { OperationalScenario } from "@/lib/scenarios";
import type { Tree } from "@/lib/trees";

export const TREE_INTERVENTION_LABELS: Record<TreeInterventionType, string> = {
  FORMATION_PRUNING: "Poda de formación",
  SAFETY_PRUNING: "Poda de seguridad",
  REMOVAL: "Extracción",
  PLANTING: "Plantación",
  TREATMENT: "Tratamiento",
};

export const TREE_INTERVENTION_STATUS_LABELS: Record<TreeInterventionStatus, string> = {
  REQUESTED: "Solicitada",
  PENDING_AUTHORIZATION: "Pendiente de autorización",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rechazada",
};

const PRIORITY_LABELS = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica" } as const;
const STATUS_TONES: Record<TreeInterventionStatus, string> = {
  REQUESTED: "bg-[var(--color-info-fill)] text-[var(--color-info)]",
  PENDING_AUTHORIZATION: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  AUTHORIZED: "bg-[var(--color-success-fill)] text-[var(--color-success)]",
  REJECTED: "bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
};
const STATUS_ICONS: Record<TreeInterventionStatus, typeof Clock3> = {
  REQUESTED: Clock3,
  PENDING_AUTHORIZATION: ShieldAlert,
  AUTHORIZED: CheckCircle2,
  REJECTED: CircleX,
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; page: { interventions: TreeIntervention[]; page: number; pageSize: number; total: number; totalPages: number } }
  | { status: "error"; message: string };

type RequestForm = {
  interventionType: TreeInterventionType | "";
  treeIds: string[];
  address: string;
  requiresStreetClosure: boolean;
  priority: keyof typeof PRIORITY_LABELS;
  justification: string;
};

type RequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trees: Tree[];
  initialTreeIds?: string[];
  initialType?: TreeInterventionType | null;
  initialAddress?: string;
  initialRequiresStreetClosure?: boolean;
  initialJustification?: string;
  onCreated?: (intervention: TreeInterventionDetail) => void;
};

const emptyForm: RequestForm = { interventionType: "", treeIds: [], address: "", requiresStreetClosure: false, priority: "MEDIUM", justification: "" };

function formFor(props: RequestDialogProps): RequestForm {
  const selectedTrees = props.trees.filter((tree) => props.initialTreeIds?.includes(tree.id));
  return {
    interventionType: props.initialType ?? "",
    treeIds: selectedTrees.map((tree) => tree.id),
    address: props.initialAddress ?? selectedTrees[0]?.address ?? "",
    requiresStreetClosure: props.initialRequiresStreetClosure ?? false,
    priority: props.initialType === "REMOVAL" ? "CRITICAL" : "MEDIUM",
    justification: props.initialJustification ?? "",
  };
}

function treeName(tree: Tree) {
  return `${tree.surveyCode} · ${tree.species}`;
}

function dateTimeLabel(value?: string) {
  return value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "No registrada";
}

function InterventionStatusBadge({ status }: { status: TreeInterventionStatus }) {
  const Icon = STATUS_ICONS[status];
  return <Badge variant="outline" className={`border-transparent ${STATUS_TONES[status]}`}><Icon data-icon="inline-start" aria-hidden />{TREE_INTERVENTION_STATUS_LABELS[status]}</Badge>;
}

export function TreeInterventionRequestDialog(props: RequestDialogProps) {
  const [form, setForm] = useState<RequestForm>(() => formFor(props));
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorField, setFormErrorField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormErrorField(null);
    const parsed = treeInterventionCreateInputSchema.safeParse({ interventionType: form.interventionType, treeIds: form.treeIds, address: form.address, requiresStreetClosure: form.requiresStreetClosure, priority: form.priority, justification: form.justification.trim() || undefined });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFormError(issue?.message ?? "Revise los datos de la solicitud.");
      setFormErrorField(String(issue?.path[0] ?? "form"));
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await treeInterventionsAdapter.create(parsed.data as TreeInterventionCreateInput);
      props.onCreated?.(created);
      props.onOpenChange(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "No se pudo crear la solicitud de intervención.");
      setFormErrorField("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldHasError = (field: string) => formErrorField === field;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar intervención</DialogTitle>
          <DialogDescription>Registre qué intervención requiere uno o más árboles. La solicitud comenzará en estado solicitada.</DialogDescription>
        </DialogHeader>
        {formError && fieldHasError("form") ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
        <form id="tree-intervention-form" onSubmit={(event) => void submit(event)} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldHasError("interventionType")}>
              <FieldLabel htmlFor="intervention-type">Tipo de intervención <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <select id="intervention-type" className={formControlClass} value={form.interventionType} aria-invalid={fieldHasError("interventionType")} aria-describedby={fieldHasError("interventionType") ? "intervention-type-error" : undefined} onChange={(event) => setForm({ ...form, interventionType: event.target.value as RequestForm["interventionType"] })} required>
                <option value="">Seleccione un tipo</option>
                {Object.entries(TREE_INTERVENTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {fieldHasError("interventionType") ? <FieldError id="intervention-type-error">{formError}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldHasError("treeIds")}>
              <FieldLabel htmlFor="intervention-trees">Árboles a intervenir <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <select id="intervention-trees" multiple size={Math.min(6, Math.max(3, props.trees.length))} className={`${formControlClass} h-auto py-2`} value={form.treeIds} aria-invalid={fieldHasError("treeIds")} aria-describedby="intervention-trees-help" onChange={(event) => setForm({ ...form, treeIds: Array.from(event.target.selectedOptions, (option) => option.value), address: form.address || props.trees.find((tree) => tree.id === event.target.value)?.address || "" })}>
                {props.trees.map((tree) => <option key={tree.id} value={tree.id}>{treeName(tree)} · {tree.address ?? "Sin dirección"}</option>)}
              </select>
              <FieldDescription id="intervention-trees-help">Mantenga presionada la tecla Ctrl o ⌘ para seleccionar más de un árbol.</FieldDescription>
              {fieldHasError("treeIds") ? <FieldError>{formError}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldHasError("address")}>
              <FieldLabel htmlFor="intervention-address">Dirección <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <input id="intervention-address" className={formControlClass} value={form.address} aria-invalid={fieldHasError("address")} aria-describedby={fieldHasError("address") ? "intervention-address-error" : undefined} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
              {fieldHasError("address") ? <FieldError id="intervention-address-error">{formError}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="intervention-priority">Prioridad <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <select id="intervention-priority" className={formControlClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as RequestForm["priority"] })}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </Field>
            <Field className="flex-row items-start gap-2">
              <input id="intervention-street-closure" type="checkbox" className="mt-1 size-4 border border-[var(--color-border-strong)] accent-[var(--color-action)]" checked={form.requiresStreetClosure} onChange={(event) => setForm({ ...form, requiresStreetClosure: event.target.checked })} />
              <FieldLabel htmlFor="intervention-street-closure" className="font-normal">Requiere corte de calle</FieldLabel>
            </Field>
            <Field data-invalid={fieldHasError("justification")}>
              <FieldLabel htmlFor="intervention-justification">Justificación{form.interventionType === "REMOVAL" ? <span aria-hidden="true"> (obligatorio para extracción)</span> : null}</FieldLabel>
              <textarea id="intervention-justification" className={`${formControlClass} min-h-24`} value={form.justification} aria-invalid={fieldHasError("justification")} aria-describedby="intervention-justification-help" onChange={(event) => setForm({ ...form, justification: event.target.value })} />
              <FieldDescription id="intervention-justification-help">Es obligatoria para solicitar una extracción. No se adjuntan evidencias en esta etapa.</FieldDescription>
              {fieldHasError("justification") ? <FieldError>{formError}</FieldError> : null}
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)} disabled={isSubmitting}>Cerrar formulario</Button>
          <Button type="submit" form="tree-intervention-form" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Creando solicitud…" : "Crear solicitud de intervención"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TreeInterventionsPanel({ scenario }: { scenario: OperationalScenario }) {
  const canRequest = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("treeIntervention:request");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [trees, setTrees] = useState<Tree[]>([]);
  const [interventionType, setInterventionType] = useState<TreeInterventionType | "">("");
  const [status, setStatus] = useState<TreeInterventionStatus | "">("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTreeIds, setRequestTreeIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<TreeInterventionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useMemo<TreeInterventionQuery>(() => ({ interventionType: interventionType || undefined, status: status || undefined, page, pageSize: 10 }), [interventionType, page, status]);

  useEffect(() => {
    let current = true;
    void import("@/lib/trees").then(({ treesAdapter }) => treesAdapter.list({ active: true, pageSize: 100 })).then((loaded) => { if (current) setTrees(loaded.trees); }).catch(() => undefined);
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    void treeInterventionsAdapter.list(query).then((loaded) => { if (current) setState({ status: "ready", page: loaded }); }).catch((caught) => { if (current) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar las intervenciones." }); });
    return () => { current = false; };
  }, [query, requestVersion]);

  const openRequest = (treeIds: string[] = []) => { setRequestTreeIds(treeIds); setRequestOpen(true); setNotice(null); };
  const openDetail = async (intervention: TreeIntervention) => {
    setDetail(intervention); setDetailError(null); setDetailLoading(true);
    try { setDetail(await treeInterventionsAdapter.get(intervention.id)); } catch (caught) { setDetailError(caught instanceof Error ? caught.message : "No se pudo cargar el detalle de la intervención."); } finally { setDetailLoading(false); }
  };
  const treeById = (id: string) => trees.find((tree) => tree.id === id);

  return (
    <section aria-labelledby="tree-interventions-title" className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Arbolado urbano</p>
          <h1 id="tree-interventions-title" className="text-2xl font-semibold tracking-tight">Intervenciones de arbolado</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Solicitudes de poda, extracción, plantación o tratamiento antes de su autorización y programación.</p>
        </div>
        {canRequest ? <Button type="button" onClick={() => openRequest()}><Plus data-icon="inline-start" aria-hidden />Solicitar intervención</Button> : null}
      </div>
      {!canRequest ? <Alert><Info data-icon="inline-start" aria-hidden /><AlertDescription>Esta sesión puede consultar las solicitudes, pero no crear intervenciones de arbolado.</AlertDescription></Alert> : null}
      {notice ? <Alert><CheckCircle2 data-icon="inline-start" aria-hidden /><AlertDescription>{notice}</AlertDescription></Alert> : null}
      <FieldGroup className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="intervention-type-filter">Tipo de intervención</FieldLabel>
          <select id="intervention-type-filter" className={formControlClass} aria-label="Filtrar por tipo de intervención" value={interventionType} onChange={(event) => { setInterventionType(event.target.value as TreeInterventionType | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(TREE_INTERVENTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </Field>
        <Field>
          <FieldLabel htmlFor="intervention-status-filter">Estado de la solicitud</FieldLabel>
          <select id="intervention-status-filter" className={formControlClass} aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value as TreeInterventionStatus | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(TREE_INTERVENTION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </Field>
      </FieldGroup>
      {state.status === "loading" ? <div role="status" aria-label="Cargando intervenciones" className="flex flex-col gap-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div> : null}
      {state.status === "error" ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{state.message}</span><Button type="button" variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></AlertDescription></Alert> : null}
      {state.status === "ready" && state.page.interventions.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin solicitudes de intervención</EmptyTitle><EmptyDescription>{interventionType || status ? "No hay solicitudes para los filtros seleccionados. Quite uno o más filtros para consultar el registro completo." : "Todavía no hay solicitudes de intervención registradas."}</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.page.interventions.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.page.total} {state.page.total === 1 ? "solicitud" : "solicitudes"}</p>
        <div className="grid gap-3" aria-label="Solicitudes de intervención">
          {state.page.interventions.map((intervention) => <article key={intervention.id} aria-label={`${intervention.id} · ${TREE_INTERVENTION_LABELS[intervention.interventionType]}`} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-mono text-xs text-muted-foreground">{intervention.id}</p><h2 className="mt-1 text-base font-semibold">{TREE_INTERVENTION_LABELS[intervention.interventionType]}</h2></div>
              <InterventionStatusBadge status={intervention.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Árboles</dt><dd className="mt-0.5">{intervention.treeIds.length} {intervention.treeIds.length === 1 ? "ejemplar" : "ejemplares"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</dt><dd className="mt-0.5">{PRIORITY_LABELS[intervention.priority]}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5">{intervention.address}</dd></div></dl>
            <div className="mt-4 flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(intervention)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button></div>
          </article>)}
        </div>
        <div className="flex items-center justify-between gap-3" aria-label="Paginación de intervenciones"><span className="text-sm text-muted-foreground">Página {state.page.page} de {state.page.totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={state.page.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft data-icon="inline-start" aria-hidden />Anterior</Button><Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={state.page.page >= state.page.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight data-icon="inline-end" aria-hidden /></Button></div></div>
      </> : null}

      {canRequest ? <TreeInterventionRequestDialog key={`${requestOpen}-${requestTreeIds.join(",")}`} open={requestOpen} onOpenChange={setRequestOpen} trees={trees} initialTreeIds={requestTreeIds} onCreated={() => { setNotice("Solicitud de intervención creada. Estado inicial: solicitada."); setPage(1); setRequestVersion((version) => version + 1); }} /> : null}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalle de la intervención</DialogTitle><DialogDescription>Consulta de la solicitud. Las acciones de autorización y programación pertenecen a una etapa posterior.</DialogDescription></DialogHeader>
          {detailLoading ? <p role="status">Cargando detalle…</p> : null}
          {detailError ? <Alert variant="destructive"><AlertDescription>{detailError}</AlertDescription></Alert> : null}
          {detail && !detailLoading && !detailError ? <div className="flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{detail.id}</p><p className="mt-1 font-semibold">{TREE_INTERVENTION_LABELS[detail.interventionType]}</p></div><InterventionStatusBadge status={detail.status} /></div><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</dt><dd className="mt-0.5">{PRIORITY_LABELS[detail.priority]}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha de solicitud</dt><dd className="mt-0.5 tabular-nums">{dateTimeLabel(detail.createdAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5">{detail.address}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Corte de calle</dt><dd className="mt-0.5">{detail.requiresStreetClosure ? "Sí" : "No"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Árboles vinculados</dt><dd className="mt-1"><ul className="flex flex-col gap-2">{(detail.trees ?? detail.treeIds.map((id) => treeById(id))).map((tree, index) => <li key={tree?.id ?? detail.treeIds[index]} className="rounded-xl border border-border bg-muted px-3 py-2">{tree ? <><span className="font-medium">{treeName(tree)}</span><span className="block text-xs text-muted-foreground">{tree.address ?? "Sin dirección registrada"}</span></> : detail.treeIds[index]}</li>)}</ul></dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificación</dt><dd className="mt-0.5 whitespace-pre-wrap">{detail.justification ?? "Sin justificación registrada."}</dd></div></dl></div> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDetail(null)}>Cerrar detalle</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
