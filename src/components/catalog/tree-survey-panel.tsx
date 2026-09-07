"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { OperationalScenario } from "@/lib/scenarios";
import type { Tree } from "@/lib/trees";
import { treeSurveyCreateInputSchema, treeSurveysAdapter, type RiskLevel, type TreeHealthStatus, type TreeSurvey, type TreeSurveyCreateInput, type TreeSurveyQuery } from "@/lib/tree-surveys";

type LoadState = { status: "loading" } | { status: "ready"; page: { surveys: TreeSurvey[]; page: number; pageSize: number; total: number; totalPages: number } } | { status: "error"; message: string };
type FormState = { surveyedAt: string; healthStatus: TreeHealthStatus | ""; riskLevel: RiskLevel | ""; riskType: string; suggestedIntervention: string; requiresStreetClosure: boolean; requiresPublicWorks: boolean; notes: string };

const HEALTH_LABELS: Record<TreeHealthStatus, string> = { HEALTHY: "Saludable", WEAKENED: "Debilitado", DISEASED: "Enfermo", DEAD: "Muerto" };
const RISK_LABELS: Record<RiskLevel, string> = { NONE: "Sin riesgo", LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto", CRITICAL: "Crítico" };
const RISK_TYPE_LABELS = { FALLING_BRANCH: "Caída de ramas", TRUNK_INSTABILITY: "Inestabilidad del tronco", ROOT_UPLIFT: "Levantamiento de raíces", POWER_LINE_CONTACT: "Contacto con tendido eléctrico", SIGN_OBSTRUCTION: "Obstrucción de señalización", PEST_INFESTATION: "Infestación de plagas" } as const;
const INTERVENTION_LABELS = { FORMATION_PRUNING: "Poda de formación", SAFETY_PRUNING: "Poda de seguridad", REMOVAL: "Extracción", PLANTING: "Plantación", TREATMENT: "Tratamiento" } as const;

const emptyForm: FormState = { surveyedAt: new Date().toISOString().slice(0, 10), healthStatus: "", riskLevel: "", riskType: "", suggestedIntervention: "", requiresStreetClosure: false, requiresPublicWorks: false, notes: "" };

function dateLabel(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TreeSurveyPanel({ tree, scenario, onClose }: { tree: Tree; scenario: OperationalScenario; onClose: () => void }) {
  const canSurvey = scenario.capabilities.includes("tree:survey");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [healthStatus, setHealthStatus] = useState<TreeHealthStatus | "">("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "">("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detail, setDetail] = useState<TreeSurvey | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useMemo<TreeSurveyQuery>(() => ({ healthStatus: healthStatus || undefined, riskLevel: riskLevel || undefined, page, pageSize: 10 }), [healthStatus, page, riskLevel]);

  useEffect(() => {
    let current = true;
    async function load() {
      setState({ status: "loading" });
      try {
        const loaded = await treeSurveysAdapter.getTreeSurveys(tree.id, query);
        if (current) setState({ status: "ready", page: loaded });
      } catch (caught) {
        if (current) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudo cargar el historial de relevamientos." });
      }
    }
    void load();
    return () => { current = false; };
  }, [query, requestVersion, tree.id]);

  const openCreate = () => { setForm(emptyForm); setFormError(null); setNotice(null); setFormOpen(true); };
  const openDetail = async (survey: TreeSurvey) => {
    setDetail(survey); setDetailError(null); setDetailLoading(true);
    try { setDetail(await treeSurveysAdapter.getTreeSurvey(tree.id, survey.id)); }
    catch (caught) { setDetailError(caught instanceof Error ? caught.message : "No se pudo cargar el detalle del relevamiento."); }
    finally { setDetailLoading(false); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(null);
    const parsed = treeSurveyCreateInputSchema.safeParse({ surveyedAt: `${form.surveyedAt}T12:00:00.000Z`, healthStatus: form.healthStatus, riskLevel: form.riskLevel, riskType: form.riskType || undefined, suggestedIntervention: form.suggestedIntervention || undefined, requiresStreetClosure: form.requiresStreetClosure, requiresPublicWorks: form.requiresPublicWorks, notes: form.notes.trim() || undefined });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Revise los datos del formulario."); return; }
    setIsSubmitting(true);
    try { await treeSurveysAdapter.createTreeSurvey(tree.id, parsed.data as TreeSurveyCreateInput); setFormOpen(false); setNotice("Relevamiento registrado con éxito."); setPage(1); setRequestVersion((version) => version + 1); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : "No se pudo registrar el relevamiento."); }
    finally { setIsSubmitting(false); }
  };

  return <section aria-labelledby="tree-surveys-title" className="flex max-w-5xl flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Button type="button" variant="ghost" size="sm" className="mb-2 -ml-3 gap-1" onClick={onClose}><ArrowLeft className="size-4" aria-hidden />Volver al censo</Button><h2 id="tree-surveys-title" className="text-2xl font-semibold tracking-tight">Historial de relevamientos · {tree.surveyCode}</h2><p className="mt-1 text-sm text-muted-foreground">{tree.species} · {tree.address ?? "Sin dirección registrada"}</p></div>
      {canSurvey ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar relevamiento</Button> : null}
    </div>
    {!canSurvey ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el historial, pero no registrar relevamientos.</p> : null}
    {notice ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{notice}</p> : null}
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm font-semibold">Estado sanitario<select aria-label="Filtrar por estado sanitario" className={formControlClass} value={healthStatus} onChange={(event) => { setHealthStatus(event.target.value as TreeHealthStatus | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(HEALTH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-semibold">Nivel de riesgo<select aria-label="Filtrar por nivel de riesgo" className={formControlClass} value={riskLevel} onChange={(event) => { setRiskLevel(event.target.value as RiskLevel | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {state.status === "loading" ? <div role="status" aria-label="Cargando relevamientos" className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : null}
    {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
    {state.status === "ready" && state.page.surveys.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin relevamientos</EmptyTitle><EmptyDescription>No hay registros para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
    {state.status === "ready" && state.page.surveys.length > 0 ? <><p className="text-sm text-muted-foreground" aria-live="polite">{state.page.total} {state.page.total === 1 ? "relevamiento" : "relevamientos"}</p><div className="grid gap-3">{state.page.surveys.map((survey) => <article key={survey.id} aria-label={`${dateLabel(survey.surveyedAt)} · ${RISK_LABELS[survey.riskLevel]}`} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{dateLabel(survey.surveyedAt)}</p><p className="mt-1 text-sm text-muted-foreground">{HEALTH_LABELS[survey.healthStatus]} · Riesgo {RISK_LABELS[survey.riskLevel]}</p></div><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(survey)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de riesgo</dt><dd className="mt-0.5">{survey.riskType ? RISK_TYPE_LABELS[survey.riskType] : "No informado"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervención sugerida</dt><dd className="mt-0.5">{survey.suggestedIntervention ? INTERVENTION_LABELS[survey.suggestedIntervention] : "No sugerida"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependencias</dt><dd className="mt-0.5">{[survey.requiresStreetClosure && "Corte de calle", survey.requiresPublicWorks && "Obras públicas"].filter(Boolean).join(" · ") || "Ninguna"}</dd></div></dl></article>)}</div><div className="flex items-center justify-between gap-3" aria-label="Paginación de relevamientos"><span className="text-sm text-muted-foreground">Página {state.page.page} de {state.page.totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={state.page.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="size-4" aria-hidden />Anterior</Button><Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={state.page.page >= state.page.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight className="size-4" aria-hidden /></Button></div></div></> : null}

    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>Registrar relevamiento</DialogTitle><DialogDescription>Observación ambiental del árbol. El registro quedará guardado como parte del historial inmutable.</DialogDescription></DialogHeader>{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}<form id="tree-survey-form" onSubmit={(event) => void submit(event)} noValidate><div className="grid gap-4"><label className="flex flex-col gap-1 text-sm font-semibold">Fecha del relevamiento<input aria-label="Fecha del relevamiento" type="date" className={formControlClass} value={form.surveyedAt} onChange={(event) => setForm({ ...form, surveyedAt: event.target.value })} required /></label><label className="flex flex-col gap-1 text-sm font-semibold">Estado sanitario<select aria-label="Estado sanitario" className={formControlClass} value={form.healthStatus} onChange={(event) => setForm({ ...form, healthStatus: event.target.value as FormState["healthStatus"] })} required><option value="">Seleccione un estado</option>{Object.entries(HEALTH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-semibold">Nivel de riesgo<select aria-label="Nivel de riesgo" className={formControlClass} value={form.riskLevel} onChange={(event) => setForm({ ...form, riskLevel: event.target.value as FormState["riskLevel"] })} required><option value="">Seleccione un nivel</option>{Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-semibold">Tipo de riesgo<select aria-label="Tipo de riesgo" className={formControlClass} value={form.riskType} onChange={(event) => setForm({ ...form, riskType: event.target.value })}><option value="">Seleccione un tipo</option>{Object.entries(RISK_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-semibold">Intervención sugerida<select aria-label="Intervención sugerida" className={formControlClass} value={form.suggestedIntervention} onChange={(event) => setForm({ ...form, suggestedIntervention: event.target.value })}><option value="">Sin sugerencia</option>{Object.entries(INTERVENTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresStreetClosure} onChange={(event) => setForm({ ...form, requiresStreetClosure: event.target.checked })} /> Requiere corte de calle</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresPublicWorks} onChange={(event) => setForm({ ...form, requiresPublicWorks: event.target.checked })} /> Requiere obras públicas</label><label className="flex flex-col gap-1 text-sm font-semibold">Observaciones<textarea aria-label="Observaciones" className={`${formControlClass} min-h-24`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="tree-survey-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar relevamiento"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>Detalle del relevamiento</DialogTitle><DialogDescription>Registro de lectura. Los relevamientos existentes no se pueden modificar ni eliminar.</DialogDescription></DialogHeader>{detailLoading ? <p role="status">Cargando detalle…</p> : null}{detailError ? <p role="alert">{detailError}</p> : null}{detail && !detailLoading && !detailError ? <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</dt><dd className="mt-0.5">{dateTimeLabel(detail.surveyedAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado sanitario</dt><dd className="mt-0.5">{HEALTH_LABELS[detail.healthStatus]}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nivel de riesgo</dt><dd className="mt-0.5">{RISK_LABELS[detail.riskLevel]}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de riesgo</dt><dd className="mt-0.5">{detail.riskType ? RISK_TYPE_LABELS[detail.riskType] : "No informado"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervención sugerida</dt><dd className="mt-0.5">{detail.suggestedIntervention ? INTERVENTION_LABELS[detail.suggestedIntervention] : "No sugerida"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere corte de calle</dt><dd className="mt-0.5">{detail.requiresStreetClosure ? "Sí" : "No"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere obras públicas</dt><dd className="mt-0.5">{detail.requiresPublicWorks ? "Sí" : "No"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</dt><dd className="mt-0.5 whitespace-pre-wrap">{detail.notes ?? "Sin observaciones"}</dd></div></dl> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setDetail(null)}>Cerrar detalle</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
