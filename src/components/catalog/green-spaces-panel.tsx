"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Leaf, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { greenSpacesAdapter, greenSpaceTypeSchema, type GreenSpace, type GreenSpaceQuery, type GreenSpaceType } from "@/lib/green-spaces";
import { zonesAdapter, type Zone } from "@/lib/zones";
import type { OperationalScenario } from "@/lib/scenarios";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; greenSpaces: GreenSpace[] };

type GreenSpaceForm = {
  name: string;
  spaceType: GreenSpaceType;
  areaM2: string;
  zoneId: string;
};

const spaceTypes = greenSpaceTypeSchema.options;
const spaceTypeLabels: Record<GreenSpaceType, string> = {
  SQUARE: "Plaza",
  PARK: "Parque",
  PLANTER: "Cantero",
  MEDIAN: "Rambla / boulevard",
  PROMENADE: "Paseo",
};
const emptyForm: GreenSpaceForm = { name: "", spaceType: "SQUARE", areaM2: "", zoneId: "" };

export function GreenSpacesPanel({ scenario }: { scenario: OperationalScenario }) {
  // greenSpace:manage is a frontend hypothesis until M1 publishes the role/capability mapping.
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("greenSpace:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [typeFilter, setTypeFilter] = useState<GreenSpaceType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [zones, setZones] = useState<Zone[]>([]);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [editing, setEditing] = useState<GreenSpace | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<GreenSpaceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo<GreenSpaceQuery>(() => ({
    active: activeFilter === "all" ? undefined : activeFilter === "true",
    spaceType: typeFilter === "all" ? undefined : typeFilter,
    zoneId: zoneFilter === "all" ? undefined : zoneFilter,
  }), [activeFilter, typeFilter, zoneFilter]);

  useEffect(() => {
    let isCurrent = true;
    void zonesAdapter.list().then((page) => {
      if (isCurrent) setZones(page.zones);
    }).catch(() => undefined);
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function requestGreenSpaces() {
      setState({ status: "loading" });
      try {
        const page = await greenSpacesAdapter.list(query);
        if (isCurrent) setState({ status: "ready", greenSpaces: page.greenSpaces });
      } catch (caught) {
        if (isCurrent) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar los espacios verdes." });
      }
    }
    void requestGreenSpaces();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, zoneId: zones[0]?.id ?? "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(greenSpace: GreenSpace) {
    setEditing(greenSpace);
    setForm({ name: greenSpace.name, spaceType: greenSpace.spaceType, areaM2: String(greenSpace.areaM2), zoneId: greenSpace.zoneId });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const areaM2 = Number(form.areaM2);
    if (!form.name.trim() || !Number.isFinite(areaM2) || areaM2 <= 0 || !form.zoneId) {
      setFormError("Indique nombre, una superficie mayor que cero y una zona.");
      return;
    }
    try {
      const payload = { name: form.name.trim(), spaceType: form.spaceType, areaM2, zoneId: form.zoneId };
      if (editing) await greenSpacesAdapter.update(editing.id, payload);
      else await greenSpacesAdapter.create(payload);
      setFormOpen(false);
      setNotice(editing ? "Espacio verde actualizado." : "Espacio verde registrado.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "No se pudo guardar el espacio verde.");
    }
  }

  async function deactivate(greenSpace: GreenSpace) {
    if (!window.confirm(`¿Dar de baja el espacio verde ${greenSpace.name}?`)) return;
    try {
      await greenSpacesAdapter.remove(greenSpace.id);
      setNotice(`Espacio verde ${greenSpace.name} dado de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No se pudo dar de baja el espacio verde.");
    }
  }

  return (
    <section aria-labelledby="green-spaces-title" className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Leaf aria-hidden className="size-5 text-[var(--color-institutional)]" />
            <h2 id="green-spaces-title" className="text-xl font-semibold tracking-tight">Espacios verdes</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Plazas, parques, canteros y ramblas disponibles para la planificación operativa.</p>
        </div>
        {canManage ? <Button onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar espacio verde</Button> : null}
      </div>

      {notice ? <p className="text-sm text-[var(--color-success)]" role="status">{notice}</p> : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3" aria-label="Filtros de espacios verdes">
        <Field>
          <FieldLabel htmlFor="green-space-active-filter">Estado</FieldLabel>
          <select id="green-space-active-filter" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} className={formControlClass}>
            <option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="green-space-type-filter">Tipo de espacio</FieldLabel>
          <select id="green-space-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as GreenSpaceType | "all")} className={formControlClass}>
            <option value="all">Todos los tipos</option>
            {spaceTypes.map((type) => <option key={type} value={type}>{spaceTypeLabels[type]}</option>)}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="green-space-zone-filter">Zona</FieldLabel>
          <select id="green-space-zone-filter" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} className={formControlClass}>
            <option value="all">Todas las zonas</option>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}
          </select>
        </Field>
      </div>

      {state.status === "loading" ? <p aria-label="Cargando espacios verdes" className="text-sm text-muted-foreground">Cargando espacios verdes…</p> : null}
      {state.status === "error" ? <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>{state.message}</span><Button variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar carga</Button></div> : null}
      {state.status === "ready" && state.greenSpaces.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No hay espacios verdes que coincidan con los filtros.</p> : null}
      {state.status === "ready" && state.greenSpaces.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Espacios verdes registrados</caption>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="px-4 py-3">Nombre</th><th scope="col" className="px-4 py-3">Tipo</th><th scope="col" className="px-4 py-3">Superficie</th><th scope="col" className="px-4 py-3">Zona</th><th scope="col" className="px-4 py-3">Estado</th>{canManage ? <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th> : null}</tr></thead>
            <tbody className="divide-y divide-border">{state.greenSpaces.map((greenSpace) => {
              const zone = zones.find((item) => item.id === greenSpace.zoneId);
              return <tr key={greenSpace.id}>
                <th scope="row" className="px-4 py-3 font-medium">{greenSpace.name}</th>
                <td className="px-4 py-3">{spaceTypeLabels[greenSpace.spaceType]}</td>
                <td className="px-4 py-3">{greenSpace.areaM2.toLocaleString("es-AR")} m²</td>
                <td className="px-4 py-3">{zone ? `${zone.code} · ${zone.name}` : greenSpace.zoneId}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1">{greenSpace.active ? <Check aria-hidden className="size-4 text-[var(--color-success)]" /> : <X aria-hidden className="size-4 text-muted-foreground" />}{greenSpace.active ? "Activo" : "Inactivo"}</span></td>
                {canManage ? <td className="flex gap-2 px-4 py-3"><Button variant="outline" size="sm" onClick={() => openEdit(greenSpace)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{greenSpace.active ? <Button variant="destructive" size="sm" onClick={() => void deactivate(greenSpace)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</td> : null}
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar espacio verde" : "Registrar espacio verde"}</DialogTitle><DialogDescription>Complete los datos del espacio catalogado. La baja se realiza de forma lógica.</DialogDescription></DialogHeader>
          {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
          <form id="green-space-form" onSubmit={(event) => void save(event)}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="green-space-name">Nombre</FieldLabel><input id="green-space-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={formControlClass} required aria-invalid={Boolean(formError)} aria-describedby={formError ? "green-space-name-error" : undefined} /><FieldError id="green-space-name-error" role="none">{formError}</FieldError></Field>
              <Field><FieldLabel htmlFor="green-space-type-form">Tipo de espacio en el formulario</FieldLabel><select id="green-space-type-form" value={form.spaceType} onChange={(event) => setForm({ ...form, spaceType: event.target.value as GreenSpaceType })} className={formControlClass}>{spaceTypes.map((type) => <option key={type} value={type}>{spaceTypeLabels[type]}</option>)}</select></Field>
              <Field><FieldLabel htmlFor="green-space-area">Superficie (m²)</FieldLabel><input id="green-space-area" type="number" min="0.01" step="0.01" value={form.areaM2} onChange={(event) => setForm({ ...form, areaM2: event.target.value })} className={formControlClass} required /><FieldDescription>Superficie declarada en metros cuadrados.</FieldDescription></Field>
              <Field><FieldLabel htmlFor="green-space-zone-form">Zona en el formulario</FieldLabel><select id="green-space-zone-form" value={form.zoneId} onChange={(event) => setForm({ ...form, zoneId: event.target.value })} className={formControlClass} required>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}</select></Field>
            </FieldGroup>
          </form>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" form="green-space-form">Guardar espacio verde</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
