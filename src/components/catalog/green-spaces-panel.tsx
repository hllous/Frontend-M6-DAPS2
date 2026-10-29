"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

import { CatalogPager } from "@/components/catalog/catalog-pager";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCaption } from "@/components/ui/table";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  greenSpacesAdapter,
  greenSpaceTypeSchema,
  type GreenSpace,
  type GreenSpaceQuery,
  type GreenSpaceType,
} from "@/lib/green-spaces";
import { zoneLabel, zonesAdapter, type Zone } from "@/lib/zones";
import type { OperationalScenario } from "@/lib/scenarios";
import { MAX_DECIMAL_10_2 } from "@/lib/input-limits";

import styles from "./catalog-panel.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      greenSpaces: GreenSpace[];
      total: number;
      totalPages: number;
    };

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
const emptyForm: GreenSpaceForm = {
  name: "",
  spaceType: "SQUARE",
  areaM2: "",
  zoneId: "",
};

const SPACE_HEAD = "h-auto whitespace-normal font-bold";
const SPACE_CELL = "h-auto whitespace-normal";
const NO_SPACES: GreenSpace[] = [];

export function GreenSpacesPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  // greenSpace:manage is a frontend hypothesis until M1 publishes the role/capability mapping.
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("greenSpace:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<GreenSpaceType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GreenSpace | null>(null);
  const [detailGreenSpace, setDetailGreenSpace] = useState<GreenSpace | null>(
    null,
  );
  const [detailSheetSide, setDetailSheetSide] = useState<"right" | "bottom">(
    "right",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<GreenSpaceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<GreenSpace | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 760px)");
    const updateSide = () =>
      setDetailSheetSide(media.matches ? "bottom" : "right");
    updateSide();
    media.addEventListener("change", updateSide);
    return () => media.removeEventListener("change", updateSide);
  }, []);

  const query = useMemo<GreenSpaceQuery>(
    () => ({
      active: activeFilter === "all" ? undefined : activeFilter === "true",
      spaceType: typeFilter === "all" ? undefined : typeFilter,
      zoneId: zoneFilter === "all" ? undefined : zoneFilter,
    }),
    [activeFilter, typeFilter, zoneFilter],
  );

  useEffect(() => {
    let isCurrent = true;
    void zonesAdapter
      .list({ pageSize: 100 })
      .then((page) => {
        if (isCurrent) setZones(page.zones);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setZonesLoaded(true);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function requestGreenSpaces() {
      setState({ status: "loading" });
      try {
        const result = await greenSpacesAdapter.list({
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
          greenSpaces: result.greenSpaces,
          total: result.total,
          totalPages: result.totalPages,
        });
      } catch (caught) {
        if (isCurrent)
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar los espacios verdes.",
            ),
          });
      }
    }
    void requestGreenSpaces();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion, page]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, zoneId: zones[0]?.id ?? "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(greenSpace: GreenSpace) {
    setEditing(greenSpace);
    setForm({
      name: greenSpace.name,
      spaceType: greenSpace.spaceType,
      areaM2: greenSpace.areaM2 === null ? "" : String(greenSpace.areaM2),
      zoneId: greenSpace.zoneId,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openDetail(greenSpace: GreenSpace) {
    setDetailGreenSpace(greenSpace);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const areaM2 = Number(form.areaM2);
    if (
      !form.name.trim() ||
      !Number.isFinite(areaM2) ||
      areaM2 <= 0 ||
      !form.zoneId
    ) {
      setFormError("Indique nombre, una superficie mayor que cero y una zona.");
      return;
    }
    if (areaM2 > MAX_DECIMAL_10_2) {
      setFormError(
        `La superficie no puede superar ${MAX_DECIMAL_10_2.toLocaleString("es-AR")} m².`,
      );
      return;
    }
    try {
      const payload = { name: form.name.trim(), areaM2, zoneId: form.zoneId };
      if (editing) await greenSpacesAdapter.update(editing.id, payload);
      else
        await greenSpacesAdapter.create({
          ...payload,
          spaceType: form.spaceType,
        });
      setFormOpen(false);
      setNotice(
        editing ? "Espacio verde actualizado." : "Espacio verde registrado.",
      );
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(
        errorMessage(caught, "No se pudo guardar el espacio verde."),
      );
    }
  }

  function deactivate(greenSpace: GreenSpace) {
    setDeactivating(greenSpace);
    setDeactivateError(null);
  }

  async function confirmDeactivation() {
    if (!deactivating) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await greenSpacesAdapter.remove(deactivating.id);
      setDeactivating(null);
      setNotice(`Espacio verde ${deactivating.name} dado de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(
        errorMessage(caught, "No se pudo dar de baja el espacio verde."),
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  const spaceColumns: DataTableColumn<GreenSpace>[] = [
    { id: "name", header: "Nombre", accessorFn: (g) => g.name, enableSorting: false, meta: { rowHeader: true, headClassName: SPACE_HEAD, cellClassName: SPACE_CELL }, cell: ({ row }) => { const greenSpace = row.original; return (
      <Button type="button" variant="ghost" size="sm" aria-label={`Ver detalle de ${greenSpace.name}`} onClick={() => openDetail(greenSpace)} className="min-w-0 justify-start px-0 font-semibold text-foreground hover:bg-transparent hover:text-foreground after:absolute after:inset-0 after:z-10 after:cursor-pointer focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] active:not-aria-[haspopup]:translate-none">
        {greenSpace.name}
        <ChevronRight data-icon="inline-end" aria-hidden className="hidden max-[760px]:inline" />
      </Button>); } },
    { id: "type", header: "Tipo", accessorFn: (g) => g.spaceType, enableSorting: false, meta: { headClassName: SPACE_HEAD, cellClassName: SPACE_CELL }, cell: ({ row }) => spaceTypeLabels[row.original.spaceType] },
    { id: "area", header: "Superficie", accessorFn: (g) => g.areaM2, enableSorting: false, meta: { headClassName: SPACE_HEAD, cellClassName: SPACE_CELL }, cell: ({ row }) => row.original.areaM2 === null ? "—" : `${row.original.areaM2.toLocaleString("es-AR")} m²` },
    { id: "zone", header: "Zona", accessorFn: (g) => g.zoneId, enableSorting: false, meta: { headClassName: SPACE_HEAD, cellClassName: SPACE_CELL }, cell: ({ row }) => zoneLabel(zones, row.original.zoneId, zonesLoaded) },
    { id: "status", header: "Estado", accessorFn: (g) => g.active, enableSorting: false, meta: { headClassName: SPACE_HEAD, cellClassName: SPACE_CELL }, cell: ({ row }) => { const greenSpace = row.original; return <span className="inline-flex items-center gap-1">{greenSpace.active ? <Check aria-hidden className="size-4 text-[var(--color-success)]" /> : <X aria-hidden className="size-4 text-muted-foreground" />}{greenSpace.active ? "Activo" : "Inactivo"}</span>; } },
    { id: "detail", header: () => <span className="sr-only">Abrir detalle</span>, enableSorting: false, meta: { headClassName: SPACE_HEAD, cellClassName: `${styles.rowChevron} ${SPACE_CELL} px-4 py-3` }, cell: () => <span aria-hidden="true"><ChevronRight className="ml-auto size-4 text-muted-foreground" /></span> },
  ];
  const spaceTable = useDataTable({ data: state.status === "ready" ? state.greenSpaces : NO_SPACES, columns: spaceColumns, getRowId: (g) => g.id });

  return (
    <section
      aria-labelledby="green-spaces-title"
      className="flex flex-col gap-5"
    >
      <CatalogPageHeader
        section="inventory"
        title="Espacios verdes"
        titleId="green-spaces-title"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar espacio verde
            </Button>
          ) : null
        }
      />

      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3"
        aria-label="Filtros de espacios verdes"
      >
        <Field>
          <FieldLabel htmlFor="green-space-active-filter">Estado</FieldLabel>
          <Select
            items={{ all: "Todos", true: "Activos", false: "Inactivos" }}
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter((value ?? "") as typeof activeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-active-filter">
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
          <FieldLabel htmlFor="green-space-type-filter">
            Tipo de espacio
          </FieldLabel>
          <Select
            items={{ all: "Todos los tipos", ...spaceTypeLabels }}
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter((value ?? "") as GreenSpaceType | "all");
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {spaceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {spaceTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="green-space-zone-filter">Zona</FieldLabel>
          <Select
            items={{
              all: "Todas las zonas",
              ...Object.fromEntries(
                zones.map((zone) => [zone.id, zone.name]),
              ),
            }}
            value={zoneFilter}
            onValueChange={(value) => {
              setZoneFilter(value ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-zone-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {state.status === "loading" ? (
        <p
          aria-label="Cargando espacios verdes"
          className="text-sm text-muted-foreground"
        >
          Cargando espacios verdes…
        </p>
      ) : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <Button
              variant="outline"
              onClick={() => setRequestVersion((version) => version + 1)}
            >
              Reintentar carga
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.greenSpaces.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              No hay espacios verdes que coincidan con los filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.greenSpaces.length > 0 ? (
        <div className={styles.tableWrap}>
          <DataTable
            table={spaceTable}
            headerClassName="[&_tr]:border-b-0"
            container={false}
            className={`${styles.table} leading-[inherit]`}
            rowProps={() => ({ className: `${styles.catalogRow} border-b-0 hover:bg-transparent` })}
          ><TableCaption className="sr-only">Espacios verdes registrados</TableCaption></DataTable>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <CatalogPager
          page={page}
          pageSize={20}
          total={state.total}
          totalPages={state.totalPages}
          onPageChange={setPage}
          label="Paginación de espacios verdes"
        />
      ) : null}

      <CatalogDeactivationDialog
        contentClassName="overflow-y-auto"
        footerClassName="flex-col items-stretch [&>button]:whitespace-normal"
        open={Boolean(deactivating)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del espacio verde ${deactivating?.name ?? ""}`.trim()}
        consequence="El espacio verde quedará inactivo."
        confirmAction={`Dar de baja el espacio verde ${deactivating?.name ?? ""}`.trim()}
        safeAlternative={`Conservar el espacio verde ${deactivating?.name ?? ""}`.trim()}
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>

      <Sheet
        open={Boolean(detailGreenSpace)}
        onOpenChange={(open) => !open && setDetailGreenSpace(null)}
      >
        {detailGreenSpace ? (
          <SheetContent
            side={detailSheetSide}
            className={
              detailSheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader>
              <SheetTitle>Detalle del espacio verde</SheetTitle>
            </SheetHeader>
            <dl className="grid gap-4 px-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre
                </dt>
                <dd className="mt-0.5 font-medium">{detailGreenSpace.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo
                </dt>
                <dd className="mt-0.5">{spaceTypeLabels[detailGreenSpace.spaceType]}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Superficie
                </dt>
                <dd className="mt-0.5">
                  {detailGreenSpace.areaM2 === null
                    ? "Sin registrar"
                    : `${detailGreenSpace.areaM2.toLocaleString("es-AR")} m²`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Zona operativa
                </dt>
                <dd className="mt-0.5">
                  {zoneLabel(zones, detailGreenSpace.zoneId, zonesLoaded)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado
                </dt>
                <dd className="mt-0.5">
                  {detailGreenSpace.active ? "Activo" : "Inactivo"}
                </dd>
              </div>
            </dl>
            <SheetFooter className="gap-4 pt-0">
              {canManage ? (
                <section aria-label="Gestión" className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Gestión
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const target = detailGreenSpace;
                      setDetailGreenSpace(null);
                      openEdit(target);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                </section>
              ) : null}
              {canManage && detailGreenSpace.active ? (
                <section aria-label="Destructivas" className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Destructivas
                  </h3>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      const target = detailGreenSpace;
                      setDetailGreenSpace(null);
                      deactivate(target);
                    }}
                  >
                    <Trash2 data-icon="inline-start" aria-hidden />
                    Dar de baja
                  </Button>
                </section>
              ) : null}
            </SheetFooter>
          </SheetContent>
        ) : null}
      </Sheet>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar espacio verde" : "Registrar espacio verde"}
            </DialogTitle>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form id="green-space-form" onSubmit={(event) => void save(event)}>
            <FieldGroup>
              <Field data-invalid={Boolean(formError)}>
                <FieldLabel htmlFor="green-space-name">Nombre</FieldLabel>
                <Input
                  id="green-space-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                  aria-invalid={Boolean(formError)}
                  aria-describedby={
                    formError ? "green-space-name-error" : undefined
                  }
                />
                <FieldError id="green-space-name-error" role="none">
                  {formError}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-type-form">
                  Tipo de espacio en el formulario
                </FieldLabel>
                <Select
                  items={spaceTypeLabels}
                  value={form.spaceType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      spaceType: (value ?? "") as GreenSpaceType,
                    })
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger
                    id="green-space-type-form"
                    aria-describedby={
                      editing ? "green-space-type-locked" : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {spaceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {spaceTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {editing ? (
                  <FieldDescription id="green-space-type-locked">
                    No se puede cambiar después.
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-area">
                  Superficie (m²)
                </FieldLabel>
                <Input
                  id="green-space-area"
                  type="number"
                  min="0.01"
                  max={MAX_DECIMAL_10_2}
                  step="0.01"
                  value={form.areaM2}
                  onChange={(event) =>
                    setForm({ ...form, areaM2: event.target.value })
                  }
                  required
                />
                <FieldDescription>
                  En m²
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-zone-form">
                  Zona en el formulario
                </FieldLabel>
                <Select
                  items={Object.fromEntries(
                    zones.map((zone) => [
                      zone.id,
                      zone.name,
                    ]),
                  )}
                  value={form.zoneId}
                  onValueChange={(value) =>
                    setForm({ ...form, zoneId: value ?? "" })
                  }
                  required
                >
                  <SelectTrigger
                    id="green-space-zone-form"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
            <Button type="submit" form="green-space-form">
              Guardar espacio verde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
