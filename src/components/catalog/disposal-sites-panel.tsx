"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { disposalSiteTypeSchema, disposalSitesAdapter, DisposalSiteRequestError, type DisposalSite, type DisposalSiteType } from "@/lib/disposal-sites";
import type { OperationalScenario } from "@/lib/scenarios";

const siteTypes: Array<{ value: DisposalSiteType; label: string }> = [
  { value: "LANDFILL", label: "Relleno sanitario" },
  { value: "TRANSFER_STATION", label: "Estación de transferencia" },
  { value: "RECYCLING_PLANT", label: "Planta de reciclaje" },
  { value: "COMPOSTING_PLANT", label: "Planta de compostaje" },
];
const controlClass = "min-h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const initialCreate = { code: "", siteType: "TRANSFER_STATION" as DisposalSiteType, name: "" };
type LoadState = { status: "loading" } | { status: "ready"; items: DisposalSite[] } | { status: "error"; message: string };

export function DisposalSitesPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("disposalSite:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [active, setActive] = useState("all");
  const [siteType, setSiteType] = useState<DisposalSiteType | "">("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(initialCreate);
  const [editing, setEditing] = useState<DisposalSite | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestSites() {
      setState({ status: "loading" });
      try {
        const result = await disposalSitesAdapter.list({ active: active === "all" ? undefined : active === "true", siteType: siteType || undefined, search: search || undefined });
        if (isCurrent) setState({ status: "ready", items: result.disposalSites });
      } catch (error) {
        if (isCurrent) setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar los sitios de disposición." });
      }
    }
    void requestSites();
    return () => { isCurrent = false; };
  }, [active, requestVersion, search, siteType]);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(null);
    try { await disposalSitesAdapter.create(createDraft); setCreateDraft(initialCreate); setShowCreate(false); setMessage("Sitio de disposición creado."); setRequestVersion((version) => version + 1); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear el sitio de disposición."); }
  };
  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setMessage(null);
    try { await disposalSitesAdapter.update(editing.id, { name: editing.name, siteType: editing.siteType, active: editing.active }); setEditing(null); setMessage("Sitio de disposición actualizado."); setRequestVersion((version) => version + 1); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar el sitio de disposición."); }
  };
  const deactivate = async (item: DisposalSite) => {
    setMessage(null);
    try { await disposalSitesAdapter.remove(item.id); setMessage("Sitio de disposición dado de baja. Los registros existentes conservan su referencia."); setRequestVersion((version) => version + 1); }
    catch (error) { setMessage(error instanceof DisposalSiteRequestError ? error.message : "No se pudo dar de baja el sitio de disposición."); }
  };

  return (
    <section aria-labelledby="disposal-sites-title" className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Catálogo · Servicios</p><h1 id="disposal-sites-title" className="text-2xl font-semibold tracking-tight">Sitios de disposición</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Destinos de disposición final que pueden referenciar los registros de recolección.</p></div>{canManage ? <Button type="button" onClick={() => { setShowCreate((value) => !value); setEditing(null); }}>{showCreate ? "Cerrar alta" : "Nuevo sitio de disposición"}</Button> : null}</div>
      {!canManage ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">Esta sesión puede consultar el catálogo, pero no administrarlo.</p> : null}
      {message ? <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">{message}</p> : null}
      {showCreate && canManage ? <form onSubmit={submitCreate} className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-semibold">Alta de sitio de disposición</h2><p className="mt-1 text-sm text-muted-foreground">El sitio podrá ser referenciado por registros de recolección existentes y futuros.</p><FieldGroup className="mt-5 grid gap-4 md:grid-cols-3"><Field><FieldLabel htmlFor="disposal-site-code">Código</FieldLabel><input id="disposal-site-code" className={controlClass} required value={createDraft.code} onChange={(event) => setCreateDraft({ ...createDraft, code: event.target.value })} /></Field><Field><FieldLabel htmlFor="disposal-site-name">Nombre</FieldLabel><input id="disposal-site-name" className={controlClass} required value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} /></Field><Field><FieldLabel htmlFor="disposal-site-type">Tipo</FieldLabel><select id="disposal-site-type" className={controlClass} value={createDraft.siteType} onChange={(event) => { const parsed = disposalSiteTypeSchema.safeParse(event.target.value); if (parsed.success) setCreateDraft({ ...createDraft, siteType: parsed.data }); }}>{siteTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></FieldGroup><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit">Crear sitio</Button></div></form> : null}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_190px_160px]"><label className="flex flex-col gap-1 text-sm font-semibold">Buscar<input aria-label="Buscar sitios de disposición" className={controlClass} placeholder="Código o nombre" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="flex flex-col gap-1 text-sm font-semibold">Tipo<select aria-label="Filtrar por tipo de sitio" className={controlClass} value={siteType} onChange={(event) => setSiteType(event.target.value as DisposalSiteType | "")}><option value="">Todos</option>{siteTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-semibold">Estado<select aria-label="Filtrar sitios por estado" className={controlClass} value={active} onChange={(event) => setActive(event.target.value)}><option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label></div>
      {state.status === "loading" ? <div role="status" aria-label="Cargando sitios de disposición" className="flex flex-col gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
      {state.status === "error" ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p>{state.message}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar</Button></div> : null}
      {state.status === "ready" && state.items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Sin sitios de disposición</EmptyTitle><EmptyDescription>No hay resultados para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty> : null}
      {state.status === "ready" && state.items.length > 0 ? <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">Sitios de disposición</caption><thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono text-xs">{item.code}</td><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{siteTypes.find((option) => option.value === item.siteType)?.label ?? item.siteType}</td><td className="px-4 py-3">{item.active ? "Activo" : "Inactivo"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setShowCreate(false); }}>Editar</Button>{item.active ? <Button type="button" size="sm" variant="destructive" onClick={() => void deactivate(item)}>Dar de baja</Button> : null}</> : null}</div></td></tr>)}</tbody></table></div> : null}
      {editing && canManage ? <form onSubmit={submitEdit} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Editar sitio de disposición</h2><FieldDescription>La baja siempre es lógica para preservar las referencias de los registros de recolección.</FieldDescription></div><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cerrar</Button></div><FieldGroup className="mt-5 grid gap-4 md:grid-cols-3"><Field><FieldLabel htmlFor="edit-disposal-site-code">Código</FieldLabel><input id="edit-disposal-site-code" className={controlClass} value={editing.code} readOnly aria-readonly="true" /></Field><Field><FieldLabel htmlFor="edit-disposal-site-name">Nombre</FieldLabel><input id="edit-disposal-site-name" className={controlClass} required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></Field><Field><FieldLabel htmlFor="edit-disposal-site-type">Tipo</FieldLabel><select id="edit-disposal-site-type" className={controlClass} value={editing.siteType} onChange={(event) => { const parsed = disposalSiteTypeSchema.safeParse(event.target.value); if (parsed.success) setEditing({ ...editing, siteType: parsed.data }); }}>{siteTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Activo</label></FieldGroup><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div></form> : null}
    </section>
  );
}
