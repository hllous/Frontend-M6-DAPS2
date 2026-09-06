"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
import { routesAdapter, type Route } from "@/lib/routes";
import { serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  serviceFrequenciesAdapter,
  serviceFrequencyShiftSchema,
  type ServiceFrequency,
  type ServiceFrequencyCreateInput,
  type ServiceFrequencyQuery,
  type ServiceFrequencyShift,
} from "@/lib/service-frequencies";

const weekdays = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 7, label: "Domingo", short: "Dom" },
] as const;

const shifts: Array<{ value: ServiceFrequencyShift; label: string }> = [
  { value: "MORNING", label: "Mañana" },
  { value: "AFTERNOON", label: "Tarde" },
  { value: "NIGHT", label: "Noche" },
];

const emptyCreateDraft: ServiceFrequencyCreateInput = {
  serviceTypeId: "",
  routeId: "",
  weekdays: [1],
  shift: "MORNING",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: null,
};

type LoadState = { status: "loading" } | { status: "ready"; items: ServiceFrequency[] } | { status: "error"; message: string };
type EditDraft = { item: ServiceFrequency; weekdays: number[]; shift: ServiceFrequencyShift; validFrom: string; validTo: string };

function formatDate(value: string | null) {
  if (!value) return "Sin fecha de cierre";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function shiftLabel(value: ServiceFrequencyShift) {
  return shifts.find((shift) => shift.value === value)?.label ?? value;
}

function weekdayLabel(value: number) {
  return weekdays.find((weekday) => weekday.value === value)?.short ?? String(value);
}

export function ServiceFrequenciesPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("serviceFrequency:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [shift, setShift] = useState<ServiceFrequencyShift | "">("");
  const [weekday, setWeekday] = useState("");
  const [validOn, setValidOn] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<ServiceFrequencyCreateInput>(emptyCreateDraft);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [closing, setClosing] = useState<ServiceFrequency | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const serviceTypeNames = useMemo(() => new Map(serviceTypes.map((item) => [item.id, item.name])), [serviceTypes]);
  const routeNames = useMemo(() => new Map(routes.map((item) => [item.id, item.name])), [routes]);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      serviceTypesAdapter.list({ active: true, mode: "ROUTE", pageSize: 100 }),
      routesAdapter.list({ active: true, pageSize: 100 }),
    ]).then(([serviceTypePage, routePage]) => {
      if (!isCurrent) return;
      setServiceTypes(serviceTypePage.serviceTypes.filter((item) => item.mode === "ROUTE"));
      setRoutes(routePage.routes);
    }).catch((error: unknown) => {
      if (isCurrent) setCatalogError(error instanceof Error ? error.message : "No se pudieron cargar los catálogos relacionados.");
    });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const query: ServiceFrequencyQuery = {
      serviceTypeId: serviceTypeId || undefined,
      routeId: routeId || undefined,
      shift: shift || undefined,
      weekday: weekday ? Number(weekday) : undefined,
      validOn: validOn || undefined,
    };
    serviceFrequenciesAdapter.list(query).then((result) => {
      if (isCurrent) setState({ status: "ready", items: result.serviceFrequencies });
    }).catch((error: unknown) => {
      if (isCurrent) setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar las frecuencias." });
    });
    return () => { isCurrent = false; };
  }, [requestVersion, routeId, serviceTypeId, shift, validOn, weekday]);

  function refresh() {
    setRequestVersion((version) => version + 1);
  }

  function toggleCreateDay(value: number) {
    setCreateDraft((draft) => ({ ...draft, weekdays: draft.weekdays.includes(value) ? draft.weekdays.filter((day) => day !== value) : [...draft.weekdays, value].sort((a, b) => a - b) }));
  }

  function toggleEditDay(value: number) {
    setEditing((draft) => draft ? { ...draft, weekdays: draft.weekdays.includes(value) ? draft.weekdays.filter((day) => day !== value) : [...draft.weekdays, value].sort((a, b) => a - b) } : draft);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCreateError(null);
    try {
      await serviceFrequenciesAdapter.create(createDraft);
      setCreateDraft({ ...emptyCreateDraft, validFrom: new Date().toISOString().slice(0, 10) });
      setShowCreate(false);
      setMessage("Frecuencia creada. La regla queda almacenada para su configuración operativa.");
      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo crear la frecuencia.";
      setCreateError(errorMessage);
      setMessage(errorMessage);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setMessage(null);
    setEditError(null);
    try {
      await serviceFrequenciesAdapter.update(editing.item.id, { weekdays: editing.weekdays, shift: editing.shift, validFrom: editing.validFrom, validTo: editing.validTo || null });
      setEditing(null);
      setMessage("Frecuencia actualizada. Los Services ya creados no se modifican.");
      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar la frecuencia.";
      setEditError(errorMessage);
      setMessage(errorMessage);
    }
  }

  async function confirmClose() {
    if (!closing) return;
    setMessage(null);
    try {
      await serviceFrequenciesAdapter.close(closing.id);
      setClosing(null);
      setMessage("Vigencia cerrada. Los Services ya creados no se modifican.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cerrar la vigencia.");
    }
  }

  return (
    <section aria-labelledby="service-frequencies-title" className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Catálogo · Planificación</p>
          <h1 id="service-frequencies-title" className="text-2xl font-semibold tracking-tight">Frecuencias de servicio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Configure reglas de recorrido por día, turno y vigencia. Esta configuración no genera Services automáticamente.</p>
        </div>
        {canManage ? <Button type="button" onClick={() => { setShowCreate((value) => !value); setEditing(null); }}>{showCreate ? "Cerrar alta" : "Nueva frecuencia"}</Button> : null}
      </div>

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar las frecuencias, pero no administrarlas.</p> : null}
      {message ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{message}</p> : null}
      {catalogError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm">{catalogError}</p> : null}

      {showCreate && canManage ? (
        <form onSubmit={submitCreate} className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Nueva frecuencia</h2>
          <FieldDescription className="mt-1">Solo se muestran tipos de servicio de modo Recorrido. El tipo y el recorrido quedan inmutables después de crear la regla.</FieldDescription>
          <FieldGroup className="mt-5 grid gap-4 md:grid-cols-2">
            <Field><FieldLabel htmlFor="frequency-service-type">Tipo de servicio</FieldLabel><select id="frequency-service-type" className={formControlClass} required value={createDraft.serviceTypeId} aria-invalid={Boolean(createError)} aria-describedby={createError ? "frequency-service-type-error" : undefined} onChange={(event) => setCreateDraft({ ...createDraft, serviceTypeId: event.target.value })}><option value="">Seleccione un tipo de recorrido</option>{serviceTypes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select><FieldError id="frequency-service-type-error">{createError}</FieldError></Field>
            <Field><FieldLabel htmlFor="frequency-route">Recorrido</FieldLabel><select id="frequency-route" className={formControlClass} required value={createDraft.routeId} onChange={(event) => setCreateDraft({ ...createDraft, routeId: event.target.value })}><option value="">Seleccione un recorrido</option>{routes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></Field>
            <DayPicker idPrefix="create-frequency" values={createDraft.weekdays} onToggle={toggleCreateDay} />
            <Field><FieldLabel htmlFor="frequency-shift">Turno</FieldLabel><select id="frequency-shift" className={formControlClass} value={createDraft.shift} onChange={(event) => { const parsed = serviceFrequencyShiftSchema.safeParse(event.target.value); if (parsed.success) setCreateDraft({ ...createDraft, shift: parsed.data }); }}>{shifts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="frequency-valid-from">Válida desde</FieldLabel><input id="frequency-valid-from" type="date" className={formControlClass} required value={createDraft.validFrom} onChange={(event) => setCreateDraft({ ...createDraft, validFrom: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="frequency-valid-to">Válida hasta <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel><input id="frequency-valid-to" type="date" className={formControlClass} value={createDraft.validTo ?? ""} onChange={(event) => setCreateDraft({ ...createDraft, validTo: event.target.value || null })} /></Field>
          </FieldGroup>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit">Crear frecuencia</Button></div>
        </form>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_150px_150px_150px]">
        <Field><FieldLabel htmlFor="filter-frequency-service-type">Tipo</FieldLabel><select id="filter-frequency-service-type" aria-label="Filtrar por tipo" className={formControlClass} value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)}><option value="">Todos</option>{serviceTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field><FieldLabel htmlFor="filter-frequency-route">Ruta</FieldLabel><select id="filter-frequency-route" aria-label="Filtrar por ruta" className={formControlClass} value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">Todos</option>{routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field><FieldLabel htmlFor="filter-frequency-shift">Turno</FieldLabel><select id="filter-frequency-shift" aria-label="Filtrar por turno" className={formControlClass} value={shift} onChange={(event) => setShift(event.target.value as ServiceFrequencyShift | "")}><option value="">Todos</option>{shifts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field><FieldLabel htmlFor="filter-frequency-weekday">Día</FieldLabel><select id="filter-frequency-weekday" aria-label="Filtrar por día" className={formControlClass} value={weekday} onChange={(event) => setWeekday(event.target.value)}><option value="">Todos</option>{weekdays.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field><FieldLabel htmlFor="filter-frequency-valid-on">Vigente el</FieldLabel><input id="filter-frequency-valid-on" aria-label="Filtrar por fecha de vigencia" type="date" className={formControlClass} value={validOn} onChange={(event) => setValidOn(event.target.value)} /></Field>
      </div>

      {state.status === "loading" ? <div role="status" aria-label="Cargando frecuencias" className="flex flex-col gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={refresh}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin frecuencias</EmptyTitle><EmptyDescription>No hay reglas para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Frecuencias de servicio</caption><thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Tipo de servicio</th><th className="px-4 py-3">Recorrido</th><th className="px-4 py-3">Días</th><th className="px-4 py-3">Turno</th><th className="px-4 py-3">Vigencia</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium">{serviceTypeNames.get(item.serviceTypeId) ?? item.serviceTypeId}</td><td className="px-4 py-3">{routeNames.get(item.routeId) ?? item.routeId}</td><td className="px-4 py-3">{item.weekdays.map(weekdayLabel).join(", ")}</td><td className="px-4 py-3">{shiftLabel(item.shift)}</td><td className="px-4 py-3"><span className="block">Desde {formatDate(item.validFrom)}</span><span className="text-muted-foreground">Hasta {formatDate(item.validTo)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => { setEditing({ item, weekdays: item.weekdays, shift: item.shift, validFrom: item.validFrom, validTo: item.validTo ?? "" }); setShowCreate(false); }}>Editar</Button>{item.validTo === null ? <Button type="button" size="sm" variant="destructive" onClick={() => setClosing(item)}>Cerrar vigencia</Button> : null}</> : null}</div></td></tr>)}</tbody></table>
        </div>
      ) : null}

      {editing && canManage ? (
        <form onSubmit={submitEdit} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Editar frecuencia</h2><FieldDescription>Tipo de servicio: {serviceTypeNames.get(editing.item.serviceTypeId) ?? editing.item.serviceTypeId}. Recorrido: {routeNames.get(editing.item.routeId) ?? editing.item.routeId}. Estos vínculos no se pueden modificar.</FieldDescription></div><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cerrar</Button></div>
          <FieldGroup className="mt-5 grid gap-4 md:grid-cols-2"><DayPicker idPrefix="edit-frequency" values={editing.weekdays} onToggle={toggleEditDay} /><Field><FieldLabel htmlFor="edit-frequency-shift">Turno</FieldLabel><select id="edit-frequency-shift" className={formControlClass} value={editing.shift} onChange={(event) => { const parsed = serviceFrequencyShiftSchema.safeParse(event.target.value); if (parsed.success) setEditing({ ...editing, shift: parsed.data }); }}>{shifts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field><FieldLabel htmlFor="edit-frequency-valid-from">Válida desde</FieldLabel><input id="edit-frequency-valid-from" type="date" className={formControlClass} required value={editing.validFrom} onChange={(event) => setEditing({ ...editing, validFrom: event.target.value })} /></Field><Field><FieldLabel htmlFor="edit-frequency-valid-to">Válida hasta</FieldLabel><input id="edit-frequency-valid-to" type="date" className={formControlClass} value={editing.validTo} aria-invalid={Boolean(editError)} aria-describedby={editError ? "edit-frequency-valid-to-error" : undefined} onChange={(event) => setEditing({ ...editing, validTo: event.target.value })} /><FieldError id="edit-frequency-valid-to-error">{editError}</FieldError></Field></FieldGroup>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div>
        </form>
      ) : null}

      <Dialog open={closing !== null} onOpenChange={(open) => { if (!open) setClosing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cerrar vigencia</DialogTitle><DialogDescription>La regla dejará de estar vigente. El sistema establecerá la fecha de cierre hoy o en la fecha de inicio si todavía no comenzó.</DialogDescription></DialogHeader>
          <div className="flex items-start gap-3 py-4 text-sm"><CalendarClock className="mt-0.5 text-muted-foreground" aria-hidden="true" /><p>Esta acción solo modifica la ventana de vigencia de la frecuencia. Los Services ya creados quedan intactos.</p></div>
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Conservar vigencia</DialogClose><Button type="button" variant="destructive" onClick={() => void confirmClose()}>Cerrar vigencia</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DayPicker({ idPrefix, values, onToggle }: { idPrefix: string; values: number[]; onToggle: (value: number) => void }) {
  return <fieldset className="md:col-span-2"><legend className="mb-1.5 text-sm font-semibold">Días de la semana</legend><FieldDescription>Seleccione todos los días que forman parte de la regla.</FieldDescription><div className="mt-2 flex flex-wrap gap-2">{weekdays.map((day) => { const checked = values.includes(day.value); return <label key={day.value} htmlFor={`${idPrefix}-${day.value}`} className={`inline-flex min-h-10 max-[760px]:min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${checked ? "border-primary bg-primary/10 text-foreground" : "border-input bg-background text-muted-foreground"}`}><input id={`${idPrefix}-${day.value}`} type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(day.value)} />{checked ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}{day.label}</label>; })}</div></fieldset>;
}
