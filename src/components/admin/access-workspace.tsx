"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authenticatedFetch, ROLES_STALE_EVENT } from "@/lib/authenticated-fetch";
import { hasOfficeFieldRoleMix, M6_ROLES, type M6Role } from "@/lib/m6-roles";
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
  const [listError, setListError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const mixed = hasOfficeFieldRoleMix(roles);

  const load = useCallback(async () => {
    setListError("");
    try {
      const response = await authenticatedFetch(`/api/role-assignments?page=${page}`);
      if (!response.ok) throw new Error();
      setListing(await response.json() as Listing);
    } catch {
      setListError("No se pudo cargar la lista de asignaciones. Vuelva a intentarlo.");
    }
  }, [page]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function open(userId: string) {
    setLookupError("");
    setSaveError("");
    setMessage("");
    setSelected(undefined);
    setRoles([]);

    if (!/^\d+$/.test(userId)) {
      setLookupError("Ingrese un identificador numérico de persona.");
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/role-assignments/${userId}`);
      if (!response.ok) throw new Error();
      const data = await response.json() as Assignment;
      setSelected(data);
      setRoles(data.roles);
      setId(userId);
    } catch {
      setLookupError("No se pudo consultar a la persona. Vuelva a intentarlo.");
    }
  }

  async function save(remove = false) {
    if (!selected || mixed) return;

    setBusy(true);
    setSaveError("");
    setMessage("");

    try {
      const response = await authenticatedFetch(`/api/role-assignments/${selected.userId}`, {
        method: remove ? "DELETE" : "PUT",
        headers: SESSION_MUTATION_HEADERS,
        ...(remove ? {} : { body: JSON.stringify({ roles }) }),
      });

      if (response.status === 409) {
        setSaveError("No se pudo guardar: el cambio podría quitar al último administrador o coincidir con otra actualización. Revise e intente de nuevo.");
        return;
      }
      if (response.status === 400) {
        setSaveError("La selección de roles no es válida. Revise los roles elegidos.");
        return;
      }
      if (!response.ok) throw new Error();

      const nextRoles = remove ? [] : roles;
      setSelected({ ...selected, roles: nextRoles });
      setRoles(nextRoles);
      setConfirm(false);
      setMessage("Los roles asignados se guardaron. El cambio se aplica desde la próxima acción de la persona.");
      await load();
      if (selected.userId === ownUserId) window.dispatchEvent(new Event(ROLES_STALE_EVENT));
    } catch {
      setSaveError("No se pudieron guardar los roles. Vuelva a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex max-w-prose flex-col gap-2">
        <h1 className="text-2xl font-semibold">Accesos</h1>
        <p>Administre los roles asignados. Los roles efectivos también dependen del rol de la persona en el sistema de identidad.</p>
        <p>El sistema de identidad no comparte los nombres de las personas: verifique el identificador numérico antes de guardar.</p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void open(id);
        }}
      >
        <FieldGroup className="flex flex-row flex-wrap items-end gap-3">
          <Field className="min-w-48 flex-1" data-invalid={Boolean(lookupError)}>
            <FieldLabel htmlFor="person-id">Identificador numérico de persona</FieldLabel>
            <Input
              id="person-id"
              inputMode="numeric"
              value={id}
              onChange={(event) => setId(event.target.value)}
              aria-invalid={Boolean(lookupError)}
              aria-describedby={lookupError ? "person-id-error" : undefined}
            />
            {lookupError && <FieldError id="person-id-error">{lookupError}</FieldError>}
          </Field>
          <Button type="submit">Abrir persona</Button>
        </FieldGroup>
      </form>

      <p role="status" aria-live="polite">{message}</p>

      {selected && (
        <section className="flex flex-col gap-4" aria-labelledby="edit-heading">
          <h2 id="edit-heading" className="text-xl font-semibold">
            Roles de {selected.userId}{selected.userId === ownUserId ? " (su usuario)" : ""}
          </h2>
          <FieldSet
            data-invalid={mixed || Boolean(saveError && !confirm)}
            aria-invalid={mixed || Boolean(saveError && !confirm)}
            aria-describedby={mixed ? "mixed-error" : saveError && !confirm ? "assignment-error" : undefined}
          >
            <FieldLegend variant="label">Roles asignados</FieldLegend>
            <FieldGroup className="gap-3">
              {M6_ROLES.map((role) => (
                <Field orientation="horizontal" key={role}>
                  <Checkbox
                    id={role}
                    checked={roles.includes(role)}
                    aria-invalid={mixed || Boolean(saveError && !confirm)}
                    onCheckedChange={(checked) => setRoles((current) =>
                      checked ? [...current, role] : current.filter((item) => item !== role))}
                  />
                  <FieldLabel htmlFor={role} className="font-normal">{labels[role]}</FieldLabel>
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>

          {mixed && <FieldError id="mixed-error">No se pueden combinar roles de Oficina y Campo.</FieldError>}
          {saveError && !confirm && <FieldError id="assignment-error">{saveError}</FieldError>}

          <div className="flex flex-wrap gap-2">
            <Button disabled={mixed || busy || roles.length === 0} onClick={() => void save()}>
              Guardar roles
            </Button>
            <Button
              variant="outline"
              disabled={busy || selected.roles.length === 0}
              onClick={() => setConfirm(true)}
            >
              Quitar todos los roles
            </Button>
          </div>
        </section>
      )}

      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="list-heading">
        <h2 id="list-heading" className="text-xl font-semibold">Personas con roles asignados</h2>
        {listError && <FieldError>{listError}</FieldError>}
        {listing ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Roles asignados</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listing.data.map((item) => (
                  <TableRow key={item.userId}>
                    <TableCell>{item.userId}{item.userId === ownUserId ? " (su usuario)" : ""}</TableCell>
                    <TableCell className="whitespace-normal">
                      {item.roles.map((role) => labels[role].split(":")[0]).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" onClick={() => void open(item.userId)}>Administrar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span>Página {page} de {Math.max(1, listing.meta.totalPages)}</span>
              <Button variant="outline" disabled={page >= listing.meta.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
            </div>
          </>
        ) : (
          <p>Cargando asignaciones…</p>
        )}
      </section>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar todos los roles</DialogTitle>
            <DialogDescription>
              ¿Desea quitar todos los roles asignados a la persona {selected?.userId}? El cambio se aplica desde su próxima acción.
            </DialogDescription>
          </DialogHeader>
          {saveError && <FieldError>{saveError}</FieldError>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={() => void save(true)}>Quitar roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
