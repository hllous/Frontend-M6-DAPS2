"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Eye, HeartPulse, Plus, ShieldAlert, Skull, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { OperationalScenario } from "@/lib/scenarios";
import type { Tree } from "@/lib/trees";
import { cn } from "@/lib/utils";
import { treeSurveyCreateInputSchema, treeSurveysAdapter, type RiskLevel, type TreeHealthStatus, type TreeSurvey, type TreeSurveyCreateInput, type TreeSurveyQuery } from "@/lib/tree-surveys";

type LoadState = { status: "loading" } | { status: "ready"; page: { surveys: TreeSurvey[]; page: number; pageSize: number; total: number; totalPages: number } } | { status: "error"; message: string };
type FormState = { surveyedAt: string; healthStatus: TreeHealthStatus | ""; riskLevel: RiskLevel | ""; riskType: string; suggestedIntervention: string; requiresStreetClosure: boolean; requiresPublicWorks: boolean; notes: string };
type FormErrorField = "surveyedAt" | "healthStatus" | "riskLevel" | "riskType" | "suggestedIntervention" | "notes" | "form";

const HEALTH_LABELS: Record<TreeHealthStatus, string> = { HEALTHY: "Saludable", WEAKENED: "Debilitado", DISEASED: "Enfermo", DEAD: "Muerto" };
const RISK_LABELS: Record<RiskLevel, string> = { NONE: "Sin riesgo", LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto", CRITICAL: "Crítico" };
const RISK_TYPE_LABELS = { FALLING_BRANCH: "Caída de ramas", TRUNK_INSTABILITY: "Inestabilidad del tronco", ROOT_UPLIFT: "Levantamiento de raíces", POWER_LINE_CONTACT: "Contacto con tendido eléctrico", SIGN_OBSTRUCTION: "Obstrucción de señalización", PEST_INFESTATION: "Infestación de plagas" } as const;
const INTERVENTION_LABELS = { FORMATION_PRUNING: "Poda de formación", SAFETY_PRUNING: "Poda de seguridad", REMOVAL: "Extracción", PLANTING: "Plantación", TREATMENT: "Tratamiento" } as const;
const emptyForm: FormState = { surveyedAt: new Date().toISOString().slice(0, 10), healthStatus: "", riskLevel: "", riskType: "", suggestedIntervention: "", requiresStreetClosure: false, requiresPublicWorks: false, notes: "" };

const HEALTH_TONES: Record<TreeHealthStatus, string> = {
  HEALTHY: "bg-[var(--color-success-fill)] text-[var(--color-success)]",
  WEAKENED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  DISEASED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  DEAD: "bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
};
const HEALTH_ICONS = { HEALTHY: CheckCircle2, WEAKENED: TriangleAlert, DISEASED: HeartPulse, DEAD: Skull } as const;
const RISK_TONES: Record<RiskLevel, string> = {
  NONE: "bg-[var(--color-success-fill)] text-[var(--color-success)]",
  LOW: "bg-[var(--color-success-fill)] text-[var(--color-success)]",
  MEDIUM: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  HIGH: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  CRITICAL: "bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
};

function dateLabel(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function HealthBadge({ status }: { status: TreeHealthStatus }) {
  const Icon = HEALTH_ICONS[status];
  return <Badge variant="outline" className={cn("border-transparent", HEALTH_TONES[status])}><Icon data-icon="inline-start" aria-hidden />{HEALTH_LABELS[status]}</Badge>;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant="outline" className={cn("border-transparent", RISK_TONES[level])}><ShieldAlert data-icon="inline-start" aria-hidden />Riesgo {RISK_LABELS[level]}</Badge>;
}

export function AuditedTreeSurveyPanel({ tree, scenario, onClose }: { tree: Tree; scenario: OperationalScenario; onClose: () => void }) {
  const canSurvey = scenario.capabilities.includes("tree:survey");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [healthStatus, setHealthStatus] = useState<TreeHealthStatus | "">("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "">("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorField, setFormErrorField] = useState<FormErrorField | null>(null);
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

  const openCreate = () => { setForm(emptyForm); setFormError(null); setFormErrorField(null); setNotice(null); setFormOpen(true); };
  const openDetail = async (survey: TreeSurvey) => {
    setDetail(survey); setDetailError(null); setDetailLoading(true);
    try { setDetail(await treeSurveysAdapter.getTreeSurvey(tree.id, survey.id)); }
    catch (caught) { setDetailError(caught instanceof Error ? caught.message : "No se pudo cargar el detalle del relevamiento."); }
    finally { setDetailLoading(false); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(null); setFormErrorField(null);
    const parsed = treeSurveyCreateInputSchema.safeParse({ surveyedAt: `${form.surveyedAt}T12:00:00.000Z`, healthStatus: form.healthStatus, riskLevel: form.riskLevel, riskType: form.riskType || undefined, suggestedIntervention: form.suggestedIntervention || undefined, requiresStreetClosure: form.requiresStreetClosure, requiresPublicWorks: form.requiresPublicWorks, notes: form.notes.trim() || undefined });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFormError(issue?.message ?? "Revise los datos del formulario y complete los campos obligatorios.");
      setFormErrorField((issue?.path[0] as FormErrorField | undefined) ?? "form");
      return;
    }
    setIsSubmitting(true);
    try { await treeSurveysAdapter.createTreeSurvey(tree.id, parsed.data as TreeSurveyCreateInput); setFormOpen(false); setNotice("Relevamiento registrado con éxito."); setPage(1); setRequestVersion((version) => version + 1); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : "No se pudo registrar el relevamiento."); setFormErrorField("form"); }
    finally { setIsSubmitting(false); }
  };
  const fieldHasError = (field: FormErrorField) => formErrorField === field;

  return <section aria-labelledby="tree-surveys-title" className="flex max-w-5xl flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Button type="button" variant="ghost" size="sm" className="mb-2 -ml-3 gap-1" onClick={onClose}><ArrowLeft data-icon="inline-start" aria-hidden />Volver al censo</Button><h2 id="tree-surveys-title" className="text-2xl font-semibold tracking-tight">Historial de relevamientos · {tree.surveyCode}</h2><p className="mt-1 text-sm text-muted-foreground">{tree.species} · {tree.address ?? "Sin dirección registrada"}</p></div>
      {canSurvey ? <Button type="button" onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar relevamiento</Button> : null}
    </div>
    {!canSurvey ? <Alert><AlertDescription>Esta sesión puede consultar el historial, pero no registrar relevamientos.</AlertDescription></Alert> : null}
    {notice ? <p role="status" className="rounded-lg border border-[var(--color-success-line)] bg-[var(--color-success-fill)] px-3 py-2 text-sm text-[var(--color-success)]">{notice}</p> : null}
    <FieldGroup className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="survey-health-filter">Estado sanitario</FieldLabel>
        <select id="survey-health-filter" aria-label="Filtrar por estado sanitario" className={formControlClass} value={healthStatus} onChange={(event) => { setHealthStatus(event.target.value as TreeHealthStatus | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(HEALTH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </Field>
      <Field>
        <FieldLabel htmlFor="survey-risk-filter">Nivel de riesgo</FieldLabel>
        <select id="survey-risk-filter" aria-label="Filtrar por nivel de riesgo" className={formControlClass} value={riskLevel} onChange={(event) => { setRiskLevel(event.target.value as RiskLevel | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </Field>
    </FieldGroup>
    {state.status === "loading" ? <div role="status" aria-label="Cargando relevamientos" className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : null}
    {state.status === "error" ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{state.message}</span><Button type="button" variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></AlertDescription></Alert> : null}
    {state.status === "ready" && state.page.surveys.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin relevamientos</EmptyTitle><EmptyDescription>No hay registros para los filtros seleccionados. Quite uno o más filtros para consultar el historial completo.</EmptyDescription></EmptyHeader></Empty> : null}
    {state.status === "ready" && state.page.surveys.length > 0 ? <><p className="text-sm text-muted-foreground" aria-live="polite">{state.page.total} {state.page.total === 1 ? "relevamiento" : "relevamientos"}</p><div className="grid gap-3">{state.page.surveys.map((survey) => <article key={survey.id} aria-label={`${dateLabel(survey.surveyedAt)} · ${RISK_LABELS[survey.riskLevel]}`} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{dateLabel(survey.surveyedAt)}</p><div className="mt-2 flex flex-wrap gap-2"><HealthBadge status={survey.healthStatus} /><RiskBadge level={survey.riskLevel} /></div></div><Button type="button" size="sm" variant="outline" onClick={() => void openDetail(survey)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de riesgo</dt><dd className="mt-0.5">{survey.riskType ? RISK_TYPE_LABELS[survey.riskType] : "No informado"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervención sugerida</dt><dd className="mt-0.5">{survey.suggestedIntervention ? INTERVENTION_LABELS[survey.suggestedIntervention] : "No sugerida"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependencias</dt><dd className="mt-0.5">{[survey.requiresStreetClosure && "Corte de calle", survey.requiresPublicWorks && "Obras públicas"].filter(Boolean).join(" · ") || "Ninguna"}</dd></div></dl></article>)}</div><div className="flex items-center justify-between gap-3" aria-label="Paginación de relevamientos"><span className="text-sm text-muted-foreground">Página {state.page.page} de {state.page.totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={state.page.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft data-icon="inline-start" aria-hidden />Anterior</Button><Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={state.page.page >= state.page.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight data-icon="inline-end" aria-hidden /></Button></div></div></> : null}

    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>Registrar relevamiento</DialogTitle><DialogDescription>Observación ambiental del árbol. El registro quedará guardado como parte del historial inmutable.</DialogDescription></DialogHeader>{formError && fieldHasError("form") ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}<form id="tree-survey-form" onSubmit={(event) => void submit(event)} noValidate><FieldGroup>
      <Field data-invalid={fieldHasError("surveyedAt")}>
        <FieldLabel htmlFor="surveyed-at">Fecha del relevamiento <span aria-hidden="true">(obligatorio)</span></FieldLabel>
        <input id="surveyed-at" aria-label="Fecha del relevamiento" aria-invalid={fieldHasError("surveyedAt")} aria-describedby={fieldHasError("surveyedAt") ? "surveyed-at-help surveyed-at-error" : "surveyed-at-help"} type="date" className={formControlClass} value={form.surveyedAt} onChange={(event) => setForm({ ...form, surveyedAt: event.target.value })} required />
        <FieldDescription id="surveyed-at-help">Indique la fecha en que se realizó la observación.</FieldDescription>
        {fieldHasError("surveyedAt") ? <FieldError id="surveyed-at-error">{formError}</FieldError> : null}
      </Field>
      <Field data-invalid={fieldHasError("healthStatus")}>
        <FieldLabel htmlFor="health-status">Estado sanitario <span aria-hidden="true">(obligatorio)</span></FieldLabel>
        <select id="health-status" aria-label="Estado sanitario" aria-invalid={fieldHasError("healthStatus")} aria-describedby={fieldHasError("healthStatus") ? "health-status-help health-status-error" : "health-status-help"} className={formControlClass} value={form.healthStatus} onChange={(event) => setForm({ ...form, healthStatus: event.target.value as FormState["healthStatus"] })} required><option value="">Seleccione un estado</option>{Object.entries(HEALTH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <FieldDescription id="health-status-help">Seleccione el estado observado durante el relevamiento.</FieldDescription>
        {fieldHasError("healthStatus") ? <FieldError id="health-status-error">{formError}</FieldError> : null}
      </Field>
      <Field data-invalid={fieldHasError("riskLevel")}>
        <FieldLabel htmlFor="risk-level">Nivel de riesgo <span aria-hidden="true">(obligatorio)</span></FieldLabel>
        <select id="risk-level" aria-label="Nivel de riesgo" aria-invalid={fieldHasError("riskLevel")} aria-describedby={fieldHasError("riskLevel") ? "risk-level-help risk-level-error" : "risk-level-help"} className={formControlClass} value={form.riskLevel} onChange={(event) => setForm({ ...form, riskLevel: event.target.value as FormState["riskLevel"] })} required><option value="">Seleccione un nivel</option>{Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <FieldDescription id="risk-level-help">Use el nivel que corresponda a la exposición observada.</FieldDescription>
        {fieldHasError("riskLevel") ? <FieldError id="risk-level-error">{formError}</FieldError> : null}
      </Field>
      <Field data-invalid={fieldHasError("riskType")}>
        <FieldLabel htmlFor="risk-type">Tipo de riesgo</FieldLabel>
        <select id="risk-type" aria-label="Tipo de riesgo" aria-invalid={fieldHasError("riskType")} aria-describedby={fieldHasError("riskType") ? "risk-type-help risk-type-error" : "risk-type-help"} className={formControlClass} value={form.riskType} onChange={(event) => setForm({ ...form, riskType: event.target.value })}><option value="">Seleccione un tipo</option>{Object.entries(RISK_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <FieldDescription id="risk-type-help">Obligatorio para niveles de riesgo alto o crítico.</FieldDescription>
        {fieldHasError("riskType") ? <FieldError id="risk-type-error">{formError}</FieldError> : null}
      </Field>
      <Field data-invalid={fieldHasError("suggestedIntervention")}>
        <FieldLabel htmlFor="suggested-intervention">Intervención sugerida</FieldLabel>
        <select id="suggested-intervention" aria-label="Intervención sugerida" aria-invalid={fieldHasError("suggestedIntervention")} aria-describedby={fieldHasError("suggestedIntervention") ? "suggested-intervention-help suggested-intervention-error" : "suggested-intervention-help"} className={formControlClass} value={form.suggestedIntervention} onChange={(event) => setForm({ ...form, suggestedIntervention: event.target.value })}><option value="">Sin sugerencia</option>{Object.entries(INTERVENTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <FieldDescription id="suggested-intervention-help">Registre la acción recomendada, si corresponde.</FieldDescription>
        {fieldHasError("suggestedIntervention") ? <FieldError id="suggested-intervention-error">{formError}</FieldError> : null}
      </Field>
      <FieldGroup className="gap-3">
        <Field className="flex-row items-start gap-2"><input id="street-closure" type="checkbox" className="mt-1 size-4 border border-[var(--color-border-strong)] accent-[var(--color-action)]" checked={form.requiresStreetClosure} onChange={(event) => setForm({ ...form, requiresStreetClosure: event.target.checked })} /><FieldLabel htmlFor="street-closure" className="font-normal">Requiere corte de calle</FieldLabel></Field>
        <Field className="flex-row items-start gap-2"><input id="public-works" type="checkbox" className="mt-1 size-4 border border-[var(--color-border-strong)] accent-[var(--color-action)]" checked={form.requiresPublicWorks} onChange={(event) => setForm({ ...form, requiresPublicWorks: event.target.checked })} /><FieldLabel htmlFor="public-works" className="font-normal">Requiere obras públicas</FieldLabel></Field>
      </FieldGroup>
      <Field data-invalid={fieldHasError("notes")}>
        <FieldLabel htmlFor="survey-notes">Observaciones</FieldLabel>
        <textarea id="survey-notes" aria-label="Observaciones" aria-invalid={fieldHasError("notes")} aria-describedby={fieldHasError("notes") ? "survey-notes-help survey-notes-error" : "survey-notes-help"} className={`${formControlClass} min-h-24`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <FieldDescription id="survey-notes-help">Describa hallazgos relevantes para el seguimiento operativo.</FieldDescription>
        {fieldHasError("notes") ? <FieldError id="survey-notes-error">{formError}</FieldError> : null}
      </Field>
    </FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" form="tree-survey-form" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar relevamiento"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>Detalle del relevamiento</DialogTitle><DialogDescription>Registro de lectura. Los relevamientos existentes no se pueden modificar ni eliminar.</DialogDescription></DialogHeader>{detailLoading ? <p role="status">Cargando detalle…</p> : null}{detailError ? <Alert variant="destructive"><AlertDescription>{detailError}</AlertDescription></Alert> : null}{detail && !detailError ? <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</dt><dd className="mt-0.5">{dateTimeLabel(detail.surveyedAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado sanitario</dt><dd className="mt-1"><HealthBadge status={detail.healthStatus} /></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nivel de riesgo</dt><dd className="mt-1"><RiskBadge level={detail.riskLevel} /></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de riesgo</dt><dd className="mt-0.5">{detail.riskType ? RISK_TYPE_LABELS[detail.riskType] : "No informado"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervención sugerida</dt><dd className="mt-0.5">{detail.suggestedIntervention ? INTERVENTION_LABELS[detail.suggestedIntervention] : "No sugerida"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere corte de calle</dt><dd className="mt-0.5">{detail.requiresStreetClosure ? "Sí" : "No"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere obras públicas</dt><dd className="mt-0.5">{detail.requiresPublicWorks ? "Sí" : "No"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</dt><dd className="mt-0.5 whitespace-pre-wrap">{detail.notes ?? "Sin observaciones registradas."}</dd></div></dl> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setDetail(null)}>Cerrar detalle</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
