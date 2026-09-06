"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Eye, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { OperationalScenario } from "@/lib/scenarios";
import { crewsAdapter, crewTypeSchema, shiftSchema, type Crew, type CrewQuery, type CrewType, type Shift } from "@/lib/crews";
import { m1IdentityAdapter, type M1IdentityReference } from "@/lib/m1-identity";

import styles from "./catalog-panel.module.css";

const crewTypes = crewTypeSchema.options;
const shifts = shiftSchema.options;
const crewTypeLabels: Record<CrewType, string> = { MUNICIPAL: "Municipal", COOPERATIVE: "Cooperativa", CONTRACTOR: "Contratista" };
const shiftLabels: Record<Shift, string> = { MORNING: "Mañana", AFTERNOON: "Tarde", NIGHT: "Noche" };
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; crews: Crew[] };
type CrewForm = { name: string; crewType: CrewType; leaderUserId: string; organizationId: string; defaultShift: Shift };
const emptyForm: CrewForm = { name: "", crewType: "MUNICIPAL", leaderUserId: "", organizationId: "", defaultShift: "MORNING" };

export function CrewCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("crew:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [typeFilter, setTypeFilter] = useState<CrewType | "all">("all");
  const [shiftFilter, setShiftFilter] = useState<Shift | "all">("all");
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [users, setUsers] = useState<M1IdentityReference[]>([]);
  const [organizations, setOrganizations] = useState<M1IdentityReference[]>([]);
  const [selected, setSelected] = useState<Crew | null>(null);
  const [editing, setEditing] = useState<Crew | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CrewForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo<CrewQuery>(() => ({ active: activeFilter === "all" ? undefined : activeFilter === "true", crewType: typeFilter === "all" ? undefined : typeFilter, defaultShift: shiftFilter === "all" ? undefined : shiftFilter }), [activeFilter, typeFilter, shiftFilter]);

  useEffect(() => {
    let current = true;
    void Promise.all([m1IdentityAdapter.listUsers(), m1IdentityAdapter.listOrganizations()]).then(([nextUsers, nextOrganizations]) => { if (current) { setUsers(nextUsers); setOrganizations(nextOrganizations); } });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    void crewsAdapter.list(query).then((page) => {
      const crews = scenario.actor.kind === "FIELD" && scenario.actor.crewId
        ? page.crews.filter((crew) => crew.id === scenario.actor.crewId)
        : page.crews;
      if (current) setState({ status: "ready", crews });
    }).catch((caught: unknown) => { if (current) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar las cuadrillas." }); });
    return () => { current = false; };
  }, [query, requestVersion, scenario]);

  const userName = (id: string) => users.find((user) => user.id === id)?.displayName ?? "Usuario M1 no resuelto";
  const organizationName = (id: string) => organizations.find((organization) => organization.id === id)?.displayName ?? "Organización M1 no resuelta";
  function openCreate() { setEditing(null); setForm({ ...emptyForm, leaderUserId: users[0]?.id ?? "", organizationId: organizations[0]?.id ?? "" }); setFormError(null); setFormOpen(true); }
  function openEdit(crew: Crew) { setEditing(crew); setForm({ name: crew.name, crewType: crew.crewType, leaderUserId: crew.leaderUserId, organizationId: crew.organizationId, defaultShift: crew.defaultShift }); setFormError(null); setFormOpen(true); }
  async function save(event: FormEvent) {
    event.preventDefault(); setFormError(null);
    if (!form.name.trim() || !form.leaderUserId || !form.organizationId) { setFormError("Complete el nombre, responsable y organización."); return; }
    try { if (editing) await crewsAdapter.update(editing.id, { ...form, name: form.name.trim(), active: editing.active }); else await crewsAdapter.create({ ...form, name: form.name.trim() }); setFormOpen(false); setNotice(editing ? "Cuadrilla actualizada." : "Cuadrilla registrada."); setRequestVersion((version) => version + 1); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : "No se pudo guardar la cuadrilla."); }
  }
  async function showDetail(crew: Crew) { try { setSelected(await crewsAdapter.get(crew.id)); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "No se pudo cargar el detalle."); } }
  async function deactivate(crew: Crew) { if (!window.confirm(`¿Dar de baja la cuadrilla ${crew.name}?`)) return; try { await crewsAdapter.remove(crew.id); setNotice(`Cuadrilla ${crew.name} dada de baja.`); setRequestVersion((version) => version + 1); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "No se pudo dar de baja la cuadrilla."); } }

  return (
    <section aria-labelledby="crews-title" className={styles.resourcePanel}>
      <div className={styles.resourceHeading}><div><div className={styles.titleWithIcon}><UsersRound aria-hidden /><h2 id="crews-title">Cuadrillas</h2></div><p>Consulte equipos, turnos y referencias de identidad administradas por M1.</p></div>{canManage ? <Button onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar cuadrilla</Button> : null}</div>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <div className={styles.filters} aria-label="Filtros de cuadrillas"><Field><FieldLabel htmlFor="crew-active-filter">Estado</FieldLabel><select id="crew-active-filter" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} className={styles.control}><option value="all">Todos</option><option value="true">Activas</option><option value="false">Inactivas</option></select></Field><Field><FieldLabel htmlFor="crew-type-filter">Tipo de cuadrilla</FieldLabel><select id="crew-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as CrewType | "all")} className={styles.control}><option value="all">Todos los tipos</option>{crewTypes.map((type) => <option key={type} value={type}>{crewTypeLabels[type]}</option>)}</select></Field><Field><FieldLabel htmlFor="crew-shift-filter">Turno</FieldLabel><select id="crew-shift-filter" value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value as Shift | "all")} className={styles.control}><option value="all">Todos los turnos</option>{shifts.map((shift) => <option key={shift} value={shift}>{shiftLabels[shift]}</option>)}</select></Field></div>
      {state.status === "loading" ? <p className={styles.muted} aria-label="Cargando cuadrillas">Cargando cuadrillas…</p> : null}
      {state.status === "error" ? <div className={styles.error} role="alert"><span>{state.message}</span><Button variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar carga</Button></div> : null}
      {state.status === "ready" && state.crews.length === 0 ? <p className={styles.empty}>No hay cuadrillas que coincidan con los filtros.</p> : null}
      {state.status === "ready" && state.crews.length > 0 ? <div className={styles.tableWrap}><table className={styles.table}><caption className="sr-only">Cuadrillas registradas</caption><thead><tr><th scope="col">Nombre</th><th scope="col">Tipo</th><th scope="col">Responsable</th><th scope="col">Organización</th><th scope="col">Turno</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{state.crews.map((crew) => <tr key={crew.id}><th scope="row" data-label="Nombre">{crew.name}</th><td data-label="Tipo">{crewTypeLabels[crew.crewType]}</td><td data-label="Responsable">{userName(crew.leaderUserId)}</td><td data-label="Organización">{organizationName(crew.organizationId)}</td><td data-label="Turno">{shiftLabels[crew.defaultShift]}</td><td data-label="Estado"><span className={crew.active ? styles.active : styles.inactive}>{crew.active ? <Check aria-hidden /> : <X aria-hidden />}{crew.active ? "Activa" : "Inactiva"}</span></td><td className={styles.actions}><Button variant="outline" size="sm" onClick={() => void showDetail(crew)}><Eye data-icon="inline-start" aria-hidden />Ver detalle</Button>{canManage ? <><Button variant="outline" size="sm" onClick={() => openEdit(crew)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{crew.active ? <Button variant="destructive" size="sm" onClick={() => void deactivate(crew)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</> : null}</td></tr>)}</tbody></table></div> : null}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Detalle de cuadrilla</DialogTitle><DialogDescription>Las membresías se muestran como referencias de identidad de M1; su administración pertenece a otra entrega.</DialogDescription></DialogHeader>{selected ? <div className={styles.detail}><p><strong>{selected.name}</strong></p><p>Responsable: {userName(selected.leaderUserId)}</p><p>Organización: {organizationName(selected.organizationId)}</p><p>Turno: {shiftLabels[selected.defaultShift]}</p><p>Integrantes: {selected.memberUserIds.map(userName).join(", ")}</p></div> : null}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar cuadrilla" : "Registrar cuadrilla"}</DialogTitle><DialogDescription>Los responsables y organizaciones se seleccionan mediante sus IDs de referencia M1.</DialogDescription></DialogHeader>{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}<form id="crew-form" onSubmit={(event) => void save(event)}><FieldGroup><Field><FieldLabel htmlFor="crew-name">Nombre</FieldLabel><input id="crew-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={styles.control} required /></Field><Field><FieldLabel htmlFor="crew-type-form">Tipo de cuadrilla</FieldLabel><select id="crew-type-form" value={form.crewType} onChange={(event) => setForm({ ...form, crewType: event.target.value as CrewType })} className={styles.control}>{crewTypes.map((type) => <option key={type} value={type}>{crewTypeLabels[type]}</option>)}</select></Field><Field><FieldLabel htmlFor="crew-leader">Responsable de cuadrilla (M1)</FieldLabel><select id="crew-leader" value={form.leaderUserId} onChange={(event) => setForm({ ...form, leaderUserId: event.target.value })} className={styles.control} required>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></Field><Field><FieldLabel htmlFor="crew-organization">Organización (M1)</FieldLabel><select id="crew-organization" value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })} className={styles.control} required>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.displayName}</option>)}</select></Field><Field><FieldLabel htmlFor="crew-shift-form">Turno predeterminado</FieldLabel><select id="crew-shift-form" value={form.defaultShift} onChange={(event) => setForm({ ...form, defaultShift: event.target.value as Shift })} className={styles.control}>{shifts.map((shift) => <option key={shift} value={shift}>{shiftLabels[shift]}</option>)}</select><FieldDescription>La gestión de integrantes queda fuera del alcance de este catálogo.</FieldDescription></Field></FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" form="crew-form">Guardar cuadrilla</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
