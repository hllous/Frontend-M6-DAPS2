"use client";
import { errorMessage } from "@/lib/error-message";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleX, Clock3, Eye, Info, Plus, RefreshCw, Send, ShieldAlert, UserRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { CreateStreetClosureRequestDialog } from "@/components/services/create-street-closure-request-dialog";
import Link from "next/link";
import { servicesAdapter, type CreateServiceInput, type Service } from "@/lib/services";
import { resolveServiceType, TREE_PRUNING_SERVICE_TYPE_RULE } from "@/lib/service-types";
import { treeInterventionCreateInputSchema, treeInterventionsAdapter, TreeInterventionRequestError, type TreeIntervention, type TreeInterventionCreateInput, type TreeInterventionDetail, type TreeInterventionPriority, type TreeInterventionStatus, type TreeInterventionType, type TreeInterventionQuery } from "@/lib/tree-interventions";
import { crewsAdapter, type Crew } from "@/lib/crews";
import { vehiclesAdapter, type Vehicle } from "@/lib/vehicles";
import { todayInArgentina } from "@/lib/argentina-date";
import { serviceSourceHref } from "@/lib/referrals";
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
const PRIORITY_BADGE_VARIANTS = { LOW: "secondary", MEDIUM: "info", HIGH: "warning", CRITICAL: "danger" } as const;
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

type PendingServiceLink = { id: string; title: string | null };
type ServiceLookupStatus = "idle" | "loading" | "ready" | "error";

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
  initialPriority?: keyof typeof PRIORITY_LABELS;
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
    priority: props.initialPriority ?? (props.initialType === "REMOVAL" ? "CRITICAL" : "MEDIUM"),
    justification: props.initialJustification ?? "",
  };
}

function treeName(tree: Tree) {
  return `${tree.surveyCode} · ${tree.species ?? "Especie no registrada"}`;
}

function dateTimeLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value)) : "No registrada";
}

const emptySchedule = () => ({ scheduledDate: todayInArgentina(), windowFrom: "08:00", windowTo: "12:00", crewId: "", vehicleId: "" });
type ScheduleField = "scheduledDate" | "windowFrom" | "windowTo";
const SCHEDULE_REQUIRED_ERROR = "Seleccione una fecha y complete ambas horas para programar el servicio.";
const SCHEDULE_FIELD_ERRORS: Record<ScheduleField, string> = {
  scheduledDate: "Seleccione una fecha programada.",
  windowFrom: "Seleccione una hora de inicio.",
  windowTo: "Seleccione una hora de finalización.",
};
const SERVICE_LOOKUP_FAILURE = "No se pudo verificar si ya existe un servicio para esta intervención. Reintente.";
const SERVICE_LOOKUP_PAGE_LIMIT = 20;

// El servicio creado pero sin vincular sobrevive a una recarga: se guarda por intervención.
const unsyncedKey = (interventionId: string) => `tree-intervention-unsynced-service:${interventionId}`;
function readUnsynced(interventionId: string): string | null {
  try { return window.localStorage.getItem(unsyncedKey(interventionId)); } catch { return null; }
}
function writeUnsynced(interventionId: string, serviceId: string | null) {
  try { if (serviceId) window.localStorage.setItem(unsyncedKey(interventionId), serviceId); else window.localStorage.removeItem(unsyncedKey(interventionId)); } catch { /* sin storage: queda sólo en memoria */ }
}

