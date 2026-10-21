"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogPager } from "@/components/catalog/catalog-pager";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  vehiclesAdapter,
  vehicleTypeSchema,
  type Vehicle,
  type VehicleQuery,
  type VehicleType,
} from "@/lib/vehicles";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import styles from "./catalog-panel.module.css";
import { MAX_DECIMAL_10_2 } from "@/lib/input-limits";

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
  | { status: "ready"; vehicles: Vehicle[]; total: number; totalPages: number };

type VehicleForm = {
  plate: string;
  vehicleType: VehicleType;
  capacity: string;
};

const emptyForm: VehicleForm = {
  plate: "",
  vehicleType: "COMPACTOR_TRUCK",
  capacity: "",
};

export function VehicleCatalogPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("vehicle:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [requestVersion, setRequestVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [deactivatingVehicle, setDeactivatingVehicle] =
    useState<Vehicle | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  const query = useMemo<VehicleQuery>(
    () => ({
      active: activeFilter === "all" ? undefined : activeFilter === "true",
      vehicleType: typeFilter === "all" ? undefined : typeFilter,
    }),
    [activeFilter, typeFilter],
  );

  useEffect(() => {
    let isCurrent = true;
    async function requestVehicles() {
      setState({ status: "loading" });
      try {
        const result = await vehiclesAdapter.list({
          ...query,
          page,
          pageSize: 20,
        });
        if (!isCurrent) return;
        if (page > Math.max(1, result.totalPages)) {
          setPage(Math.max(1, result.totalPages));
          return;
        }
        setState({
          status: "ready",
          vehicles: result.vehicles,
          total: result.total,
          totalPages: result.totalPages,
        });
      } catch (caught) {
        if (isCurrent)
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar los vehículos.",
            ),
          });
      }
    }
    void requestVehicles();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion, page]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({
      plate: vehicle.plate,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity === null ? "" : String(vehicle.capacity),
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPlateError(null);
    setCapacityError(null);
    const capacity = Number(form.capacity);
    const plate = form.plate.trim();
    if (!plate) setPlateError("Ingrese una patente.");
    if (!Number.isFinite(capacity) || capacity <= 0)
      setCapacityError("Ingrese una capacidad mayor que cero.");
    if (!plate || !Number.isFinite(capacity) || capacity <= 0) {
      return;
    }
    if (capacity > MAX_DECIMAL_10_2) {
      setCapacityError(
        `La capacidad no puede superar ${MAX_DECIMAL_10_2.toLocaleString("es-AR")}.`,
      );
      return;
    }
    try {
      const payload = {
        plate: form.plate.trim(),
        vehicleType: form.vehicleType,
        capacity,
      };
      if (editing) await vehiclesAdapter.update(editing.id, payload);
      else await vehiclesAdapter.create(payload);
      setFormOpen(false);
      notifySuccess(editing ? "Vehículo actualizado." : "Vehículo registrado.");
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(errorMessage(caught, "No se pudo guardar el vehículo."));
    }
  }

  function deactivate(vehicle: Vehicle) {
    setDeactivatingVehicle(vehicle);
    setDeactivateError(null);
  }

  async function confirmDeactivation() {
    if (!deactivatingVehicle) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await vehiclesAdapter.remove(deactivatingVehicle.id);
      setDeactivatingVehicle(null);
      notifySuccess(`Vehículo ${deactivatingVehicle.plate} dado de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(
        errorMessage(caught, "No se pudo dar de baja el vehículo."),
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  return (
    <section aria-labelledby="vehicles-title" className={styles.resourcePanel}>
      <CatalogPageHeader
        title="Vehículos"
        titleId="vehicles-title"
        description="Registre los vehículos disponibles para la asignación de servicios."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar vehículo
            </Button>
          ) : null
        }
      />

      <Card aria-label="Filtros de vehículos">
        <CardContent>
          <FieldGroup className="grid gap-3 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="vehicle-active-filter">Estado</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos"],
                  ["true", "Activos"],
                  ["false", "Inactivos"],
                ])}
                value={activeFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setActiveFilter(value as typeof activeFilter);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="vehicle-active-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="vehicle-type-filter">
                Tipo de vehículo
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos los tipos"],
                  ...vehicleTypes.map((type) => [
                    type,
                    vehicleTypeLabels[type],
                  ]),
                ])}
                value={typeFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setTypeFilter(value as VehicleType | "all");
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="vehicle-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {vehicleTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {state.status === "loading" ? <p className={styles.muted} aria-label="Cargando vehículos">Cargando vehículos…</p> : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                Reintentar carga
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.vehicles.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay vehículos que coincidan con los filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.vehicles.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Vehículos registrados</caption>
            <thead><tr><th scope="col">Patente</th><th scope="col">Tipo</th><th scope="col">Capacidad (t)</th><th scope="col">Estado</th>{canManage ? <th scope="col"><span className="sr-only">Acciones</span></th> : null}</tr></thead>
            <tbody>{state.vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <th scope="row" data-label="Patente">{vehicle.plate}</th>
                <td data-label="Tipo">{vehicleTypeLabels[vehicle.vehicleType]}</td>
                <td data-label="Capacidad (t)">{vehicle.capacity === null ? "—" : `${vehicle.capacity.toLocaleString("es-AR")} t`}</td>
                <td data-label="Estado"><Badge variant={vehicle.active ? "success" : "secondary"}>{vehicle.active ? <Check aria-hidden /> : <X aria-hidden />}{vehicle.active ? "Activo" : "Inactivo"}</Badge></td>
                {canManage ? <td className={styles.actions} data-label="Acciones"><Button variant="outline" size="sm" onClick={() => openEdit(vehicle)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{vehicle.active ? <Button variant="destructive" size="sm" onClick={() => void deactivate(vehicle)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</td> : null}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <CatalogPager
          page={page}
          pageSize={20}
          total={state.total}
          totalPages={state.totalPages}
          onPageChange={setPage}
          label="Paginación de vehículos"
        />
      ) : null}

      <CatalogDeactivationDialog
        open={Boolean(deactivatingVehicle)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingVehicle(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del vehículo ${deactivatingVehicle?.plate ?? ""}`.trim()}
        consequence="El vehículo quedará inactivo y no estará disponible para nuevas asignaciones. Las asignaciones existentes conservarán su referencia."
        confirmAction={`Dar de baja el vehículo ${deactivatingVehicle?.plate ?? ""}`.trim()}
        safeAlternative={`Conservar el vehículo ${deactivatingVehicle?.plate ?? ""}`.trim()}
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar vehículo" : "Registrar vehículo"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del recurso operativo. La baja se realiza de
              forma lógica.
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form
            className="min-h-0 overflow-y-auto"
            id="vehicle-form"
            onSubmit={(event) => void save(event)}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(plateError)}>
                <FieldLabel htmlFor="vehicle-plate">Patente</FieldLabel>
                <Input
                  id="vehicle-plate"
                  value={form.plate}
                  onChange={(event) => {
                    setForm({ ...form, plate: event.target.value });
                    setPlateError(null);
                    setFormError(null);
                  }}
                  required
                  aria-invalid={Boolean(plateError)}
                  aria-describedby={
                    plateError ? "vehicle-plate-error" : undefined
                  }
                />
                <FieldError id="vehicle-plate-error">{plateError}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="vehicle-type-form">
                  Tipo de vehículo
                </FieldLabel>
                <Select
                  items={Object.fromEntries([
                    ...vehicleTypes.map((type) => [
                      type,
                      vehicleTypeLabels[type],
                    ]),
                  ])}
                  value={form.vehicleType}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setForm({ ...form, vehicleType: value as VehicleType });
                    }
                  }}
                >
                  <SelectTrigger id="vehicle-type-form">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {vehicleTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(capacityError)}>
                <FieldLabel htmlFor="vehicle-capacity">
                  Capacidad (toneladas)
                </FieldLabel>
                <Input
                  id="vehicle-capacity"
                  type="number"
                  min="0.01"
                  max={MAX_DECIMAL_10_2}
                  step="0.01"
                  value={form.capacity}
                  onChange={(event) => {
                    setForm({ ...form, capacity: event.target.value });
                    setCapacityError(null);
                    setFormError(null);
                  }}
                  required
                  aria-invalid={Boolean(capacityError)}
                  aria-describedby={
                    capacityError ? "vehicle-capacity-error" : undefined
                  }
                />
                <FieldError id="vehicle-capacity-error">
                  {capacityError}
                </FieldError>
                <FieldDescription>
                  Capacidad operativa declarada, en toneladas. Admite hasta dos
                  decimales.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="vehicle-form">
              Guardar vehículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
