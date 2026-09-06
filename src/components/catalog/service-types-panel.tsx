"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  serviceTypeCategorySchema,
  serviceTypeModeSchema,
  serviceTypesAdapter,
  ServiceTypeRequestError,
  type ServiceType,
  type ServiceTypeCategory,
  type ServiceTypeMode,
} from "@/lib/service-types";
import type { OperationalScenario } from "@/lib/scenarios";

const categories: Array<{ value: ServiceTypeCategory; label: string }> = [
  { value: "WASTE_COLLECTION", label: "Recolección" },
  { value: "STREET_CLEANING", label: "Limpieza de calles" },
  { value: "CONTAINERS", label: "Contenedores" },
  { value: "TREES", label: "Arbolado" },
  { value: "GREEN_SPACES", label: "Espacios verdes" },
  { value: "ENVIRONMENTAL_CONTROL", label: "Control ambiental" },
];

const modes: Array<{ value: ServiceTypeMode; label: string }> = [
  { value: "ROUTE", label: "Recorrido" },
  { value: "POINT", label: "Punto" },
];

const controlClass = "min-h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const initialCreate = { code: "", name: "", category: "WASTE_COLLECTION" as ServiceTypeCategory, mode: "ROUTE" as ServiceTypeMode, requiresVehicle: true };

type LoadState = { status: "loading" } | { status: "ready"; items: ServiceType[] } | { status: "error"; message: string };

