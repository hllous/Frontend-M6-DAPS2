"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, Truck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  vehiclesAdapter,
  vehicleTypeSchema,
  type Vehicle,
  type VehicleQuery,
  type VehicleType,
} from "@/lib/vehicles";

import styles from "./catalog-panel.module.css";

const vehicleTypes = vehicleTypeSchema.options;
const vehicleTypeLabels: Record<VehicleType, string> = {
  COMPACTOR_TRUCK: "Camión compactador",
  DUMP_TRUCK: "Camión volcador",
  SWEEPER: "Barredora",
  WATER_TANKER: "Camión cisterna",
  CRANE_TRUCK: "Camión grúa",
  VAN: "Camioneta utilitaria",
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; vehicles: Vehicle[] };

type VehicleForm = { plate: string; vehicleType: VehicleType; capacity: string };

const emptyForm: VehicleForm = { plate: "", vehicleType: "COMPACTOR_TRUCK", capacity: "" };

export function VehicleCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage = scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("vehicle:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo<VehicleQuery>(() => ({
    active: activeFilter === "all" ? undefined : activeFilter === "true",
    vehicleType: typeFilter === "all" ? undefined : typeFilter,
  }), [activeFilter, typeFilter]);

  useEffect(() => {
    let isCurrent = true;
    async function requestVehicles() {
      setState({ status: "loading" });
      try {
        const page = await vehiclesAdapter.list(query);
        if (isCurrent) setState({ status: "ready", vehicles: page.vehicles });
      } catch (caught) {
        if (isCurrent) setState({ status: "error", message: caught instanceof Error ? caught.message : "No se pudieron cargar los vehículos." });
      }
    }
    void requestVehicles();
    return () => { isCurrent = false; };
  }, [query, requestVersion]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({ plate: vehicle.plate, vehicleType: vehicle.vehicleType, capacity: String(vehicle.capacity) });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const capacity = Number(form.capacity);
    if (!form.plate.trim() || !Number.isFinite(capacity) || capacity <= 0) {
      setFormError("Indique una patente y una capacidad mayor que cero.");
      return;
    }
    try {
      const payload = { plate: form.plate.trim(), vehicleType: form.vehicleType, capacity };
      if (editing) await vehiclesAdapter.update(editing.id, payload);
      else await vehiclesAdapter.create(payload);
      setFormOpen(false);
      setNotice(editing ? "Vehículo actualizado." : "Vehículo registrado.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "No se pudo guardar el vehículo.");
    }
  }

  async function deactivate(vehicle: Vehicle) {
    if (!window.confirm(`¿Dar de baja el vehículo ${vehicle.plate}?`)) return;
    try {
      await vehiclesAdapter.remove(vehicle.id);
      setNotice(`Vehículo ${vehicle.plate} dado de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No se pudo dar de baja el vehículo.");
    }
  }

  return (
    <section aria-labelledby="vehicles-title" className={styles.resourcePanel}>
      <div className={styles.resourceHeading}>
        <div>
          <div className={styles.titleWithIcon}><Truck aria-hidden /><h2 id="vehicles-title">Vehículos</h2></div>
          <p>Registre los vehículos disponibles para la asignación de servicios.</p>
        </div>
        {canManage ? <Button onClick={openCreate}><Plus data-icon="inline-start" aria-hidden />Registrar vehículo</Button> : null}
      </div>

      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <div className={styles.filters} aria-label="Filtros de vehículos">
        <Field>
          <FieldLabel htmlFor="vehicle-active-filter">Estado</FieldLabel>
          <select id="vehicle-active-filter" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} className={styles.control}>
            <option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="vehicle-type-filter">Tipo de vehículo</FieldLabel>
          <select id="vehicle-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as VehicleType | "all")} className={styles.control}>
            <option value="all">Todos los tipos</option>
            {vehicleTypes.map((type) => <option key={type} value={type}>{vehicleTypeLabels[type]}</option>)}
          </select>
        </Field>
      </div>

      {state.status === "loading" ? <p className={styles.muted} aria-label="Cargando vehículos">Cargando vehículos…</p> : null}
      {state.status === "error" ? <div className={styles.error} role="alert"><span>{state.message}</span><Button variant="outline" onClick={() => setRequestVersion((version) => version + 1)}>Reintentar carga</Button></div> : null}
      {state.status === "ready" && state.vehicles.length === 0 ? <p className={styles.empty}>No hay vehículos que coincidan con los filtros.</p> : null}
      {state.status === "ready" && state.vehicles.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Vehículos registrados</caption>
            <thead><tr><th scope="col">Patente</th><th scope="col">Tipo</th><th scope="col">Capacidad</th><th scope="col">Estado</th>{canManage ? <th scope="col"><span className="sr-only">Acciones</span></th> : null}</tr></thead>
            <tbody>{state.vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <th scope="row" data-label="Patente">{vehicle.plate}</th>
                <td data-label="Tipo">{vehicleTypeLabels[vehicle.vehicleType]}</td>
                <td data-label="Capacidad">{vehicle.capacity}</td>
                <td data-label="Estado"><span className={vehicle.active ? styles.active : styles.inactive}>{vehicle.active ? <Check aria-hidden /> : <X aria-hidden />}{vehicle.active ? "Activo" : "Inactivo"}</span></td>
                {canManage ? <td className={styles.actions}><Button variant="outline" size="sm" onClick={() => openEdit(vehicle)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{vehicle.active ? <Button variant="destructive" size="sm" onClick={() => void deactivate(vehicle)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</td> : null}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar vehículo" : "Registrar vehículo"}</DialogTitle><DialogDescription>Complete los datos del recurso operativo. La baja se realiza de forma lógica.</DialogDescription></DialogHeader>
          {formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
          <form id="vehicle-form" onSubmit={(event) => void save(event)}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="vehicle-plate">Patente</FieldLabel><input id="vehicle-plate" value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value })} className={styles.control} required /></Field>
              <Field><FieldLabel htmlFor="vehicle-type-form">Tipo de vehículo para el registro</FieldLabel><select id="vehicle-type-form" value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value as VehicleType })} className={styles.control}>{vehicleTypes.map((type) => <option key={type} value={type}>{vehicleTypeLabels[type]}</option>)}</select></Field>
              <Field><FieldLabel htmlFor="vehicle-capacity">Capacidad</FieldLabel><input id="vehicle-capacity" type="number" min="1" step="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className={styles.control} required /><FieldDescription>Capacidad operativa declarada para el vehículo.</FieldDescription></Field>
            </FieldGroup>
          </form>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" form="vehicle-form">Guardar vehículo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