function treeTargetRef(trees: Tree[], treeIds: string[]) {
  return (trees.length ? trees : treeIds.map((id) => ({ id, surveyCode: id, species: "Árbol", address: null } as Tree)))
    .map((tree) => treeName(tree))
    .join("; ");
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
      setFormError(errorMessage(caught, "No se pudo crear la solicitud de intervención."));
      setFormErrorField("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldHasError = (field: string) => formErrorField === field;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar intervención</DialogTitle>
          <DialogDescription>Registre qué intervención requiere uno o más árboles. La solicitud comenzará en estado solicitada.</DialogDescription>
        </DialogHeader>
        {formError && fieldHasError("form") ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
        <form id="tree-intervention-form" className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void submit(event)} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={fieldHasError("interventionType")}>
              <FieldLabel htmlFor="intervention-type">Tipo de intervención <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <Select items={TREE_INTERVENTION_LABELS} value={form.interventionType || null} onValueChange={(value) => setForm({ ...form, interventionType: String(value ?? "") as RequestForm["interventionType"] })}>
              <SelectTrigger id="intervention-type" aria-label="Tipo de intervención" aria-required="true" aria-invalid={fieldHasError("interventionType")} aria-describedby={fieldHasError("interventionType") ? "intervention-type-error" : undefined}><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                <SelectContent><SelectGroup>{Object.entries(TREE_INTERVENTION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              {fieldHasError("interventionType") ? <FieldError id="intervention-type-error">{formError}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldHasError("treeIds")}>
              <FieldLabel htmlFor="intervention-trees">Árboles a intervenir <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <Select
                items={Object.fromEntries(props.trees.map((tree) => [tree.id, `${treeName(tree)} · ${tree.address ?? "Sin dirección"}`]))}
                multiple
                value={form.treeIds}
                onValueChange={(value) => {
                  const treeIds = Array.isArray(value) ? value.map(String) : [];
                  const firstSelectedTreeId = treeIds[0];
                  setForm((current) => ({ ...current, treeIds, address: current.address || props.trees.find((tree) => tree.id === firstSelectedTreeId)?.address || "" }));
                }}
              >
                <SelectTrigger id="intervention-trees" aria-label="Árboles a intervenir" aria-required="true" aria-invalid={fieldHasError("treeIds")} aria-describedby={fieldHasError("treeIds") ? "intervention-trees-help intervention-trees-error" : "intervention-trees-help"}>
                  <SelectValue placeholder="Seleccione uno o más árboles" />
                </SelectTrigger>
                <SelectContent><SelectGroup>{props.trees.map((tree) => <SelectItem key={tree.id} value={tree.id}>{treeName(tree)} · {tree.address ?? "Sin dirección"}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <FieldDescription className="text-xs leading-4" id="intervention-trees-help">Seleccione uno o más ejemplares; puede elegir varios árboles.</FieldDescription>
              {fieldHasError("treeIds") ? <FieldError id="intervention-trees-error">{formError}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldHasError("address")}>
              <FieldLabel htmlFor="intervention-address">Dirección <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <Input id="intervention-address" value={form.address} aria-invalid={fieldHasError("address")} aria-describedby={fieldHasError("address") ? "intervention-address-error" : undefined} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
              {fieldHasError("address") ? <FieldError id="intervention-address-error">{formError}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="intervention-priority">Prioridad <span aria-hidden="true">(obligatorio)</span></FieldLabel>
              <Select items={PRIORITY_LABELS} value={form.priority} onValueChange={(value) => setForm({ ...form, priority: String(value) as RequestForm["priority"] })}>
                <SelectTrigger id="intervention-priority" aria-label="Prioridad" aria-required="true"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal" className="items-center">
              <Checkbox id="intervention-street-closure" checked={form.requiresStreetClosure} onCheckedChange={(checked) => setForm({ ...form, requiresStreetClosure: Boolean(checked) })} />
              <FieldLabel htmlFor="intervention-street-closure" className="font-normal">Requiere corte de calle</FieldLabel>
            </Field>
            <Field data-invalid={fieldHasError("justification")}>
              <FieldLabel htmlFor="intervention-justification">Justificación{form.interventionType === "REMOVAL" ? <span> (obligatorio para extracción)</span> : null}</FieldLabel>
              <Textarea id="intervention-justification" value={form.justification} required={form.interventionType === "REMOVAL"} aria-invalid={fieldHasError("justification")} aria-describedby={fieldHasError("justification") ? "intervention-justification-help intervention-justification-error" : "intervention-justification-help"} onChange={(event) => setForm({ ...form, justification: event.target.value })} />
              <FieldDescription className="text-xs leading-4" id="intervention-justification-help">Es obligatoria para solicitar una extracción. No se adjuntan evidencias en esta etapa.</FieldDescription>
              {fieldHasError("justification") ? <FieldError id="intervention-justification-error">{formError}</FieldError> : null}
            </Field>
          </FieldGroup>
        <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center">
          <Button type="button" variant="outline" className="w-full min-w-0 whitespace-normal sm:w-auto" onClick={() => props.onOpenChange(false)} disabled={isSubmitting}>Cerrar formulario</Button>
          <Button type="submit" className="w-full min-w-0 whitespace-normal sm:w-auto" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Creando solicitud…" : "Crear solicitud de intervención"}</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TreeInterventionsPanel({ scenario }: { scenario: OperationalScenario }) {
  const canRequest = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("treeIntervention:request");
  const canAuthorize = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("treeIntervention:authorize");
  const canSchedule = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("service:schedule");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [trees, setTrees] = useState<Tree[]>([]);
  const [interventionType, setInterventionType] = useState<TreeInterventionType | "">("");
  const [status, setStatus] = useState<TreeInterventionStatus | "">("");
  const [priority, setPriority] = useState<TreeInterventionPriority | "">("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPrefill, setRequestPrefill] = useState<Pick<RequestDialogProps, "initialTreeIds" | "initialType" | "initialAddress" | "initialRequiresStreetClosure" | "initialPriority" | "initialJustification">>({});
  const [detail, setDetail] = useState<TreeInterventionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"submit" | "authorize" | "reject" | "schedule" | "retry-link" | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [scheduleFieldErrors, setScheduleFieldErrors] = useState<ScheduleField[]>([]);
  const [resources, setResources] = useState<{ crews: Crew[]; vehicles: Vehicle[] } | "error" | null>(null);
  const [unsyncedService, setUnsyncedService] = useState<PendingServiceLink | null>(null);
  const [serviceLookupStatus, setServiceLookupStatus] = useState<ServiceLookupStatus>("idle");
  const serviceLookupRequest = useRef(0);
  const [streetClosureIntervention, setStreetClosureIntervention] = useState<TreeInterventionDetail | null>(null);
  const detailOpenedFromUrl = useRef(false);
  const [initialDetailId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("detail");
  });
  const [notice, setNotice] = useState<string | null>(null);
  const query = useMemo<TreeInterventionQuery>(() => ({ interventionType: interventionType || undefined, status: status || undefined, priority: priority || undefined, page, pageSize: 10 }), [interventionType, page, priority, status]);

  useEffect(() => {
    let current = true;
    void import("@/lib/trees").then(({ treesAdapter }) => treesAdapter.list({ active: true, pageSize: 100 })).then((loaded) => { if (current) setTrees(loaded.trees); }).catch(() => undefined);
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    void treeInterventionsAdapter.list(query).then((loaded) => { if (current) setState({ status: "ready", page: loaded }); }).catch((caught) => { if (current) setState({ status: "error", message: errorMessage(caught, "No se pudieron cargar las intervenciones.") }); });
    return () => { current = false; };
  }, [query, requestVersion]);

  useEffect(() => {
    if (!scheduleOpen) return;
    let current = true;
    void Promise.all([crewsAdapter.list({ active: true, pageSize: 100 }), vehiclesAdapter.list({ active: true, pageSize: 100 })])
      .then(([crewsPage, vehiclesPage]) => { if (current) setResources({ crews: crewsPage.crews, vehicles: vehiclesPage.vehicles }); })
      .catch(() => { if (current) setResources("error"); });
    return () => { current = false; };
  }, [scheduleOpen]);

  const openRequest = (prefill: Pick<RequestDialogProps, "initialTreeIds" | "initialType" | "initialAddress" | "initialRequiresStreetClosure" | "initialPriority" | "initialJustification"> = {}) => { setRequestPrefill(prefill); setRequestOpen(true); setNotice(null); };
  const verifyExistingService = useCallback(async (intervention: TreeInterventionDetail) => {
    const requestId = ++serviceLookupRequest.current;
    setServiceLookupStatus("loading");

    try {
      const targetTreeId = intervention.treeIds[0];
      if (!targetTreeId) {
        setServiceLookupStatus("ready");
        return;
      }

      let page = 1;
      let totalPages = 1;
      let total = 0;
      let loaded = 0;
      do {
        const result = await servicesAdapter.list({ page, pageSize: 100 });
        if (requestId !== serviceLookupRequest.current) return;
        if (result.page !== page) throw new Error(SERVICE_LOOKUP_FAILURE);

        const matchingService = result.services.find((service: Service) =>
          service.targetType === "TREE"
          && service.targetId === targetTreeId
          && service.notes === `Intervención de arbolado ${intervention.id}.`,
        );
        if (matchingService) {
          writeUnsynced(intervention.id, matchingService.id);
          setUnsyncedService({ id: matchingService.id, title: matchingService.title });
          setServiceLookupStatus("ready");
          return;
        }

        loaded += result.services.length;
        total = result.total;
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages && page <= SERVICE_LOOKUP_PAGE_LIMIT);

      if (totalPages >= SERVICE_LOOKUP_PAGE_LIMIT || loaded < total) {
        throw new Error(SERVICE_LOOKUP_FAILURE);
      }
      setServiceLookupStatus("ready");
    } catch {
      if (requestId === serviceLookupRequest.current) setServiceLookupStatus("error");
    }
  }, []);

  const openDetail = useCallback(async (intervention: TreeIntervention) => {
    serviceLookupRequest.current += 1;
    setDetail(intervention); setDetailError(null); setActionError(null); setScheduleOpen(false); setUnsyncedService(null); setServiceLookupStatus("idle"); setDetailLoading(true);
    try {
      const loaded = await treeInterventionsAdapter.get(intervention.id);
      setDetail(loaded);
      const pending = loaded.serviceId ? null : readUnsynced(loaded.id);
      if (loaded.serviceId) writeUnsynced(loaded.id, null);
      if (pending && !loaded.serviceId) setUnsyncedService({ id: pending, title: null });
      if (loaded.status === "AUTHORIZED" && !loaded.serviceId) {
        void verifyExistingService(loaded);
      } else {
        setServiceLookupStatus("ready");
      }
    } catch (caught) { setDetailError(errorMessage(caught, "No se pudo cargar el detalle de la intervención.")); } finally { setDetailLoading(false); }
  }, [verifyExistingService]);

  useEffect(() => {
    if (state.status !== "ready" || !initialDetailId || detail || detailOpenedFromUrl.current) return;
    const intervention = state.page.interventions.find((item) => item.id === initialDetailId);
    if (!intervention) return;
    detailOpenedFromUrl.current = true;
    void Promise.resolve().then(() => openDetail(intervention));
  }, [state, initialDetailId, detail, openDetail]);
  const treeById = (id: string) => trees.find((tree) => tree.id === id);
  const runAction = async (action: "submit" | "authorize" | "reject" | "schedule", input?: ReturnType<typeof emptySchedule>) => {
    if (!detail) return;
    setActionError(null); setActiveAction(action);
    try {
      if (action === "schedule") {
        const treesForService = detail.trees ?? detail.treeIds.map(treeById).filter((tree): tree is Tree => Boolean(tree));
        const firstTree = treesForService[0];
        if (!firstTree || !input) {
          setActionError("No se pudo determinar la zona operativa del árbol seleccionado.");
          return;
        }
        const serviceType = await resolveServiceType(TREE_PRUNING_SERVICE_TYPE_RULE);
        const serviceInput: CreateServiceInput = {
          title: `${TREE_INTERVENTION_LABELS[detail.interventionType]} · ${detail.address}`,
          serviceTypeId: serviceType.id,
          origin: "MANUAL",
          zoneIds: [firstTree.zoneId],
          targetType: "TREE",
          targetId: firstTree.id,
          targetRef: treeTargetRef(treesForService, detail.treeIds),
          scheduledDate: input.scheduledDate,
          crewId: input.crewId || undefined,
          vehicleId: input.vehicleId || undefined,
          timeWindow: { start: input.windowFrom, end: input.windowTo },
          notes: `Intervención de arbolado ${detail.id}.`,
        };
        const createdService = await servicesAdapter.create(serviceInput);
        try {
          const { detail: updated, linkedTo } = await linkService(detail.id, createdService.id);
          setDetail(updated);
          setUnsyncedService(null);
          setScheduleOpen(false);
          setRequestVersion((version) => version + 1);
          setNotice(linkNotice(createdService.id, linkedTo));
        } catch (caught) {
          writeUnsynced(detail.id, createdService.id);
          setUnsyncedService({ id: createdService.id, title: createdService.title });
          setScheduleOpen(false);
          setActionError(errorMessage(caught, "No se pudo vincular el servicio."));
        }
        return;
      }

      const updated = action === "submit"
        ? await treeInterventionsAdapter.submitForAuthorization(detail.id)
        : action === "authorize"
          ? await treeInterventionsAdapter.authorize(detail.id, { authorizedByUserId: scenario.actor.userId })
          : await treeInterventionsAdapter.reject(detail.id);
      setDetail(updated);
      setScheduleOpen(false);
      setRequestVersion((version) => version + 1);
      setNotice(action === "submit" ? "La extracción fue enviada a autorización." : action === "authorize" ? "La intervención fue autorizada." : "La extracción fue rechazada. Puede crear una nueva solicitud con los mismos datos.");
      if (action === "reject") setRejectConfirmOpen(false);
    } catch (caught) {
      setActionError(errorMessage(caught, "No se pudo actualizar la intervención."));
    } finally { setActiveAction(null); }
  };

  // Tras un 409 el vínculo puede existir igual (reintento duplicado, otra pestaña): se relee antes de dar error.
  const linkService = async (interventionId: string, serviceId: string) => {
    try {
      return { detail: await treeInterventionsAdapter.assignService(interventionId, { serviceId }), linkedTo: serviceId };
    } catch (caught) {
      if (!(caught instanceof TreeInterventionRequestError && caught.status === 409)) throw caught;
      const current = await treeInterventionsAdapter.get(interventionId).catch(() => null);
      if (!current?.serviceId) throw caught;
      return { detail: current, linkedTo: current.serviceId };
    }
  };
  const linkNotice = (serviceId: string, linkedTo: string) => linkedTo === serviceId
    ? `Intervención programada. Servicio ${serviceId} vinculado correctamente.`
    : `La intervención ya estaba vinculada al servicio ${linkedTo}. El servicio ${serviceId} quedó creado sin vincular: cancélelo desde Servicios.`;

  const retryServiceLink = async () => {
    if (!detail || !unsyncedService) return;
    setActionError(null);
    setActiveAction("retry-link");
    try {
      const { detail: updated, linkedTo } = await linkService(detail.id, unsyncedService.id);
      setDetail(updated);
      writeUnsynced(detail.id, null);
      setUnsyncedService(null);
      setRequestVersion((version) => version + 1);
      setNotice(linkNotice(unsyncedService.id, linkedTo));
    } catch (caught) {
      setActionError(errorMessage(caught, "No se pudo vincular el servicio."));
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <section aria-labelledby="tree-interventions-title" className="flex flex-col gap-5">
      <CatalogPageHeader
        title="Intervenciones de arbolado"
        titleId="tree-interventions-title"
        description="Solicitudes de poda, extracción, plantación o tratamiento con su estado y decisión registrada."
        actions={canRequest ? <Button type="button" onClick={() => openRequest()}><Plus data-icon="inline-start" aria-hidden />Solicitar intervención</Button> : null}
      />
      {!canRequest ? <Alert><Info data-icon="inline-start" aria-hidden /><AlertDescription>Esta sesión puede consultar las solicitudes, pero no crear intervenciones de arbolado.</AlertDescription></Alert> : null}
      {notice ? <Alert><CheckCircle2 data-icon="inline-start" aria-hidden /><AlertDescription>{notice}</AlertDescription></Alert> : null}
      <FieldGroup className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="intervention-type-filter">Tipo de intervención</FieldLabel>
          <Select items={{ __all__: "Todos", ...TREE_INTERVENTION_LABELS }} value={interventionType || "__all__"} onValueChange={(value) => { setInterventionType(value === "__all__" ? "" : String(value) as TreeInterventionType); setPage(1); }}>
            <SelectTrigger id="intervention-type-filter" aria-label="Filtrar por tipo de intervención"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="__all__">Todos</SelectItem>{Object.entries(TREE_INTERVENTION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="intervention-status-filter">Estado de la solicitud</FieldLabel>
          <Select items={{ __all__: "Todos", ...TREE_INTERVENTION_STATUS_LABELS }} value={status || "__all__"} onValueChange={(value) => { setStatus(value === "__all__" ? "" : String(value) as TreeInterventionStatus); setPage(1); }}>
            <SelectTrigger id="intervention-status-filter" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="__all__">Todos</SelectItem>{Object.entries(TREE_INTERVENTION_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="intervention-priority-filter">Prioridad</FieldLabel>
          <Select items={{ __all__: "Todas", ...PRIORITY_LABELS }} value={priority || "__all__"} onValueChange={(value) => { setPriority(value === "__all__" ? "" : String(value) as TreeInterventionPriority); setPage(1); }}>
            <SelectTrigger id="intervention-priority-filter" aria-label="Filtrar por prioridad"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="__all__">Todas</SelectItem>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      {state.status === "loading" ? <div role="status" aria-label="Cargando intervenciones" className="flex flex-col gap-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div> : null}
      {state.status === "error" ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{state.message}</span><Button type="button" variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></AlertDescription></Alert> : null}
      {state.status === "ready" && state.page.interventions.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin solicitudes de intervención</EmptyTitle><EmptyDescription>{interventionType || status || priority ? "No hay solicitudes para los filtros seleccionados. Quite uno o más filtros para consultar el registro completo." : "Todavía no hay solicitudes de intervención registradas."}</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.page.interventions.length > 0 ? <>
        <p className="text-sm text-muted-foreground" aria-live="polite">{state.page.total} {state.page.total === 1 ? "solicitud" : "solicitudes"}</p>
        <div className="grid gap-3" aria-label="Solicitudes de intervención">
          {state.page.interventions.map((intervention) => {
            // La solicitud no tiene código propio: se la identifica por los árboles que toca.
            const linked = intervention.treeIds.map(treeById).filter((tree): tree is Tree => Boolean(tree));
            const reference = linked.length ? linked.map((tree) => tree.surveyCode).join(", ") : intervention.createdAt ? "Solicitada el " + dateTimeLabel(intervention.createdAt) : null;
            const address = intervention.address ?? linked[0]?.address ?? "Sin dirección registrada";
            const treeCount = intervention.treeIds.length + " " + (intervention.treeIds.length === 1 ? "ejemplar" : "ejemplares");
            const priorityLabel = intervention.priority === null ? "No indicada" : PRIORITY_LABELS[intervention.priority];
            const priorityVariant = intervention.priority === null ? "secondary" : PRIORITY_BADGE_VARIANTS[intervention.priority];

            return (
              <Card
                key={intervention.id}
                role="article"
                aria-label={[TREE_INTERVENTION_LABELS[intervention.interventionType], reference].filter(Boolean).join(" · ")}
                size="sm"
                className="gap-2 py-2"
              >
                <CardHeader className="flex flex-col items-start gap-1 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-x-3">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {reference ? <CardDescription className="text-xs">{reference}</CardDescription> : null}
                    <CardTitle className="text-sm leading-5 font-semibold">{TREE_INTERVENTION_LABELS[intervention.interventionType]}</CardTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Estado</span>
                    <InterventionStatusBadge status={intervention.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <dl className="grid min-w-[17rem] flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(6rem,0.7fr)_minmax(7rem,0.8fr)_minmax(11rem,1.5fr)]">
                    <div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:items-start sm:gap-0">
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground">Árboles</dt>
                      <dd className="font-medium">{treeCount}</dd>
                    </div>
                    <div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:items-start sm:gap-0">
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground">Prioridad</dt>
                      <dd><Badge variant={priorityVariant}>{priorityLabel}</Badge></dd>
                    </div>
                    <div className="col-span-2 flex min-w-0 items-baseline gap-1.5 sm:col-span-1 sm:flex-col sm:items-start sm:gap-0">
                      <dt className="shrink-0 text-xs font-medium text-muted-foreground">Dirección</dt>
                      <dd className="min-w-0 break-words font-medium">{address}</dd>
                    </div>
                  </dl>
                  <Button type="button" size="sm" variant="outline" className="ml-auto h-10 max-[760px]:h-12" onClick={() => void openDetail(intervention)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3" aria-label="Paginación de intervenciones"><span className="text-sm text-muted-foreground">Página {state.page.page} de {state.page.totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={state.page.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft data-icon="inline-start" aria-hidden />Anterior</Button><Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={state.page.page >= state.page.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight data-icon="inline-end" aria-hidden /></Button></div></div>
      </> : null}

      {canRequest ? <TreeInterventionRequestDialog key={`${requestOpen}-${JSON.stringify(requestPrefill)}`} open={requestOpen} onOpenChange={setRequestOpen} trees={trees} {...requestPrefill} onCreated={() => { setNotice("Solicitud de intervención creada. Estado inicial: solicitada."); setPage(1); setRequestVersion((version) => version + 1); }} /> : null}
      {canRequest && streetClosureIntervention ? (
        <CreateStreetClosureRequestDialog
          key={streetClosureIntervention.id}
          open
          service={null}
          treeIntervention={streetClosureIntervention}
          onOpenChange={(open) => {
            if (!open) setStreetClosureIntervention(null);
          }}
          onCreated={() => {
            setNotice("Solicitud de corte creada y pendiente de respuesta de M7.");
            setStreetClosureIntervention(null);
            setRequestVersion((version) => version + 1);
          }}
        />
      ) : null}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) { serviceLookupRequest.current += 1; setDetail(null); setUnsyncedService(null); setServiceLookupStatus("idle"); setRejectConfirmOpen(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle de la intervención</DialogTitle><DialogDescription>Consulte los datos de la solicitud y, según su estado y permisos, registre una decisión de autorización.</DialogDescription></DialogHeader>
          {detailLoading ? <Alert role="status"><AlertDescription>Cargando detalle…</AlertDescription></Alert> : null}
          {detailError ? <Alert variant="destructive"><AlertDescription>{detailError}</AlertDescription></Alert> : null}
          {detail && !detailLoading && !detailError ? <div className="flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{TREE_INTERVENTION_LABELS[detail.interventionType]}</p><InterventionStatusBadge status={detail.status} /></div><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</dt><dd className="mt-0.5">{detail.priority === null ? "—" : <Badge variant={PRIORITY_BADGE_VARIANTS[detail.priority]}>{PRIORITY_LABELS[detail.priority]}</Badge>}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha de solicitud</dt><dd className="mt-0.5 tabular-nums">{dateTimeLabel(detail.createdAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</dt><dd className="mt-0.5">{detail.address ?? "Sin dirección registrada"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Corte de calle</dt><dd className="mt-0.5">{detail.requiresStreetClosure ? "Sí" : "No"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Árboles vinculados</dt><dd className="mt-1"><ItemGroup className="gap-2">{(detail.trees ?? detail.treeIds.map((id) => treeById(id))).map((tree, index) => <Item key={tree?.id ?? detail.treeIds[index]} variant="muted" className="rounded-xl border-border bg-muted py-2">{tree ? <><span className="font-medium">{treeName(tree)}</span><span className="block text-xs text-muted-foreground">{tree.address ?? "Sin dirección registrada"}</span></> : detail.treeIds[index]}</Item>)}</ItemGroup></dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificación</dt><dd className="mt-0.5 whitespace-pre-wrap">{detail.justification ?? "Sin justificación registrada."}</dd></div></dl></div> : null}
          {detail && !detailLoading && !detailError ? (
            <>
              {actionError ? <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert> : null}
              {unsyncedService ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>El Servicio {unsyncedService.id}{unsyncedService.title ? ` — ${unsyncedService.title}` : ""} fue creado, pero quedó sin vincular. La vinculación quedó pendiente. Complétela antes de salir de esta página.</span><Button type="button" variant="outline" disabled={activeAction !== null} aria-busy={activeAction === "retry-link"} onClick={() => void retryServiceLink()}><RefreshCw data-icon="inline-start" aria-hidden />{activeAction === "retry-link" ? "Reintentando vinculación…" : "Reintentar vinculación"}</Button></AlertDescription></Alert> : null}
              {canSchedule && detail.status === "AUTHORIZED" && serviceLookupStatus === "loading" ? <Alert role="status"><AlertDescription>Verificando si ya existe un servicio para esta intervención…</AlertDescription></Alert> : null}
              {canSchedule && detail.status === "AUTHORIZED" && !detail.serviceId && serviceLookupStatus === "error" ? <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{SERVICE_LOOKUP_FAILURE}</span><Button type="button" variant="outline" disabled={activeAction !== null} onClick={() => void verifyExistingService(detail)}>Reintentar</Button></AlertDescription></Alert> : null}
              <div className="flex flex-col gap-3">
                {detail.status === "AUTHORIZED" ? (
                  <dl aria-label="Registro de autorización" className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-sm sm:grid-cols-2">
                    <div><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><UserRound className="size-3.5" aria-hidden />Persona autorizante</dt><dd className="mt-1">{detail.authorizedByUserId ?? "No registrada"}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha de autorización</dt><dd className="mt-1 tabular-nums">{dateTimeLabel(detail.authorizedAt)}</dd></div>
                  </dl>
                ) : null}
                {canSchedule && detail.status === "AUTHORIZED" && detail.serviceId ? <Alert><CalendarClock data-icon="inline-start" aria-hidden /><AlertDescription>Servicio vinculado: <Link className="font-mono font-semibold underline" href={serviceSourceHref(detail.serviceId)}>{detail.serviceId}</Link>.</AlertDescription></Alert> : null}
                {canSchedule && detail.status === "AUTHORIZED" && !detail.serviceId && !unsyncedService && serviceLookupStatus === "ready" && scheduleOpen ? (
                  <form
                    aria-label="Programar servicio para la intervención"
                    className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const missing: ScheduleField[] = [];
                      if (!scheduleForm.scheduledDate) missing.push("scheduledDate");
                      if (!scheduleForm.windowFrom) missing.push("windowFrom");
                      if (!scheduleForm.windowTo) missing.push("windowTo");
                      setScheduleFieldErrors(missing);
                      if (missing.length > 0) {
                        setActionError(SCHEDULE_REQUIRED_ERROR);
                        return;
                      }
                      setActionError(null);
                      void runAction("schedule", scheduleForm);
                    }}
                  >
                    <p className="text-sm font-semibold">Servicio puntual de ejecución</p>
                    <FieldGroup className="grid gap-3 sm:grid-cols-3">
                      <Field data-invalid={scheduleFieldErrors.includes("scheduledDate")}>
                        <FieldLabel htmlFor="tree-service-date">Fecha programada <span>(obligatorio)</span></FieldLabel>
                        <DatePicker id="tree-service-date" value={scheduleForm.scheduledDate} invalid={scheduleFieldErrors.includes("scheduledDate")} aria-describedby={scheduleFieldErrors.includes("scheduledDate") ? "tree-service-date-error" : undefined} onChange={(scheduledDate) => { setScheduleForm({ ...scheduleForm, scheduledDate }); setScheduleFieldErrors((errors) => errors.filter((field) => field !== "scheduledDate")); setActionError((error) => error === SCHEDULE_REQUIRED_ERROR ? null : error); }} />
                        {scheduleFieldErrors.includes("scheduledDate") ? <FieldError id="tree-service-date-error">{SCHEDULE_FIELD_ERRORS.scheduledDate}</FieldError> : null}
                      </Field>
                      <Field data-invalid={scheduleFieldErrors.includes("windowFrom")}>
                        <FieldLabel id="tree-service-from-label" htmlFor="tree-service-from">Desde <span aria-hidden="true">(obligatorio)</span></FieldLabel>
                        <TimePicker id="tree-service-from" aria-labelledby="tree-service-from-label" aria-label="Desde" required invalid={scheduleFieldErrors.includes("windowFrom")} aria-describedby={scheduleFieldErrors.includes("windowFrom") ? "tree-service-from-error" : undefined} value={scheduleForm.windowFrom} onChange={(windowFrom) => { setScheduleForm({ ...scheduleForm, windowFrom }); setScheduleFieldErrors((errors) => errors.filter((field) => field !== "windowFrom")); setActionError((error) => error === SCHEDULE_REQUIRED_ERROR ? null : error); }} />
                        {scheduleFieldErrors.includes("windowFrom") ? <FieldError id="tree-service-from-error">{SCHEDULE_FIELD_ERRORS.windowFrom}</FieldError> : null}
                      </Field>
                      <Field data-invalid={scheduleFieldErrors.includes("windowTo")}>
                        <FieldLabel id="tree-service-to-label" htmlFor="tree-service-to">Hasta <span aria-hidden="true">(obligatorio)</span></FieldLabel>
                        <TimePicker id="tree-service-to" aria-labelledby="tree-service-to-label" aria-label="Hasta" required invalid={scheduleFieldErrors.includes("windowTo")} aria-describedby={scheduleFieldErrors.includes("windowTo") ? "tree-service-to-error" : undefined} value={scheduleForm.windowTo} onChange={(windowTo) => { setScheduleForm({ ...scheduleForm, windowTo }); setScheduleFieldErrors((errors) => errors.filter((field) => field !== "windowTo")); setActionError((error) => error === SCHEDULE_REQUIRED_ERROR ? null : error); }} />
                        {scheduleFieldErrors.includes("windowTo") ? <FieldError id="tree-service-to-error">{SCHEDULE_FIELD_ERRORS.windowTo}</FieldError> : null}
                      </Field>
                    </FieldGroup>
                    <FieldGroup className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="tree-service-crew">Cuadrilla (opcional)</FieldLabel>
                        <Select items={{ __none__: "Sin asignar", ...Object.fromEntries(resources && resources !== "error" ? resources.crews.map((crew) => [crew.id, crew.name]) : []) }} value={scheduleForm.crewId || "__none__"} disabled={!resources || resources === "error"} onValueChange={(value) => setScheduleForm({ ...scheduleForm, crewId: value === "__none__" ? "" : String(value ?? "") })}>
                          <SelectTrigger id="tree-service-crew" aria-label="Cuadrilla (opcional)"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectGroup><SelectItem value="__none__">Sin asignar</SelectItem>{resources && resources !== "error" ? resources.crews.map((crew) => <SelectItem key={crew.id} value={crew.id}>{crew.name}</SelectItem>) : null}</SelectGroup></SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="tree-service-vehicle">Vehículo (opcional)</FieldLabel>
                        <Select items={{ __none__: "Sin asignar", ...Object.fromEntries(resources && resources !== "error" ? resources.vehicles.map((vehicle) => [vehicle.id, vehicle.plate]) : []) }} value={scheduleForm.vehicleId || "__none__"} disabled={!resources || resources === "error"} onValueChange={(value) => setScheduleForm({ ...scheduleForm, vehicleId: value === "__none__" ? "" : String(value ?? "") })}>
                          <SelectTrigger id="tree-service-vehicle" aria-label="Vehículo (opcional)"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectGroup><SelectItem value="__none__">Sin asignar</SelectItem>{resources && resources !== "error" ? resources.vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.plate}</SelectItem>) : null}</SelectGroup></SelectContent>
                        </Select>
                        {resources === "error" ? <FieldDescription className="text-xs leading-4">No se pudieron cargar cuadrillas y vehículos; puede asignarlos después desde Servicios.</FieldDescription> : null}
                      </Field>
                    </FieldGroup>
                    <p className="text-xs text-muted-foreground">{"Se crear\u00e1 un servicio de punto, con el primer \u00e1rbol como objetivo t\u00e9cnico y el listado completo de \u00e1rboles como contexto relacionado."}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" disabled={activeAction !== null} onClick={() => setScheduleOpen(false)}>{"Cancelar programaci\u00f3n"}</Button>
                      <Button type="submit" disabled={activeAction !== null} aria-busy={activeAction === "schedule"}><CalendarClock data-icon="inline-start" aria-hidden />{activeAction === "schedule" ? "Programando servicio\u2026" : "Programar servicio de intervenci\u00f3n"}</Button>
                    </div>
                  </form>
                ) : null}
                {detail.status === "REJECTED" && canRequest ? <p className="text-sm text-muted-foreground">Esta decisión es terminal. Puede registrar una nueva solicitud con los datos de esta extracción.</p> : null}
              </div>
            </>
          ) : null}
          <DialogFooter className="mt-2 flex-col-reverse items-stretch sm:flex-row sm:items-center">
            <Button type="button" variant="outline" className="w-full min-w-0 whitespace-normal sm:w-auto" onClick={() => setDetail(null)}>Cerrar detalle</Button>
            {detail && !detailLoading && !detailError ? <>
              {canRequest && detail.status === "AUTHORIZED" ? <Button type="button" variant="outline" className="w-full min-w-0 whitespace-normal sm:w-auto" onClick={() => { setDetail(null); setStreetClosureIntervention(detail); }}>Solicitar corte de calle</Button> : null}
              {canSchedule && detail.status === "AUTHORIZED" && !detail.serviceId && !unsyncedService && serviceLookupStatus === "ready" && !scheduleOpen ? <Button type="button" className="w-full min-w-0 whitespace-normal sm:w-auto" disabled={activeAction !== null} onClick={() => { setScheduleForm(emptySchedule()); setScheduleFieldErrors([]); setActionError(null); setScheduleOpen(true); }}><CalendarClock data-icon="inline-start" aria-hidden />Programar servicio</Button> : null}
              {detail.interventionType === "REMOVAL" && detail.status === "REQUESTED" && canRequest ? <Button type="button" className="w-full min-w-0 whitespace-normal sm:w-auto" disabled={activeAction !== null} aria-busy={activeAction === "submit"} onClick={() => void runAction("submit")}><Send data-icon="inline-start" aria-hidden />{activeAction === "submit" ? "Enviando a autorización…" : "Enviar a autorización"}</Button> : null}
              {detail.status === "REJECTED" && canRequest ? <Button type="button" className="w-full min-w-0 whitespace-normal sm:w-auto" onClick={() => { setDetail(null); openRequest({ initialTreeIds: detail.treeIds, initialType: detail.interventionType, initialAddress: detail.address ?? undefined, initialRequiresStreetClosure: detail.requiresStreetClosure, initialPriority: detail.priority ?? undefined, initialJustification: detail.justification ?? "" }); }}>Crear nueva solicitud</Button> : null}
              {canAuthorize && ((detail.interventionType === "REMOVAL" && detail.status === "PENDING_AUTHORIZATION") || (detail.interventionType !== "REMOVAL" && detail.status === "REQUESTED")) ? <>
                {detail.interventionType === "REMOVAL" ? <Button type="button" variant="destructive" className="w-full min-w-0 whitespace-normal sm:w-auto" disabled={activeAction !== null} onClick={() => setRejectConfirmOpen(true)}><CircleX data-icon="inline-start" aria-hidden />Rechazar intervención</Button> : null}
                <Button type="button" className="w-full min-w-0 whitespace-normal sm:w-auto" disabled={activeAction !== null} aria-busy={activeAction === "authorize"} onClick={() => void runAction("authorize")}><CheckCircle2 data-icon="inline-start" aria-hidden />{activeAction === "authorize" ? "Autorizando intervención…" : "Autorizar intervención"}</Button>
              </> : null}
            </> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={rejectConfirmOpen} onOpenChange={(open) => { if (!activeAction) setRejectConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar rechazo</DialogTitle><DialogDescription>La extracción quedará rechazada y no podrá reabrirse desde esta solicitud.</DialogDescription></DialogHeader>
          {actionError ? <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert> : null}
          <DialogFooter><Button type="button" variant="outline" disabled={activeAction !== null} onClick={() => setRejectConfirmOpen(false)}>Conservar solicitud</Button><Button type="button" variant="destructive" disabled={activeAction !== null} aria-busy={activeAction === "reject"} onClick={() => void runAction("reject")}>{activeAction === "reject" ? "Rechazando intervención…" : "Confirmar rechazo de intervención"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