export function ServiceTypesPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("serviceType:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [category, setCategory] = useState<ServiceTypeCategory | "">("");
  const [mode, setMode] = useState<ServiceTypeMode | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(initialCreate);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestServiceTypes() {
      setState({ status: "loading" });
      try {
        const result = await serviceTypesAdapter.list({
          search: search || undefined,
          active: active === "all" ? undefined : active === "true",
          category: category || undefined,
          mode: mode || undefined,
        });
        if (isCurrent) setState({ status: "ready", items: result.serviceTypes });
      } catch (error) {
        if (isCurrent) setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar los tipos de servicio." });
      }
    }
    void requestServiceTypes();
    return () => { isCurrent = false; };
  }, [active, category, mode, requestVersion, search]);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await serviceTypesAdapter.create(createDraft);
      setCreateDraft(initialCreate);
      setShowCreate(false);
      setMessage("Tipo de servicio creado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el tipo de servicio.");
    }
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setMessage(null);
    try {
      await serviceTypesAdapter.update(editing.id, { name: editing.name, requiresVehicle: editing.requiresVehicle, active: editing.active });
      setEditing(null);
      setMessage("Tipo de servicio actualizado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el tipo de servicio.");
    }
  };

  const deactivate = async (item: ServiceType) => {
    setMessage(null);
    try {
      await serviceTypesAdapter.remove(item.id);
      setMessage("Tipo de servicio dado de baja. Los servicios existentes conservan su configuración.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      setMessage(error instanceof ServiceTypeRequestError ? error.message : "No se pudo dar de baja el tipo de servicio.");
    }
  };

  return (
    <section aria-labelledby="service-types-title" className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Catálogo · Servicios</p>
          <h1 id="service-types-title" className="text-2xl font-semibold tracking-tight">Tipos de servicio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Definí cómo se programan y ejecutan los servicios urbanos.</p>
        </div>
        {canManage ? <Button type="button" onClick={() => { setShowCreate((value) => !value); setEditing(null); }}>{showCreate ? "Cerrar alta" : "Nuevo tipo de servicio"}</Button> : null}
      </div>

      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el catálogo, pero no administrarlo.</p> : null}
      {message ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{message}</p> : null}

      {showCreate && canManage ? (
        <form onSubmit={submitCreate} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Alta de tipo de servicio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Código, categoría y modo quedan fijos al crear el tipo.</p>
          <FieldGroup className="mt-5 grid gap-4 md:grid-cols-2">
            <Field><FieldLabel htmlFor="service-type-code">Código</FieldLabel><input id="service-type-code" className={controlClass} required value={createDraft.code} onChange={(event) => setCreateDraft({ ...createDraft, code: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="service-type-name">Nombre</FieldLabel><input id="service-type-name" className={controlClass} required value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="service-type-category">Categoría</FieldLabel><select id="service-type-category" className={controlClass} value={createDraft.category} onChange={(event) => { const parsed = serviceTypeCategorySchema.safeParse(event.target.value); if (parsed.success) setCreateDraft({ ...createDraft, category: parsed.data }); }}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="service-type-mode">Modo</FieldLabel><select id="service-type-mode" className={controlClass} value={createDraft.mode} onChange={(event) => { const parsed = serviceTypeModeSchema.safeParse(event.target.value); if (parsed.success) setCreateDraft({ ...createDraft, mode: parsed.data }); }}>{modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <label className="flex min-h-9 items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={createDraft.requiresVehicle} onChange={(event) => setCreateDraft({ ...createDraft, requiresVehicle: event.target.checked })} /> Requiere vehículo</label>
          </FieldGroup>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit">Crear tipo</Button></div>
        </form>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_160px_190px_150px]">
        <label className="flex flex-col gap-1 text-sm font-semibold">Buscar<input aria-label="Buscar tipos de servicio" className={controlClass} placeholder="Código o nombre" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Estado<select aria-label="Filtrar por estado" className={controlClass} value={active} onChange={(event) => setActive(event.target.value)}><option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Categoría<select aria-label="Filtrar por categoría" className={controlClass} value={category} onChange={(event) => setCategory(event.target.value as ServiceTypeCategory | "")}><option value="">Todas</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Modo<select aria-label="Filtrar por modo" className={controlClass} value={mode} onChange={(event) => setMode(event.target.value as ServiceTypeMode | "")}><option value="">Todos</option>{modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>

      {state.status === "loading" ? <div role="status" aria-label="Cargando tipos de servicio" className="flex flex-col gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin tipos de servicio</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Tipos de servicio</caption><thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Modo</th><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono text-xs">{item.code}</td><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{categories.find((option) => option.value === item.category)?.label ?? item.category}</td><td className="px-4 py-3">{item.mode === "ROUTE" ? "Recorrido" : "Punto"}</td><td className="px-4 py-3">{item.requiresVehicle ? "Sí" : "No"}</td><td className="px-4 py-3">{item.active ? "Activo" : "Inactivo"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setShowCreate(false); }}>Editar</Button>{item.active ? <Button type="button" size="sm" variant="destructive" onClick={() => void deactivate(item)}>Dar de baja</Button> : null}</> : null}</div></td></tr>)}</tbody></table></div> : null}

      {editing && canManage ? <form onSubmit={submitEdit} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Editar tipo de servicio</h2><FieldDescription>El código, la categoría y el modo son de solo lectura porque ya pueden estar copiados en servicios programados.</FieldDescription></div><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cerrar</Button></div><FieldGroup className="mt-5 grid gap-4 md:grid-cols-2"><Field><FieldLabel htmlFor="edit-service-type-code">Código</FieldLabel><input id="edit-service-type-code" className={controlClass} value={editing.code} readOnly aria-readonly="true" /></Field><Field><FieldLabel htmlFor="edit-service-type-name">Nombre</FieldLabel><input id="edit-service-type-name" className={controlClass} required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></Field><Field><FieldLabel htmlFor="edit-service-type-category">Categoría</FieldLabel><input id="edit-service-type-category" className={controlClass} value={categories.find((item) => item.value === editing.category)?.label ?? editing.category} readOnly aria-readonly="true" /></Field><Field><FieldLabel htmlFor="edit-service-type-mode">Modo</FieldLabel><input id="edit-service-type-mode" className={controlClass} value={editing.mode === "ROUTE" ? "Recorrido" : "Punto"} readOnly aria-readonly="true" /></Field><label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={editing.requiresVehicle} onChange={(event) => setEditing({ ...editing, requiresVehicle: event.target.checked })} /> Requiere vehículo</label><label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Activo</label></FieldGroup><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div></form> : null}
    </section>
  );
}
