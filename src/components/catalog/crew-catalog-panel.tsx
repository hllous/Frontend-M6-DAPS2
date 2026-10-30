"use client";
import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { TableCaption } from "@/components/ui/table";

import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

import { CatalogPager } from "@/components/catalog/catalog-pager";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  crewsAdapter,
  crewSpecialtyLabel,
  crewSpecialtyLabels,
  crewSpecialtySchema,
  crewTypeSchema,
  shiftSchema,
  type Crew,
  type CrewQuery,
  type CrewSpecialty,
  type CrewType,
  type Shift,
} from "@/lib/crews";
import { sortZonesByCommune, zonesAdapter, type Zone } from "@/lib/zones";
import { m1IdentityAdapter, type M1IdentityReference } from "@/lib/m1-identity";

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
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./catalog-panel.module.css";

const crewTypes = crewTypeSchema.options;
const shifts = shiftSchema.options;
const specialties = crewSpecialtySchema.options;
const NO_ZONE = "none";
const crewTypeLabels: Record<CrewType, string> = {
  MUNICIPAL: "Municipal",
  COOPERATIVE: "Cooperativa",
  CONTRACTOR: "Contratista",
};
const shiftLabels: Record<Shift, string> = {
  MORNING: "Mañana",
  AFTERNOON: "Tarde",
  NIGHT: "Noche",
};
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; crews: Crew[]; total: number; totalPages: number };
type CrewForm = {
  name: string;
  crewType: CrewType;
  leaderUserId: string;
  organizationId: string;
  defaultShift: Shift;
  specialty: CrewSpecialty | "";
  homeZoneId: string;
};
const emptyForm: CrewForm = {
  name: "",
  crewType: "MUNICIPAL",
  leaderUserId: "",
  organizationId: "",
  defaultShift: "MORNING",
  specialty: "",
  homeZoneId: "",
};

const NO_CREWS: Crew[] = [];

