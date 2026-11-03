"use client";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { TableCaption } from "@/components/ui/table";

import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogPager } from "@/components/catalog/catalog-pager";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const NO_VEHICLES: Vehicle[] = [];

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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");
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

  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 760px)")
        : null;
    const updateSheetSide = () =>
      setSheetSide(media?.matches ? "bottom" : "right");
    updateSheetSide();
    if (!media) return;
    media.addEventListener("change", updateSheetSide);
    return () => media.removeEventListener("change", updateSheetSide);
  }, []);

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

  const columns: DataTableColumn<Vehicle>[] = [
    {
      id: "plate",
      header: "Patente",
      enableSorting: false,
      meta: {
        label: "Patente",
        rowHeader: true,
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const vehicle = row.original;
        return (
          <>
            <Button
              type="button"
              variant="link"
              aria-label={`Ver detalle del vehículo ${vehicle.plate}`}
              onClick={() => setSelectedVehicle(vehicle)}
              className="h-auto min-h-0 justify-start p-0 text-left font-semibold text-foreground no-underline after:absolute after:inset-0 after:z-10 after:content-[''] active:not-aria-[haspopup]:translate-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] max-[760px]:focus-visible:after:rounded-2xl"
            >
              {vehicle.plate}
            </Button>
          </>
        );
      },
    },
    {
      id: "type",
      header: "Tipo",
      enableSorting: false,
      meta: {
        label: "Tipo",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const vehicle = row.original;
        return <>{vehicleTypeLabels[vehicle.vehicleType]}</>;
      },
    },
    {
      id: "capacity",
      header: "Capacidad (t)",
      enableSorting: false,
      meta: {
        label: "Capacidad (t)",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const vehicle = row.original;
        return (
          <>
            {vehicle.capacity === null
              ? "—"
              : `${vehicle.capacity.toLocaleString("es-AR")} t`}
          </>
        );
      },
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      meta: {
        label: "Estado",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const vehicle = row.original;
        return (
          <>
            <Badge variant={vehicle.active ? "success" : "secondary"}>
              {vehicle.active ? <Check aria-hidden /> : <X aria-hidden />}
              {vehicle.active ? "Activo" : "Inactivo"}
            </Badge>
          </>
        );
      },
    },
    {
      id: "detail",
      header: () => <span className="sr-only">Ver detalle</span>,
      enableSorting: false,
      meta: {
        label: "",
        ariaHidden: true,
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal text-right",
      },
      cell: () => {
        return (
          <>
            <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </>
        );
      },
    },
  ];

  const table = useDataTable({
    data: state.status === "ready" ? state.vehicles : NO_VEHICLES,
    columns,
    getRowId: (item) => item.id,
  });

  return (
    <section
      aria-labelledby="vehicles-title"
      className={`${styles.resourcePanel} max-[760px]:pb-[calc(6rem+env(safe-area-inset-bottom))]`}
    >
      <CatalogPageHeader
        title="Vehículos"
        titleId="vehicles-title"
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
          <FieldGroup className="grid max-w-full gap-3 md:w-fit md:grid-cols-[repeat(2,minmax(0,20rem))]">
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
                <SelectTrigger id="vehicle-active-filter" className="bg-card">
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
                <SelectTrigger id="vehicle-type-filter" className="bg-card">
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

      {state.status === "loading" ? <LoadingRegion label="Listado de vehículos"><TableRowsSkeleton rowCount={5} rowHeight="" columnWidths={["w-24","w-28","w-16","w-16","w-4"]} columnLabels={["Patente","Tipo","Capacidad (t)","Estado","Ver detalle"]} actionColumn actionCount={1} className={styles.tableWrap} tableClassName={`${styles.table} leading-[inherit]`} /></LoadingRegion> : null}
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
          <DataTable
            table={table}
            container={false}
            className={`${styles.table} leading-[inherit]`}
            headerClassName=" [&_tr]:border-b-0"
            bodyClassName=""
            rowProps={() => ({
              className:
                "group relative cursor-pointer transition-colors hover:bg-muted/40 border-b-0",
            })}
          >
            <TableCaption className="sr-only">
              Vehículos registrados
            </TableCaption>
          </DataTable>
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

      <Sheet
        open={selectedVehicle !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedVehicle(null);
        }}
      >
        {selectedVehicle ? (
          <SheetContent
            side={sheetSide}
            className={
              sheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader className="border-b border-border pr-12 pb-4">
              <SheetTitle>Detalle de vehículo</SheetTitle>
            </SheetHeader>
            <dl className="grid gap-4 px-4 pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Patente</dt>
                <dd className="font-semibold">{selectedVehicle.plate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tipo</dt>
                <dd>{vehicleTypeLabels[selectedVehicle.vehicleType]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Capacidad</dt>
                <dd>
                  {selectedVehicle.capacity === null
                    ? "Sin capacidad informada"
                    : `${selectedVehicle.capacity.toLocaleString("es-AR")} t`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estado</dt>
                <dd>{selectedVehicle.active ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
            {canManage ? (
              <SheetFooter className="border-t border-border pt-4">
                <section aria-label="Acciones del vehículo" className="grid gap-2">
                  <h3 className="text-sm font-semibold">Acciones disponibles</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-card"
                    onClick={() => {
                      const vehicle = selectedVehicle;
                      setSelectedVehicle(null);
                      openEdit(vehicle);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                  {selectedVehicle.active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => {
                        const vehicle = selectedVehicle;
                        setSelectedVehicle(null);
                        deactivate(vehicle);
                      }}
                    >
                      <Trash2 data-icon="inline-start" aria-hidden />
                      Dar de baja
                    </Button>
                  ) : null}
                </section>
              </SheetFooter>
            ) : null}
          </SheetContent>
        ) : null}
      </Sheet>

      <CatalogDeactivationDialog
        open={Boolean(deactivatingVehicle)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingVehicle(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del vehículo ${deactivatingVehicle?.plate ?? ""}`.trim()}
        consequence="El vehículo quedará inactivo."
        confirmAction="Dar de baja"
        safeAlternative="Conservar vehículo"
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
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form
            className="-mx-1 -my-1 min-h-0 overflow-y-auto px-1 py-1"
            id="vehicle-form"
            onSubmit={(event) => void save(event)}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(plateError)}>
                <FieldLabel htmlFor="vehicle-plate">Patente</FieldLabel>
                <Input
                  id="vehicle-plate"
                  className="bg-card"
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
                  <SelectTrigger id="vehicle-type-form" className="bg-card">
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
                  className="bg-card"
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
                  En toneladas
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
