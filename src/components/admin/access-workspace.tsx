"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authenticatedFetch, ROLES_STALE_EVENT } from "@/lib/authenticated-fetch";
import { M6_ROLES, type M6Role } from "@/lib/m6-roles";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";

type Assignment = { userId: string; roles: M6Role[] };
type Listing = { data: Assignment[]; meta: { page: number; totalPages: number } };
const labels: Record<M6Role, string> = {
  M6_ADMIN: "Administración: gestiona accesos y configuración.",
  M6_OFICINA_OPERACIONES: "Oficina de operaciones: planifica y organiza servicios.",
  M6_OFICINA_AMBIENTAL: "Oficina ambiental: revisa expedientes y programa inspecciones.",
  M6_CAMPO_CUADRILLA: "Campo, cuadrilla: ejecuta los servicios asignados.",
  M6_CAMPO_INSPECTOR: "Campo, inspección: realiza inspecciones ambientales.",
  M6_AUDITOR: "Auditoría: consulta información sin modificarla.",
};
export function AccessWorkspace({ ownUserId }: { ownUserId: string }) {
  const [listing, setListing] = useState<Listing>();
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  const [selected, setSelected] = useState<Assignment>();
  const [roles, setRoles] = useState<M6Role[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const mixed = roles.some((role) => role === "M6_ADMIN" || role.startsWith("M6_OFICINA_")) && roles.some((role) => role.startsWith("M6_CAMPO_"));
  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/role-assignments?page=${page}`);
      if (!response.ok) throw new Error();
      setListing(await response.json() as Listing);
    } catch { setError("No se pudo cargar la lista. Reintentá."); }
  }, [page]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function open(userId: string) {
    setError(""); setMessage("");
    if (!/^\d+$/.test(userId)) { setError("Ingresá un identificador de M1 numérico."); return; }
    try {
      const response = await authenticatedFetch(`/api/role-assignments/${userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json() as Assignment;
      setSelected(data); setRoles(data.roles); setId(userId);
    } catch { setError("No se pudo consultar la persona. Reintentá."); }
  }
  async function save(remove = false) {
    if (!selected || mixed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await authenticatedFetch(`/api/role-assignments/${selected.userId}`, { method: remove ? "DELETE" : "PUT", headers: SESSION_MUTATION_HEADERS, ...(remove ? {} : { body: JSON.stringify({ roles }) }) });
      if (response.status === 409) { setError("No se pudo guardar: podría quitarse el último administrador o hubo un cambio simultáneo. Revisá e intentá de nuevo."); return; }
      if (response.status === 400) { setError("La selección de roles no es válida. Revisá los roles elegidos."); return; }
      if (!response.ok) throw new Error();
      const nextRoles = remove ? [] : roles;
      setSelected({ ...selected, roles: nextRoles }); setRoles(nextRoles); setConfirm(false);
      setMessage("Los roles asignados se guardaron. El cambio se aplica desde la próxima acción de la persona.");
      await load();
      if (selected.userId === ownUserId) window.dispatchEvent(new Event(ROLES_STALE_EVENT));
    } catch { setError("No se pudieron guardar los roles. Reintentá."); }
    finally { setBusy(false); }
  }
  return <div className="flex max-w-5xl flex-col gap-6">
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Accesos</h1><p>Administrá los roles asignados de M6. Los roles efectivos también dependen del rol de la persona en M1.</p><p>M6 no conoce los nombres de M1: verificá el identificador numérico antes de guardar.</p></header>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void open(id); }}><div className="flex min-w-48 flex-col gap-2"><Label htmlFor="m1-id">Identificador de usuario M1</Label><Input id="m1-id" inputMode="numeric" value={id} onChange={(event) => setId(event.target.value)} aria-describedby={error ? "access-error" : undefined} /></div><Button type="submit">Abrir persona</Button></form>
    <p role="status" aria-live="polite">{message}</p>{error && !confirm && <p id="access-error" role="alert">{error}</p>}
    {selected && <section className="flex flex-col gap-4" aria-labelledby="edit-heading"><h2 id="edit-heading" className="text-xl font-semibold">Roles de {selected.userId}{selected.userId === ownUserId ? " (vos)" : ""}</h2><fieldset className="flex flex-col gap-4" aria-describedby={mixed ? "mixed-error" : undefined}><legend className="mb-3 font-medium">Roles asignados</legend>{M6_ROLES.map((role) => <div className="flex items-start gap-3" key={role}><Checkbox id={role} checked={roles.includes(role)} onCheckedChange={(checked) => setRoles((current) => checked ? [...current, role] : current.filter((item) => item !== role))} /><Label htmlFor={role}>{labels[role]}</Label></div>)}</fieldset>{mixed && <p id="mixed-error" role="alert">No se pueden combinar roles de Oficina y Campo.</p>}<div className="flex flex-wrap gap-2"><Button disabled={mixed || busy || roles.length === 0} onClick={() => void save()}>Guardar roles</Button><Button variant="outline" disabled={busy || selected.roles.length === 0} onClick={() => setConfirm(true)}>Quitar todos los roles</Button></div></section>}
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="list-heading"><h2 id="list-heading" className="text-xl font-semibold">Personas con roles asignados</h2>{listing ? <><Table><TableHeader><TableRow><TableHead>Usuario M1</TableHead><TableHead>Roles asignados</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{listing.data.map((item) => <TableRow key={item.userId}><TableCell>{item.userId}{item.userId === ownUserId ? " (vos)" : ""}</TableCell><TableCell className="whitespace-normal">{item.roles.map((role) => labels[role].split(":")[0]).join(", ")}</TableCell><TableCell><Button variant="outline" onClick={() => void open(item.userId)}>Administrar</Button></TableCell></TableRow>)}</TableBody></Table><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, listing.meta.totalPages)}</span><Button variant="outline" disabled={page >= listing.meta.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button></div></> : <p>Cargando asignaciones…</p>}</section>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogHeader><DialogTitle>Quitar todos los roles</DialogTitle><DialogDescription>¿Querés quitar todos los roles de M6 del usuario {selected?.userId}? El cambio se aplica desde su próxima acción.</DialogDescription></DialogHeader>{error && <p role="alert">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void save(true)}>Quitar roles</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