export function CrewCatalogPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("crew:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<CrewType | "all">("all");
  const [shiftFilter, setShiftFilter] = useState<Shift | "all">("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<CrewSpecialty | "all">("all");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [users, setUsers] = useState<M1IdentityReference[]>([]);
  const [organizations, setOrganizations] = useState<M1IdentityReference[]>([]);
  const [selected, setSelected] = useState<Crew | null>(null);
  const [editing, setEditing] = useState<Crew | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CrewForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<Crew | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [memberSelection, setMemberSelection] = useState<string[]>([]);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");

  const query = useMemo<CrewQuery>(
    () => ({
      active: activeFilter === "all" ? undefined : activeFilter === "true",
      crewType: typeFilter === "all" ? undefined : typeFilter,
      defaultShift: shiftFilter === "all" ? undefined : shiftFilter,
      zoneId: zoneFilter === "all" ? undefined : zoneFilter,
      specialty: specialtyFilter === "all" ? undefined : specialtyFilter,
    }),
    [activeFilter, typeFilter, shiftFilter, zoneFilter, specialtyFilter],
  );

  useEffect(() => {
    let current = true;
    void Promise.all([
      m1IdentityAdapter.listUsers(),
      m1IdentityAdapter.listOrganizations(),
    ]).then(([nextUsers, nextOrganizations]) => {
      if (current) {
        setUsers(nextUsers);
        setOrganizations(nextOrganizations);
      }
    });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void zonesAdapter
      .list()
      .then((result) => {
        if (current) setZones(sortZonesByCommune(result.zones));
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setZonesLoaded(true);
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void crewsAdapter
      .list({ ...query, page, pageSize: 20 })
      .then((result) => {
        if (!current) return;
        if (page > Math.max(1, result.totalPages)) {
          setPage(Math.max(1, result.totalPages));
          return;
        }
        const crews =
          scenario.actor.kind === "FIELD" && scenario.actor.crewId
            ? result.crews.filter((crew) => crew.id === scenario.actor.crewId)
            : result.crews;
        if (current)
          setState({
            status: "ready",
            crews,
            total: result.total,
            totalPages: result.totalPages,
          });
      })
      .catch((caught: unknown) => {
        if (current)
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar las cuadrillas.",
            ),
          });
      });
    return () => {
      current = false;
    };
  }, [query, requestVersion, scenario, page]);

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

  const userName = (id: string | null, name: string | null) => id === null ? "—" : name?.trim() || `Usuario ${id}`;
  const organizationName = (id: string | null, name: string | null) => id === null ? "Sin organización externa" : name?.trim() || `Organización sin nombre (id ${id})`;
  const zoneName = (id: string | null) => {
    if (id === null) return "Sin zona";
    const zone = zones.find((candidate) => candidate.id === id);
    if (zone) return zone.name;
    return zonesLoaded ? id : "Cargando zona…";
  };
  const zoneItems = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]));
  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      leaderUserId: users[0]?.id ?? "",
      organizationId: organizations[0]?.id ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(crew: Crew) {
    setEditing(crew);
    setForm({
      name: crew.name,
      crewType: crew.crewType,
      leaderUserId: crew.leaderUserId ?? "",
      organizationId: crew.organizationId ?? "",
      defaultShift: crew.defaultShift,
      specialty: crew.specialty ?? "",
      homeZoneId: crew.homeZoneId ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.leaderUserId || !form.organizationId) {
      setFormError("Complete el nombre, responsable y organización.");
      return;
    }
    if (!editing && !form.specialty) {
      setFormError("La especialidad es obligatoria.");
      return;
    }
    try {
      if (editing)
        await crewsAdapter.update(editing.id, {
          name: form.name.trim(),
          leaderUserId: form.leaderUserId,
          organizationId: form.organizationId,
          defaultShift: form.defaultShift,
          specialty: form.specialty || undefined,
          homeZoneId: form.homeZoneId || null,
          active: editing.active,
        });
      else if (form.specialty)
        await crewsAdapter.create({
          name: form.name.trim(),
          crewType: form.crewType,
          leaderUserId: form.leaderUserId,
          organizationId: form.organizationId,
          defaultShift: form.defaultShift,
          specialty: form.specialty,
          homeZoneId: form.homeZoneId || undefined,
        });
      setFormOpen(false);
      notifySuccess(
        editing ? "Cuadrilla actualizada." : "Cuadrilla registrada.",
      );
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(errorMessage(caught, "No se pudo guardar la cuadrilla."));
    }
  }
  async function showDetail(crew: Crew) {
    try {
      setSelected(await crewsAdapter.get(crew.id));
      setMemberSelection([]);
      setMemberError(null);
      setMemberPickerOpen(false);
      setActionError(null);
    } catch (caught) {
      setActionError(errorMessage(caught, "No se pudo cargar el detalle."));
    }
  }
  async function addMembers(event: FormEvent) {
    event.preventDefault();
    if (!selected || memberSelection.length === 0) {
      setMemberError("Seleccione al menos un integrante.");
      return;
    }
    setMemberError(null);
    try {
      setSelected(await crewsAdapter.addMembers(selected.id, memberSelection.map((userId) => ({ userId, displayName: users.find((user) => user.id === userId)?.displayName }))));
      setMemberSelection([]);
      setMemberPickerOpen(false);
      notifySuccess("Integrantes agregados.");
    } catch (caught) {
      setMemberError(
        errorMessage(caught, "No se pudieron agregar los integrantes."),
      );
    }
  }
  async function removeMember(userId: string) {
    if (!selected) return;
    try {
      setSelected(await crewsAdapter.removeMember(selected.id, userId));
      notifySuccess("Integrante quitado.");
    } catch (caught) {
      setMemberError(errorMessage(caught, "No se pudo quitar el integrante."));
    }
  }
  function deactivate(crew: Crew) {
    setDeactivating(crew);
    setDeactivateError(null);
  }
  async function confirmDeactivation() {
    if (!deactivating) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await crewsAdapter.remove(deactivating.id);
      setDeactivating(null);
      notifySuccess(`Cuadrilla ${deactivating.name} dada de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(
        errorMessage(caught, "No se pudo dar de baja la cuadrilla."),
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  const columns: DataTableColumn<Crew>[] = [
    {
      id: "name",
      header: "Nombre",
      enableSorting: false,
      meta: {
        label: "Nombre",
        rowHeader: true,
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const crew = row.original;
        return (
          <>
            <Button
              type="button"
              variant="link"
              aria-label={`Ver detalle de ${crew.name}`}
              onClick={() => void showDetail(crew)}
              className="h-auto min-h-0 justify-start p-0 text-left font-semibold text-foreground no-underline after:absolute after:inset-0 after:z-10 after:content-[''] active:not-aria-[haspopup]:translate-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] max-[760px]:focus-visible:after:rounded-2xl"
            >
              {crew.name}
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
        const crew = row.original;
        return <>{crewTypeLabels[crew.crewType]}</>;
      },
    },
    {
      id: "specialty",
      header: "Especialidad",
      enableSorting: false,
      meta: {
        label: "Especialidad",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => <>{crewSpecialtyLabel(row.original.specialty)}</>,
    },
    {
      id: "zone",
      header: "Zona",
      enableSorting: false,
      meta: {
        label: "Zona",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => <>{zoneName(row.original.effectiveZoneId)}</>,
    },
    {
      id: "leader",
      header: "Responsable",
      enableSorting: false,
      meta: {
        label: "Responsable",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const crew = row.original;
        return <>{userName(crew.leaderUserId, crew.leaderName)}</>;
      },
    },
    {
      id: "organization",
      header: "Organización",
      enableSorting: false,
      meta: {
        label: "Organización",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const crew = row.original;
        return <>{organizationName(crew.organizationId, crew.organizationName)}</>;
      },
    },
    {
      id: "shift",
      header: "Turno",
      enableSorting: false,
      meta: {
        label: "Turno",
        headClassName: "h-auto whitespace-normal text-inherit font-bold",
        cellClassName: "h-auto whitespace-normal",
      },
      cell: ({ row }) => {
        const crew = row.original;
        return <>{shiftLabels[crew.defaultShift]}</>;
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
        const crew = row.original;
        return (
          <>
            <Badge variant={crew.active ? "success" : "secondary"}>
              {crew.active ? <Check aria-hidden /> : <X aria-hidden />}
              {crew.active ? "Activa" : "Inactiva"}
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
    data: state.status === "ready" ? state.crews : NO_CREWS,
    columns,
    getRowId: (item) => item.id,
  });

  return (
    <section
      aria-labelledby="crews-title"
      className={`${styles.resourcePanel} max-[760px]:pb-[calc(6rem+env(safe-area-inset-bottom))]`}
    >
      <CatalogPageHeader
        title="Cuadrillas"
        titleId="crews-title"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar cuadrilla
            </Button>
          ) : null
        }
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <Card aria-label="Filtros de cuadrillas">
        <CardContent>
          <FieldGroup className="grid max-w-full gap-3 md:w-fit md:grid-cols-[repeat(3,minmax(0,16rem))] lg:grid-cols-[repeat(5,minmax(0,14rem))]">
            <Field>
              <FieldLabel htmlFor="crew-active-filter">Estado</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos"],
                  ["true", "Activas"],
                  ["false", "Inactivas"],
                ])}
                value={activeFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setActiveFilter(value as typeof activeFilter);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="crew-active-filter" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Activas</SelectItem>
                    <SelectItem value="false">Inactivas</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="crew-type-filter">
                Tipo de cuadrilla
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos los tipos"],
                  ...crewTypes.map((type) => [type, crewTypeLabels[type]]),
                ])}
                value={typeFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setTypeFilter(value as CrewType | "all");
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="crew-type-filter" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {crewTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {crewTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="crew-shift-filter">Turno</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos los turnos"],
                  ...shifts.map((shift) => [shift, shiftLabels[shift]]),
                ])}
                value={shiftFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setShiftFilter(value as Shift | "all");
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="crew-shift-filter" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos los turnos</SelectItem>
                    {shifts.map((shift) => (
                      <SelectItem key={shift} value={shift}>
                        {shiftLabels[shift]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="crew-zone-filter">Zona</FieldLabel>
              <Select
                items={{ all: "Todas las zonas", ...zoneItems }}
                value={zoneFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setZoneFilter(value as never);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="crew-zone-filter" className="bg-card">
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
            <Field>
              <FieldLabel htmlFor="crew-specialty-filter">Especialidad</FieldLabel>
              <Select
                items={{ all: "Todas las especialidades", ...crewSpecialtyLabels }}
                value={specialtyFilter}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSpecialtyFilter(value as never);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger id="crew-specialty-filter" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas las especialidades</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {crewSpecialtyLabels[specialty]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      {state.status === "loading" ? <p className={styles.muted} aria-label="Cargando cuadrillas">Cargando cuadrillas…</p> : null}
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
      {state.status === "ready" && state.crews.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay cuadrillas que coincidan con los filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.crews.length > 0 ? (
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
              Cuadrillas registradas
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
          label="Paginación de cuadrillas"
        />
      ) : null}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected ? (
          <SheetContent
            side={sheetSide}
            className={
              sheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader className="border-b border-border pr-12 pb-4">
              <SheetTitle>Detalle de cuadrilla</SheetTitle>
            </SheetHeader>
            <div className="grid min-h-0 gap-4 overflow-y-auto px-4 pt-4 [scrollbar-gutter:stable]">
              <section aria-labelledby="crew-detail-name">
                <h3 id="crew-detail-name" className="font-semibold">
                  {selected.name}
                </h3>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Especialidad</dt>
                    <dd>{crewSpecialtyLabel(selected.specialty)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Zona base</dt>
                    <dd>{zoneName(selected.homeZoneId)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Zona vigente hoy</dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      {zoneName(selected.effectiveZoneId)}
                      {selected.effectiveZoneId !== selected.homeZoneId ? (
                        <Badge variant="secondary">Reubicada</Badge>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Responsable</dt>
                    <dd>{userName(selected.leaderUserId, selected.leaderName)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Organización</dt>
                    <dd>{organizationName(selected.organizationId, selected.organizationName)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Turno</dt>
                    <dd>{shiftLabels[selected.defaultShift]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Estado</dt>
                    <dd>{selected.active ? "Activa" : "Inactiva"}</dd>
                  </div>
                </dl>
              </section>
              <section aria-labelledby="crew-members-heading" className="grid gap-3">
                <h3 id="crew-members-heading" className="font-semibold">
                  Integrantes
                </h3>
                <ul
                  aria-label="Integrantes de la cuadrilla"
                  className="flex flex-col gap-2"
                >
                  {selected.members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center justify-between gap-2"
                    >
                      {userName(member.userId, member.displayName)}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Quitar a ${userName(member.userId, member.displayName)}`}
                          onClick={() => void removeMember(member.userId)}
                        >
                          <UserMinus data-icon="inline-start" aria-hidden />
                          Quitar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <form
                    className="flex flex-col gap-3 border-t border-border pt-4"
                    onSubmit={(event) => void addMembers(event)}
                  >
                    <Field data-invalid={Boolean(memberError)}>
                      <FieldLabel htmlFor="crew-members">
                        Agregar integrantes
                      </FieldLabel>
                      <FieldDescription>Los candidatos provienen de una lista de ejemplo de personas.</FieldDescription>
                      {users.every((user) => selected.memberUserIds.includes(user.id)) ? <FieldDescription>No hay integrantes disponibles para agregar.</FieldDescription> : null}
                      <CrewMemberMultiSelect
                        id="crew-members"
                        open={memberPickerOpen}
                        onOpenChange={setMemberPickerOpen}
                        options={users
                          .filter(
                            (user) => !selected.memberUserIds.includes(user.id),
                          )
                          .map((user) => ({
                            value: user.id,
                            label: user.displayName,
                          }))}
                        value={memberSelection}
                        onChange={setMemberSelection}
                        invalid={Boolean(memberError)}
                        describedBy={
                          memberError ? "crew-members-error" : undefined
                        }
                      />
                    </Field>
                    {memberError ? (
                      <Alert id="crew-members-error" variant="destructive">
                        <AlertDescription>{memberError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button type="submit">
                      <UserPlus data-icon="inline-start" aria-hidden />
                      Agregar integrantes
                    </Button>
                  </form>
                ) : null}
              </section>
            </div>
            {canManage ? (
              <SheetFooter className="border-t border-border pt-4">
                <section aria-label="Acciones de la cuadrilla" className="grid gap-2">
                  <h3 className="text-sm font-semibold">Acciones disponibles</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-card"
                    onClick={() => {
                      const crew = selected;
                      setSelected(null);
                      openEdit(crew);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                  {selected.active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => {
                        const crew = selected;
                        setSelected(null);
                        void deactivate(crew);
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
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cuadrilla" : "Registrar cuadrilla"}
            </DialogTitle>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form
            className="-mx-1 -my-1 min-h-0 overflow-y-auto px-1 py-1"
            id="crew-form"
            onSubmit={(event) => void save(event)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="crew-name">Nombre</FieldLabel>
                    <Input
                  id="crew-name"
                      className="bg-card"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-type-form">
                  Tipo de cuadrilla
                </FieldLabel>
                <Select
                  items={Object.fromEntries([
                    ...crewTypes.map((type) => [type, crewTypeLabels[type]]),
                  ])}
                  value={form.crewType}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setForm({ ...form, crewType: value as CrewType });
                    }
                  }}
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger
                    id="crew-type-form"
                    className={editing ? undefined : "bg-card"}
                    aria-describedby={editing ? "crew-type-locked" : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {crewTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {crewTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {editing ? (
                  <FieldDescription id="crew-type-locked">
                    No se puede cambiar después.
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-specialty-form">Especialidad</FieldLabel>
                <Select
                  items={crewSpecialtyLabels}
                  value={form.specialty || null}
                  onValueChange={(value) => {
                    if (value !== null) setForm({ ...form, specialty: value as CrewSpecialty });
                  }}
                >
                  <SelectTrigger id="crew-specialty-form" className="bg-card" aria-required>
                    <SelectValue placeholder="Seleccione una especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {crewSpecialtyLabels[specialty]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-home-zone-form">Zona base</FieldLabel>
                <Select
                  items={{ [NO_ZONE]: "Sin zona base", ...zoneItems }}
                  value={form.homeZoneId || NO_ZONE}
                  onValueChange={(value) => {
                    if (value !== null) setForm({ ...form, homeZoneId: value === NO_ZONE ? "" : value });
                  }}
                >
                  <SelectTrigger id="crew-home-zone-form" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_ZONE}>Sin zona base</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-leader">
                  Responsable de cuadrilla
                </FieldLabel>
                <Combobox
                  id="crew-leader"
                  className="bg-card"
                  value={form.leaderUserId}
                  onChange={(value) =>
                    setForm({ ...form, leaderUserId: value })
                  }
                  options={[...(editing?.leaderUserId ? [{ value: editing.leaderUserId, label: userName(editing.leaderUserId, editing.leaderName) }] : []), ...users.filter((user) => user.id !== editing?.leaderUserId).map((user) => ({ value: user.id, label: user.displayName }))]}
                  aria-required
                  placeholder="Seleccione una persona"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-organization">
                  Organización
                </FieldLabel>
                <Combobox
                  id="crew-organization"
                  className="bg-card"
                  value={form.organizationId}
                  onChange={(value) =>
                    setForm({ ...form, organizationId: value })
                  }
                  options={[...(editing?.organizationId ? [{ value: editing.organizationId, label: organizationName(editing.organizationId, editing.organizationName) }] : []), ...organizations.filter((organization) => organization.id !== editing?.organizationId).map((organization) => ({ value: organization.id, label: organization.displayName }))]}
                  aria-required
                  placeholder="Seleccione una organización"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="crew-shift-form">
                  Turno predeterminado
                </FieldLabel>
                <Select
                  items={Object.fromEntries([
                    ...shifts.map((shift) => [shift, shiftLabels[shift]]),
                  ])}
                  value={form.defaultShift}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setForm({ ...form, defaultShift: value as Shift });
                    }
                  }}
                >
                  <SelectTrigger id="crew-shift-form" className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {shifts.map((shift) => (
                        <SelectItem key={shift} value={shift}>
                          {shiftLabels[shift]}
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
            <Button type="submit" form="crew-form">
              Guardar cuadrilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CatalogDeactivationDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja de la cuadrilla ${deactivating?.name ?? ""}`.trim()}
        consequence="La cuadrilla quedará inactiva."
        confirmAction="Dar de baja"
        safeAlternative="Conservar cuadrilla"
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

type CrewMemberOption = { value: string; label: string };

/**
 * Multi-select behavior composed from the shared Popover and Command primitives;
 * the shared UI library currently provides only a single-value Combobox.
 */
function CrewMemberMultiSelect({
  id,
  open,
  onOpenChange,
  options,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: CrewMemberOption[];
  value: string[];
  onChange: (value: string[]) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const summary =
    value.length === 0
      ? "0 integrantes seleccionados"
      : value.length === 1
        ? "1 integrante seleccionado"
        : `${value.length} integrantes seleccionados`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={`${id}-options`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-label={`Agregar integrantes, ${summary}`}
            className="w-full justify-between bg-card text-left font-normal"
          />
        }
      >
        <span className="truncate">{summary}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-56 p-0">
        <Command>
          <CommandInput
            placeholder="Buscar integrantes"
            aria-label="Buscar integrantes"
          />
          <CommandList
            id={`${id}-options`}
            aria-label="Integrantes disponibles"
            aria-multiselectable="true"
          >
            <CommandEmpty>No se encontraron integrantes.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    data-checked={checked}
                    aria-label={`${option.label}, ${checked ? "seleccionado" : "no seleccionado"}`}
                    onSelect={() =>
                      onChange(
                        checked
                          ? value.filter((memberId) => memberId !== option.value)
                          : [...value, option.value],
                      )
                    }
                  >
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
