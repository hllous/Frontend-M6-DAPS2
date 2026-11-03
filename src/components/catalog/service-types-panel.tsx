"use client";
import { LoadingRegion } from "@/components/ui/loading-region";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
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
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./catalog-panel.module.css";

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

const tableColumnClasses = [
  "w-[16%]",
  "w-[30%]",
  "w-[18%]",
  "w-[10%]",
  "w-[10%]",
  "w-[10%]",
  "w-[6%]",
] as const;

const initialCreate = {
  code: "",
  name: "",
  category: "WASTE_COLLECTION" as ServiceTypeCategory,
  mode: "ROUTE" as ServiceTypeMode,
  requiresVehicle: true,
};

type LoadState =
  | { status: "loading"; rowCount: number }
  | { status: "ready"; items: ServiceType[] }
  | { status: "error"; message: string };

const EMPTY_ITEMS: ServiceType[] = [];
const COLUMNS: DataTableColumn<ServiceType>[] = [{ accessorKey: "code", enableSorting: false }, { accessorKey: "name", enableSorting: false }, { accessorKey: "category", enableSorting: false }, { accessorKey: "mode", enableSorting: false }, { accessorKey: "requiresVehicle", enableSorting: false }, { accessorKey: "active", enableSorting: false }];

export function ServiceTypesPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("serviceType:manage");
  const [state, setState] = useState<LoadState>({
    status: "loading",
    rowCount: 5,
  });
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [category, setCategory] = useState<ServiceTypeCategory | "">("");
  const [mode, setMode] = useState<ServiceTypeMode | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(initialCreate);
  const [selectedItem, setSelectedItem] = useState<ServiceType | null>(null);
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<ServiceType | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestServiceTypes() {
      setState((previous) => ({
        status: "loading",
        rowCount:
          previous.status === "ready"
            ? previous.items.length
            : previous.status === "loading"
              ? previous.rowCount
              : 5,
      }));
      try {
        const result = await serviceTypesAdapter.list({
          search: search || undefined,
          active: active === "all" ? undefined : active === "true",
          category: category || undefined,
          mode: mode || undefined,
        });
        if (isCurrent)
          setState({ status: "ready", items: result.serviceTypes });
      } catch (error) {
        if (isCurrent)
          setState({
            status: "error",
            message: getErrorMessage(
              error,
              "No se pudieron cargar los tipos de servicio.",
            ),
          });
      }
    }
    void requestServiceTypes();
    return () => {
      isCurrent = false;
    };
  }, [active, category, mode, requestVersion, search]);

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

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreateError(null);
    try {
      await serviceTypesAdapter.create(createDraft);
      setCreateDraft(initialCreate);
      setShowCreate(false);
      notifySuccess("Tipo de servicio creado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo crear el tipo de servicio.",
      );
      setCreateError(errorMessage);
    }
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setEditError(null);
    try {
      await serviceTypesAdapter.update(editing.id, {
        name: editing.name,
        requiresVehicle: editing.requiresVehicle,
        active: editing.active,
      });
      setEditOpen(false);
      notifySuccess("Tipo de servicio actualizado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo actualizar el tipo de servicio.",
      );
      setEditError(errorMessage);
    }
  };

  const deactivate = (item: ServiceType) => {
    setDeactivating(item);
    setDeactivateError(null);
  };

  const confirmDeactivation = async () => {
    if (!deactivating) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await serviceTypesAdapter.remove(deactivating.id);
      setDeactivating(null);
      notifySuccess(
        "Tipo de servicio dado de baja.",
      );
      setRequestVersion((version) => version + 1);
    } catch (error) {
      setDeactivateError(
        error instanceof ServiceTypeRequestError
          ? error.message
          : "No se pudo dar de baja el tipo de servicio.",
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  const table = useDataTable({
    data: state.status === "ready" ? state.items : EMPTY_ITEMS,
    columns: COLUMNS,
    getRowId: (item) => item.id,
  });

  return (
    <section
      aria-labelledby="service-types-title"
      className="flex flex-col gap-6 max-[760px]:pb-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <CatalogPageHeader
        title="Tipos de servicio"
        titleId="service-types-title"
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setEditOpen(false);
              }}
            >
              Nuevo tipo de servicio
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <Alert role="status">
          <AlertDescription>
            Solo consulta
          </AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={showCreate && canManage} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alta de tipo de servicio</DialogTitle>
            <DialogDescription>
                No se pueden cambiar después.
              </DialogDescription>
          </DialogHeader>
          <form
            id="service-type-create-form"
            className="-mx-1 -my-1 min-h-0 overflow-y-auto px-1 py-1"
            onSubmit={submitCreate}
          >
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(createError)}>
                  <FieldLabel htmlFor="service-type-code">Código</FieldLabel>
                  <Input
                    id="service-type-code"
                    className="bg-card"
                    required
                    value={createDraft.code}
                    aria-invalid={Boolean(createError)}
                    aria-describedby={
                      createError ? "service-type-code-error" : undefined
                    }
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        code: event.target.value,
                      })
                    }
                  />
                  <FieldError id="service-type-code-error">
                    {createError}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-type-name">Nombre</FieldLabel>
                  <Input
                    id="service-type-name"
                    className="bg-card"
                    required
                    value={createDraft.name}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-type-category">
                    Categoría
                  </FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...categories.map((item) => [item.value, item.label]),
                    ])}
                    value={createDraft.category}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed =
                          serviceTypeCategorySchema.safeParse(value);
                        if (parsed.success)
                          setCreateDraft({
                            ...createDraft,
                            category: parsed.data,
                          });
                      }
                    }}
                  >
                    <SelectTrigger id="service-type-category" className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categories.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-type-mode">Modo</FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...modes.map((item) => [item.value, item.label]),
                    ])}
                    value={createDraft.mode}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed = serviceTypeModeSchema.safeParse(value);
                        if (parsed.success)
                          setCreateDraft({ ...createDraft, mode: parsed.data });
                      }
                    }}
                  >
                    <SelectTrigger id="service-type-mode" className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {modes.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field orientation="horizontal" className="md:col-span-2">
                  <Checkbox
                    id="service-types-panel-requires-vehicle-create"
                    checked={createDraft.requiresVehicle}
                    onCheckedChange={(checked) =>
                      setCreateDraft({
                        ...createDraft,
                        requiresVehicle: checked,
                      })
                    }
                  />
                  <FieldLabel htmlFor="service-types-panel-requires-vehicle-create">
                    Requiere vehículo
                  </FieldLabel>
                </Field>
              </FieldGroup>
          </form>
          <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" form="service-type-create-form">Crear tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent>
          <FieldGroup className="grid max-w-full gap-3 md:w-fit md:grid-cols-[repeat(3,minmax(0,18rem))]">
            <Field>
              <FieldLabel htmlFor="service-types-panel-filter-1">
                Buscar
              </FieldLabel>
              <Input
                id="service-types-panel-filter-1"
                className="bg-card"
                aria-label="Buscar tipos de servicio"
                placeholder="Código o nombre"
                value={search}
                maxLength={MAX_SEARCH_LENGTH}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="service-types-panel-filter-2">
                Estado
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos"],
                  ["true", "Activos"],
                  ["false", "Inactivos"],
                ])}
                value={active}
                onValueChange={(value) => {
                  if (value !== null) {
                    setActive(value);
                  }
                }}
              >
                <SelectTrigger
                  id="service-types-panel-filter-2"
                  aria-label="Filtrar por estado"
                  className="bg-card"
                >
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
              <FieldLabel htmlFor="service-types-panel-filter-3">
                Categoría
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todas"],
                  ...categories.map((item) => [item.value, item.label]),
                ])}
                value={category}
                onValueChange={(value) => {
                  if (value !== null) {
                    setCategory(value as ServiceTypeCategory | "");
                  }
                }}
              >
                <SelectTrigger
                  id="service-types-panel-filter-3"
                  aria-label="Filtrar por categoría"
                  className="bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todas</SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="service-types-panel-filter-4">
                Modo
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...modes.map((item) => [item.value, item.label]),
                ])}
                value={mode}
                onValueChange={(value) => {
                  if (value !== null) {
                    setMode(value as ServiceTypeMode | "");
                  }
                }}
              >
                <SelectTrigger
                  id="service-types-panel-filter-4"
                  aria-label="Filtrar por modo"
                  className="bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {modes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {state.status === "loading" ? <LoadingRegion label="Listado de tipos de servicio"><TableRowsSkeleton rowCount={state.rowCount} rowHeight="" columnClasses={tableColumnClasses} columnWidths={["w-16", "w-40", "w-28", "w-20", "w-8", "w-12", "w-4"]} columnLabels={["Código", "Nombre", "Categoría", "Modo", "Vehículo", "Estado", "Ver detalle"]} className={styles.tableWrap} tableClassName={`${styles.table} min-[761px]:table-fixed`} /></LoadingRegion> : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                Reintentar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin tipos de servicio</EmptyTitle>
            <EmptyDescription>
              No hay resultados para los filtros seleccionados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <div className={styles.tableWrap}>
          <DataTable
            table={table}
            container={false}
            className={`${styles.table} min-[761px]:table-fixed leading-[inherit]`}
            renderHeader={() => (<thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Modo</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Ver detalle</span></th>
              </tr>
            </thead>)}
            renderRow={(row) => {
              const item = row.original;
              return (<tr key={item.id} className="group relative cursor-pointer transition-colors hover:bg-muted/40">
                <th scope="row" data-label="Código">
                  <Button
                    type="button"
                    variant="link"
                    aria-label={`Ver detalle del tipo de servicio ${item.code}`}
                    onClick={() => setSelectedItem(item)}
                    className="h-auto min-h-0 justify-start p-0 text-left font-semibold text-foreground no-underline after:absolute after:inset-0 after:z-10 after:content-[''] active:not-aria-[haspopup]:translate-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] max-[760px]:focus-visible:after:rounded-2xl"
                  >
                    {item.code}
                  </Button>
                </th>
                <td data-label="Nombre">{item.name}</td>
                <td data-label="Categoría">{categories.find((option) => option.value === item.category)?.label ?? item.category}</td>
                <td data-label="Modo">{item.mode === "ROUTE" ? "Recorrido" : "Punto"}</td>
                <td data-label="Vehículo">{item.requiresVehicle ? "Sí" : "No"}</td>
                <td data-label="Estado">{item.active ? "Activo" : "Inactivo"}</td>
                <td data-label="" aria-hidden="true" className="text-right">
                  <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </td>
              </tr>);
            }}
          >
            <caption className="sr-only">Tipos de servicio</caption>
            <colgroup>{tableColumnClasses.map((width, column) => <col key={column} className={width} />)}</colgroup>
          </DataTable>
        </div>
      ) : null}

      <Sheet
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        {selectedItem ? (
          <SheetContent
            side={sheetSide}
            className={
              sheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader className="border-b border-border pr-12 pb-4">
              <SheetTitle>Detalle del tipo de servicio</SheetTitle>
            </SheetHeader>
            <dl className="grid gap-4 px-4 pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Código</dt>
                <dd className="font-semibold">{selectedItem.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Nombre</dt>
                <dd>{selectedItem.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Categoría</dt>
                <dd>
                  {categories.find((option) => option.value === selectedItem.category)?.label ?? selectedItem.category}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Modo</dt>
                <dd>{selectedItem.mode === "ROUTE" ? "Recorrido" : "Punto"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Vehículo</dt>
                <dd>{selectedItem.requiresVehicle ? "Sí" : "No"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estado</dt>
                <dd>{selectedItem.active ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
            {canManage ? (
              <SheetFooter className="border-t border-border pt-4">
                <section aria-label="Acciones del tipo de servicio" className="grid gap-2">
                  <h3 className="text-sm font-semibold">Acciones disponibles</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-card"
                    onClick={() => {
                      const item = selectedItem;
                      setSelectedItem(null);
                      setEditing(item);
                      setEditOpen(true);
                      setShowCreate(false);
                      setEditError(null);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                  {selectedItem.active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => {
                        const item = selectedItem;
                        setSelectedItem(null);
                        deactivate(item);
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

      <Dialog open={editOpen && canManage} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          {editing ? (
            <>
          <DialogHeader>
            <DialogTitle>Editar tipo de servicio</DialogTitle>
            <DialogDescription>
                No se pueden cambiar después.
              </DialogDescription>
          </DialogHeader>
          <form
            id="service-type-edit-form"
            className="-mx-1 -my-1 min-h-0 overflow-y-auto px-1 py-1"
            onSubmit={submitEdit}
          >
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-service-type-code">
                    Código
                  </FieldLabel>
                  <Input
                    id="edit-service-type-code"
                    value={editing.code}
                    readOnly
                    aria-readonly="true"
                  />
                </Field>
                <Field data-invalid={Boolean(editError)}>
                  <FieldLabel htmlFor="edit-service-type-name">
                    Nombre
                  </FieldLabel>
                  <Input
                    id="edit-service-type-name"
                    className="bg-card"
                    required
                    value={editing.name}
                    aria-invalid={Boolean(editError)}
                    aria-describedby={
                      editError ? "edit-service-type-name-error" : undefined
                    }
                    onChange={(event) =>
                      setEditing({ ...editing, name: event.target.value })
                    }
                  />
                  <FieldError id="edit-service-type-name-error">
                    {editError}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-service-type-category">
                    Categoría
                  </FieldLabel>
                  <Input
                    id="edit-service-type-category"
                    value={
                      categories.find((item) => item.value === editing.category)
                        ?.label ?? editing.category
                    }
                    readOnly
                    aria-readonly="true"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-service-type-mode">Modo</FieldLabel>
                  <Input
                    id="edit-service-type-mode"
                    value={editing.mode === "ROUTE" ? "Recorrido" : "Punto"}
                    readOnly
                    aria-readonly="true"
                  />
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="service-types-panel-requires-vehicle-edit"
                    checked={editing.requiresVehicle}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, requiresVehicle: checked })
                    }
                  />
                  <FieldLabel htmlFor="service-types-panel-requires-vehicle-edit">
                    Requiere vehículo
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="service-types-panel-active-edit"
                    checked={editing.active}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, active: checked })
                    }
                  />
                  <FieldLabel htmlFor="service-types-panel-active-edit">
                    Activo
                  </FieldLabel>
                </Field>
              </FieldGroup>
          </form>
          <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" form="service-type-edit-form">Guardar cambios</Button>
          </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <CatalogDeactivationDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del tipo de servicio ${deactivating?.code ?? ""}`.trim()}
        consequence="El tipo de servicio quedará inactivo. Los servicios existentes conservarán la configuración con la que se crearon."
        confirmAction="Dar de baja"
        safeAlternative="Conservar tipo"
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>
    </section>
  );
}
