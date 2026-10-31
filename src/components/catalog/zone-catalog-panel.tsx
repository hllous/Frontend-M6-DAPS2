"use client";
import { ListItemsSkeleton, TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import {
  DataTable,
  useDataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { TableCaption } from "@/components/ui/table";


import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { notifySuccess } from "@/components/ui/feedback";
import { communesAdapter, type Commune } from "@/lib/communes";
import {
  catalogErrorMessage,
  groupNeighborhoodsByCommune,
  neighborhoodName,
  neighborhoodsAdapter,
  type CatalogStatus,
  type Neighborhood,
} from "@/lib/neighborhoods";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  type CreateZoneInput,
  type UpdateZoneInput,
  type Zone,
  type ZoneReferenceReport,
  ZoneRequestError,
  zonesAdapter,
} from "@/lib/zones";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: Zone[]; total: number }
  | { status: "error"; message: string };

const NO_COMMUNE = "none";

/** Barrio de la zona según el listado (uno solo); el detalle completo se ve con la acción «Barrios». */
function neighborhoodCell(zone: Zone): string {
  return zone.neighborhood?.nombre ?? "—";
}

function CommuneField({
  id,
  value,
  communes,
  current,
  onChange,
}: {
  id: string;
  value: string;
  communes: Commune[];
  /** Comuna actual de la zona: si no figura en `communes`, se agrega para que el selector no quede en blanco. */
  current?: { id: string; name: string } | null;
  onChange: (communeId: string) => void;
}) {
  const options = current && !communes.some((commune) => commune.id === current.id) ? [...communes, current] : communes;
  return (
    <Field>
      <FieldLabel htmlFor={id}>Comuna</FieldLabel>
      <Select
        value={value}
        items={{ [NO_COMMUNE]: "Sin comuna", ...Object.fromEntries(options.map((commune) => [commune.id, commune.name])) }}
        onValueChange={(next) => onChange(next as string)}
      >
        <SelectTrigger id={id} aria-label="Comuna">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NO_COMMUNE}>Sin comuna</SelectItem>
            {options.map((commune) => (
              <SelectItem key={commune.id} value={commune.id}>
                {commune.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

type FormErrors = { code?: string; name?: string; form?: string };

/** preventDefault on `invalid` also suppresses the browser's focus, so move it to the first invalid field. */
function focusIfFirstInvalid(field: HTMLInputElement) {
  // `validity` is a pure read; `:invalid` runs checkValidity in jsdom, which re-fires `invalid`.
  const first = Array.from(field.form?.elements ?? []).find(
    (el) => el instanceof HTMLInputElement && !el.validity.valid,
  );
  if (first === field) field.focus();
}

function mapFormError(message: string): FormErrors {
  const errors: FormErrors = {};
  if (/\bc[oó]digo\b/i.test(message)) errors.code = message;
  if (/\bnombre\b/i.test(message)) errors.name = message;
  if (!errors.code && !errors.name) errors.form = message;
  return errors;
}

const NO_ZONES: Zone[] = [];

export function ZoneCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage =
    scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("zone:manage");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [communeFilter, setCommuneFilter] = useState("all");
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [communesError, setCommunesError] = useState<string | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateZoneInput>({ code: "", name: "" });
  const [createCommuneId, setCreateCommuneId] = useState(NO_COMMUNE);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit state
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; active: boolean; communeId: string }>({
    name: "",
    active: true,
    communeId: NO_COMMUNE,
  });
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Deactivate confirmation state
  const [deactivatingZone, setDeactivatingZone] = useState<Zone | null>(null);
  const [referencesReport, setReferencesReport] = useState<ZoneReferenceReport | null>(null);
  const [referencesUnavailable, setReferencesUnavailable] = useState(false);
  const [referencesAcknowledged, setReferencesAcknowledged] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Neighborhood assignment state
  const [neighborhoodZone, setNeighborhoodZone] = useState<Zone | null>(null);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  // Catálogo completo de M9 (activos e inactivos): el nombre se resuelve al mostrar, no se persiste.
  const [neighborhoodCatalog, setNeighborhoodCatalog] = useState<Neighborhood[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const catalogLoaded = catalogStatus === "ready";
  const catalogFailed = catalogStatus === "failed";
  const [selectedNeighborhoodIds, setSelectedNeighborhoodIds] = useState<string[]>([]);
  const [neighborhoodError, setNeighborhoodError] = useState<string | null>(null);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);
  const [isSubmittingNeighborhoods, setIsSubmittingNeighborhoods] = useState(false);
  const [removingNeighborhoodId, setRemovingNeighborhoodId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function requestZones() {
      try {
        const activeParam =
          activeFilter === "all" ? undefined : activeFilter === "true";
        const page = await zonesAdapter.list({
          search: search.trim() || undefined,
          active: activeParam,
          communeId: communeFilter === "all" ? undefined : communeFilter,
          pageSize: 100,
        });
        if (isCurrent) {
          setState({ status: "ready", items: page.zones, total: page.total });
        }
      } catch (caught) {
        if (isCurrent) {
          const message =
            caught instanceof ZoneRequestError
              ? caught.message
              : "No se pudieron cargar las zonas. Intente nuevamente.";
          setState({ status: "error", message });
        }
      }
    }

    void requestZones();
    return () => {
      isCurrent = false;
    };
  }, [search, activeFilter, communeFilter, requestVersion]);

  // Comunas para el filtro y los formularios; si fallan, esos controles se ocultan, se avisa y la lista sigue funcionando.
  useEffect(() => {
    let isCurrent = true;
    void communesAdapter.list().then(
      (list) => {
        if (isCurrent) setCommunes(list);
      },
      (caught: unknown) => {
        if (isCurrent) setCommunesError(catalogErrorMessage(caught, "comunas"));
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  // Submit create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    const validationErrors: FormErrors = {};
    if (!createDraft.code.trim()) validationErrors.code = "El código es obligatorio.";
    if (!createDraft.name.trim()) validationErrors.name = "El nombre es obligatorio.";
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      document.getElementById(validationErrors.code ? "create-zone-code" : "create-zone-name")?.focus();
      return;
    }

    setIsSubmittingCreate(true);
    try {
      await zonesAdapter.create({ ...createDraft, communeId: createCommuneId === NO_COMMUNE ? undefined : createCommuneId });
      setShowCreate(false);
      setCreateDraft({ code: "", name: "" });
      setCreateCommuneId(NO_COMMUNE);
      setRequestVersion((v) => v + 1);
      setCreateErrors({});
      notifySuccess("Zona creada.");
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setCreateErrors(mapFormError(caught.message));
      } else {
        setCreateErrors({ form: "No se pudo crear la zona. Intente nuevamente." });
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Start edit
  const handleStartEdit = (zone: Zone) => {
    setEditingZone(zone);
    setEditDraft({ name: zone.name, active: zone.active, communeId: zone.commune?.id ?? NO_COMMUNE });
    setEditErrors({});
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    setEditErrors({});
    if (!editDraft.name.trim()) {
      setEditErrors({ name: "El nombre es obligatorio." });
      document.getElementById("edit-zone-name")?.focus();
      return;
    }

    setIsSubmittingEdit(true);
    try {
      // La comuna se manda solo si cambió: una zona derivada de un barrio no debe perderla por reenviarla.
      const communeChanged = editDraft.communeId !== (editingZone.commune?.id ?? NO_COMMUNE);
      await zonesAdapter.update(editingZone.id, {
        name: editDraft.name,
        active: editDraft.active,
        ...(communeChanged ? { communeId: editDraft.communeId === NO_COMMUNE ? null : editDraft.communeId } : {}),
      });
      setEditingZone(null);
      setRequestVersion((v) => v + 1);
      setEditErrors({});
      notifySuccess("Cambios guardados.");
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setEditErrors(mapFormError(caught.message));
      } else {
        setEditErrors({ form: "No se pudo actualizar la zona. Intente nuevamente." });
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Start deactivation with reference check
  const handleStartDeactivate = async (zone: Zone) => {
    setDeactivatingZone(zone);
    setReferencesReport(null);
    setReferencesUnavailable(false);
    setReferencesAcknowledged(false);
    setDeactivateError(null);
    setIsLoadingReferences(true);
    try {
      const report = await zonesAdapter.checkReferences(zone.id);
      setReferencesReport(report);
    } catch {
      setReferencesUnavailable(true);
    } finally {
      setIsLoadingReferences(false);
    }
  };

  // Confirm deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivatingZone || isLoadingReferences || (referencesUnavailable && !referencesAcknowledged)) return;
    setIsSubmittingDeactivate(true);
    try {
      await zonesAdapter.delete(deactivatingZone.id);
      setDeactivatingZone(null);
      setReferencesReport(null);
      setRequestVersion((v) => v + 1);
      notifySuccess("Zona dada de baja.");
    } catch (caught) {
      setDeactivateError(caught instanceof ZoneRequestError ? caught.message : "No se pudo dar de baja la zona. Intente nuevamente.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  const updateZoneInState = (updated: Zone) => {
    setState((current) =>
      current.status === "ready"
        ? { ...current, items: current.items.map((zone) => (zone.id === updated.id ? updated : zone)) }
        : current,
    );
  };

  // Cada apertura, cierre o recarga del diálogo de barrios incrementa el contador: la respuesta de una
  // solicitud anterior se descarta en vez de reabrir el diálogo o pisar el estado de otra zona.
  const neighborhoodRequest = useRef(0);

  const loadNeighborhoodCatalog = async (token: number): Promise<Neighborhood[] | null> => {
    try {
      const list = await neighborhoodsAdapter.list();
      if (token !== neighborhoodRequest.current) return null;
      setNeighborhoodCatalog(list);
      setCatalogStatus("ready");
      // Una selección que ya no existe (o se dio de baja) se descarta.
      setSelectedNeighborhoodIds((current) => current.filter((id) => list.some((n) => n.id === id && n.activo)));
      return list;
    } catch (caught) {
      if (token === neighborhoodRequest.current) {
        setCatalogStatus("failed");
        setNeighborhoodError(catalogErrorMessage(caught));
      }
      return null;
    }
  };

  const handleStartNeighborhoods = async (zone: Zone) => {
    const token = ++neighborhoodRequest.current;
    setNeighborhoodZone(zone);
    setNeighborhoodSearch("");
    setSelectedNeighborhoodIds([]);
    setNeighborhoodError(null);
    setCatalogStatus("loading");
    setIsLoadingNeighborhoods(true);

    try {
      // El listado del backend no informa los barrios de la zona; el detalle sí,
      // así que se pide cuando hace falta en vez de asumir que no tiene ninguno.
      const detail = zone.neighborhoodIds === undefined ? await zonesAdapter.get(zone.id) : zone;
      if (token !== neighborhoodRequest.current) return;
      setNeighborhoodZone(detail);
    } catch {
      if (token !== neighborhoodRequest.current) return;
      setNeighborhoodError("No se pudieron cargar los barrios de la zona.");
    }
    await loadNeighborhoodCatalog(token);
    if (token === neighborhoodRequest.current) setIsLoadingNeighborhoods(false);
  };

  const handleRetryNeighborhoods = async () => {
    if (!neighborhoodZone) return;
    if (neighborhoodZone.neighborhoodIds === undefined) {
      await handleStartNeighborhoods(neighborhoodZone);
      return;
    }
    const token = ++neighborhoodRequest.current;
    setNeighborhoodError(null);
    setCatalogStatus("loading");
    setIsLoadingNeighborhoods(true);
    await loadNeighborhoodCatalog(token);
    if (token === neighborhoodRequest.current) setIsLoadingNeighborhoods(false);
  };

  const assignedNeighborhoods = useMemo(
    () =>
      (neighborhoodZone?.neighborhoodIds ?? []).map((id): Neighborhood => {
        const known = neighborhoodCatalog.find((neighborhood) => neighborhood.id === id);
        if (known) return known;
        // Si el catálogo no está, la propia zona suele traer el nombre de su barrio.
        const ownName = neighborhoodZone?.neighborhood?.id === id ? neighborhoodZone.neighborhood.nombre : undefined;
        return {
          id,
          codigo: id,
          nombre: ownName ?? neighborhoodName(neighborhoodCatalog, id, catalogStatus),
          zona: "",
          zonaNombre: "",
          activo: true,
        };
      }),
    [neighborhoodZone, neighborhoodCatalog, catalogStatus],
  );

  // Solo los barrios activos se ofrecen para asignar; los dados de baja siguen visibles en los asignados.
  const neighborhoodGroups = useMemo(() => {
    const term = neighborhoodSearch.trim().toLowerCase();
    return groupNeighborhoodsByCommune(
      neighborhoodCatalog.filter(
        (neighborhood) => neighborhood.activo && (!term || `${neighborhood.codigo} ${neighborhood.nombre}`.toLowerCase().includes(term)),
      ),
    );
  }, [neighborhoodCatalog, neighborhoodSearch]);
  const availableNeighborhoodCount = neighborhoodGroups.reduce((total, group) => total + group.neighborhoods.length, 0);

  const handleAssignNeighborhoods = async () => {
    if (!neighborhoodZone || selectedNeighborhoodIds.length === 0) return;
    const token = neighborhoodRequest.current;
    const attempted = selectedNeighborhoodIds;
    setNeighborhoodError(null);
    setIsSubmittingNeighborhoods(true);

    try {
      const updated = await zonesAdapter.assignNeighborhoods(neighborhoodZone.id, {
        neighborhoodIds: attempted,
      });
      updateZoneInState(updated);
      notifySuccess("Barrios asignados correctamente.");
      if (token !== neighborhoodRequest.current) return;
      setNeighborhoodZone(updated);
      setSelectedNeighborhoodIds([]);
    } catch (caught) {
      if (token !== neighborhoodRequest.current) return;
      if (caught instanceof ZoneRequestError && caught.status === 400) {
        // El 400 también cubre validaciones (tope de 100, ids vacíos): se recarga el catálogo y solo si
        // algún barrio elegido ya no existe se explica eso; si no, se muestra el mensaje del backend.
        const reloadToken = ++neighborhoodRequest.current;
        setCatalogStatus("loading");
        setIsLoadingNeighborhoods(true);
        const list = await loadNeighborhoodCatalog(reloadToken);
        if (reloadToken !== neighborhoodRequest.current) return;
        setIsLoadingNeighborhoods(false);
        if (!list) return; // el fallo del reload ya dejó un único mensaje con «Reintentar»
        const someGone = attempted.some((id) => !list.some((n) => n.id === id && n.activo));
        setNeighborhoodError(
          someGone ? "Algún barrio elegido ya no está en el catálogo. La lista se actualizó: revise la selección." : caught.message,
        );
      } else {
        setNeighborhoodError(
          caught instanceof ZoneRequestError ? caught.message : "No se pudieron asignar los barrios.",
        );
      }
    } finally {
      setIsSubmittingNeighborhoods(false);
    }
  };

  const handleRemoveNeighborhood = async (neighborhoodId: string) => {
    if (!neighborhoodZone) return;
    const token = neighborhoodRequest.current;
    setNeighborhoodError(null);
    setRemovingNeighborhoodId(neighborhoodId);

    try {
      const updated = await zonesAdapter.removeNeighborhood(neighborhoodZone.id, neighborhoodId);
      updateZoneInState(updated);
      notifySuccess("Barrio quitado de la zona.");
      if (token === neighborhoodRequest.current) setNeighborhoodZone(updated);
    } catch (caught) {
      if (token === neighborhoodRequest.current) {
        setNeighborhoodError(
          caught instanceof ZoneRequestError ? caught.message : "No se pudo quitar el barrio de la zona.",
        );
      }
    } finally {
      setRemovingNeighborhoodId(null);
    }
  };

  const closeNeighborhoodDialog = () => {
    neighborhoodRequest.current += 1;
    setIsLoadingNeighborhoods(false);
    setNeighborhoodZone(null);
    setNeighborhoodError(null);
    setSelectedNeighborhoodIds([]);
  };

  const columns: DataTableColumn<Zone>[] = [
    {
      id: "name",
      header: "Nombre",
      enableSorting: false,
      meta: {
        headClassName:
          "h-auto whitespace-normal text-inherit font-bold px-4 py-3",
        cellClassName:
          "h-auto whitespace-normal px-4 py-3 font-medium text-foreground",
      },
      cell: ({ row }) => {
        const zone = row.original;
        return <>{zone.name}</>;
      },
    },
    {
      id: "commune",
      header: "Comuna",
      enableSorting: false,
      meta: {
        headClassName:
          "h-auto whitespace-normal text-inherit font-bold px-4 py-3",
        cellClassName:
          "h-auto whitespace-normal px-4 py-3 text-muted-foreground",
      },
      cell: ({ row }) => {
        const zone = row.original;
        return <>{zone.commune?.name ?? "Sin comuna"}</>;
      },
    },
    {
      id: "neighborhoods",
      header: "Barrios",
      enableSorting: false,
      meta: {
        headClassName:
          "h-auto whitespace-normal text-inherit font-bold px-4 py-3",
        cellClassName:
          "h-auto whitespace-normal px-4 py-3 text-muted-foreground",
      },
      cell: ({ row }) => {
        const zone = row.original;
        return <>{neighborhoodCell(zone)}</>;
      },
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      meta: {
        headClassName:
          "h-auto whitespace-normal text-inherit font-bold px-4 py-3",
        cellClassName: "h-auto whitespace-normal px-4 py-3",
      },
      cell: ({ row }) => {
        const zone = row.original;
        return (
          <>
            <Badge variant={zone.active ? "success" : "secondary"}>
              {zone.active ? "Activa" : "Inactiva"}
            </Badge>
          </>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      meta: {
        headClassName:
          "h-auto whitespace-normal text-inherit font-bold px-4 py-3 text-right",
        cellClassName: "h-auto whitespace-normal px-4 py-3 text-right",
      },
      cell: ({ row }) => {
        const zone = row.original;
        return (
          <>
            {canManage ? (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleStartNeighborhoods(zone)}
                  className="h-8 max-[760px]:h-10 gap-1 text-xs"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Barrios
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartEdit(zone)}
                  className="h-8 max-[760px]:h-10 gap-1 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
                </Button>
                {zone.active && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStartDeactivate(zone)}
                    className="h-8 max-[760px]:h-10 gap-1 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Dar de baja
                  </Button>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Solo consulta
              </span>
            )}
          </>
        );
      },
    },
  ];

  const table = useDataTable({
    data: state.status === "ready" ? state.items : NO_ZONES,
    columns,
    getRowId: (item) => item.id,
  });

  return (
    <section aria-labelledby="zones-catalog-heading" className="flex flex-col gap-6">
      <CatalogPageHeader
        title="Zonas operativas"
        titleId="zones-catalog-heading"
        actions={canManage ? (
          <Button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setCreateErrors({});
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva zona
          </Button>
        ) : null}
      />

      {/* Filter and search bar */}
      <Card size="sm">
      <CardContent className={`grid gap-3 ${communes.length > 0 ? "sm:grid-cols-[1fr_220px_200px]" : "sm:grid-cols-[1fr_200px]"}`}>
        <Field>
          <FieldLabel htmlFor="zone-search">Buscar</FieldLabel>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="zone-search"
              aria-label="Buscar zona"
              className="pl-9"
              placeholder="Buscar zona"
              value={search}
              maxLength={MAX_SEARCH_LENGTH}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>

        {communes.length > 0 && (
          <Field>
            <FieldLabel htmlFor="zone-commune-filter">Comuna</FieldLabel>
            <Select
              value={communeFilter}
              items={{ all: "Todas", ...Object.fromEntries(communes.map((commune) => [commune.id, commune.name])) }}
              onValueChange={(value) => setCommuneFilter(value as string)}
            >
              <SelectTrigger id="zone-commune-filter" aria-label="Filtrar por comuna">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas</SelectItem>
                  {communes.map((commune) => (
                    <SelectItem key={commune.id} value={commune.id}>
                      {commune.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="zone-active-filter">Estado</FieldLabel>
          <Select
            value={activeFilter}
            items={{ all: "Todos", true: "Activas", false: "Inactivas" }}
            onValueChange={(value) => setActiveFilter(value as "all" | "true" | "false")}
          >
            <SelectTrigger id="zone-active-filter" aria-label="Filtrar por estado">
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
        {communesError && (
          <p role="status" className="text-xs text-muted-foreground sm:col-span-full">
            {communesError} El filtro y la selección de comuna no están disponibles por ahora.
          </p>
        )}
      </CardContent>
      </Card>

      {/* Create form section (if expanded) */}
      {showCreate && canManage && (
        <form
          onSubmit={handleCreateSubmit}
          aria-label="Formulario de nueva zona"
        >
          <Card>
          <CardContent>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Nueva zona operativa</h2>
              <FieldDescription>
                No se puede cambiar después.
              </FieldDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(false)}
              aria-label="Cancelar creación"
            >
              Cancelar
            </Button>
          </div>

          {createErrors.form && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{createErrors.form}</AlertDescription>
            </Alert>
          )}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="create-zone-code">Código</FieldLabel>
              <Input
                id="create-zone-code"
                required
                placeholder="Ej. palermo"
                value={createDraft.code}
                onInvalid={(event) => {
                  event.preventDefault();
                  focusIfFirstInvalid(event.currentTarget);
                  setCreateErrors((errors) => ({ ...errors, code: "El código es obligatorio.", form: undefined }));
                }}
                onChange={(e) => {
                  setCreateDraft({ ...createDraft, code: e.target.value });
                  setCreateErrors((errors) =>
                    errors.code || errors.form ? { ...errors, code: undefined, form: undefined } : errors,
                  );
                }}
                aria-invalid={createErrors.code ? true : undefined}
                aria-describedby={createErrors.code ? "create-zone-code-error" : undefined}
              />
              {createErrors.code && (
                <FieldError id="create-zone-code-error">{createErrors.code}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-zone-name">Nombre</FieldLabel>
              <Input
                id="create-zone-name"
                required
                placeholder="Ej. Palermo"
                value={createDraft.name}
                onInvalid={(event) => {
                  event.preventDefault();
                  focusIfFirstInvalid(event.currentTarget);
                  setCreateErrors((errors) => ({ ...errors, name: "El nombre es obligatorio.", form: undefined }));
                }}
                onChange={(e) => {
                  setCreateDraft({ ...createDraft, name: e.target.value });
                  setCreateErrors((errors) =>
                    errors.name || errors.form ? { ...errors, name: undefined, form: undefined } : errors,
                  );
                }}
                aria-invalid={createErrors.name ? true : undefined}
                aria-describedby={createErrors.name ? "create-zone-name-error" : undefined}
              />
              {createErrors.name && (
                <FieldError id="create-zone-name-error">{createErrors.name}</FieldError>
              )}
            </Field>

            {communes.length > 0 && (
              <CommuneField id="create-zone-commune" value={createCommuneId} communes={communes} onChange={setCreateCommuneId} />
            )}
          </FieldGroup>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={isSubmittingCreate}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmittingCreate}>
              {isSubmittingCreate && <Spinner aria-hidden="true" />}
              {isSubmittingCreate ? "Creando..." : "Crear zona"}
            </Button>
          </div>
          </CardContent>
          </Card>
        </form>
      )}

      {/* Edit form section */}
      {editingZone && canManage && (
        <form
          onSubmit={handleEditSubmit}
          aria-label="Formulario de edición de zona"
        >
          <Card>
          <CardContent>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Editar zona operativa</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingZone(null)}
              aria-label="Cerrar edición"
            >
              Cerrar
            </Button>
          </div>

          {editErrors.form && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{editErrors.form}</AlertDescription>
            </Alert>
          )}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-zone-code">Código (inmutable)</FieldLabel>
              <Input
                id="edit-zone-code"
                readOnly
                aria-readonly="true"
                className="bg-muted/50"
                value={editingZone.code}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-zone-name">Nombre</FieldLabel>
              <Input
                id="edit-zone-name"
                required
                value={editDraft.name}
                onInvalid={(event) => {
                  event.preventDefault();
                  focusIfFirstInvalid(event.currentTarget);
                  setEditErrors((errors) => ({ ...errors, name: "El nombre es obligatorio.", form: undefined }));
                }}
                onChange={(e) => {
                  setEditDraft({ ...editDraft, name: e.target.value });
                  setEditErrors((errors) =>
                    errors.name || errors.form ? { ...errors, name: undefined, form: undefined } : errors,
                  );
                }}
                aria-invalid={editErrors.name ? true : undefined}
                aria-describedby={editErrors.name ? "edit-zone-name-error" : undefined}
              />
              {editErrors.name && (
                <FieldError id="edit-zone-name-error">{editErrors.name}</FieldError>
              )}
            </Field>

            {communes.length > 0 && (
              <CommuneField
                id="edit-zone-commune"
                value={editDraft.communeId}
                communes={communes}
                current={editingZone.commune}
                onChange={(communeId) => setEditDraft({ ...editDraft, communeId })}
              />
            )}

            <Field orientation="horizontal" className="pt-2 sm:col-span-2">
              <Checkbox
                id="edit-zone-active"
                checked={editDraft.active}
                onCheckedChange={(checked) => setEditDraft({ ...editDraft, active: checked })}
              />
              <FieldLabel htmlFor="edit-zone-active">Activa</FieldLabel>
            </Field>
          </FieldGroup>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingZone(null)}
              disabled={isSubmittingEdit}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmittingEdit}>
              {isSubmittingEdit && <Spinner aria-hidden="true" />}
              {isSubmittingEdit ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
          </CardContent>
          </Card>
        </form>
      )}

      {/* Main content table / states */}
      {state.status === "loading" && (
        <LoadingRegion label="Listado de zonas operativas"><TableRowsSkeleton rowCount={5} rowHeight="h-[65px]" columnWidths={["w-40", "w-28", "w-36", "w-16", "w-72"]} columnLabels={["NOMBRE", "COMUNA", "BARRIOS", "ESTADO", ""]} className="relative overflow-x-auto rounded-xl border border-border bg-card" /></LoadingRegion>
      )}

      {state.status === "error" && (
        <Alert variant="destructive" className="rounded-xl p-5">
          <AlertDescription>{state.message}</AlertDescription>
          <Button
            type="button"
            variant="outline"
            className="mt-3 gap-1.5"
            onClick={() => setRequestVersion((v) => v + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </Button>
        </Alert>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin zonas operativas</EmptyTitle>
            <EmptyDescription>No se encontraron zonas para los filtros seleccionados.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {state.status === "ready" && state.total > state.items.length && (
        <p role="status" className="text-sm text-muted-foreground">
          Se muestran {state.items.length} de {state.total} zonas. Use los filtros para acotar la lista.
        </p>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <div className="relative overflow-x-auto rounded-xl border border-border bg-card">
          <DataTable
            table={table}
            container={false}
            className="w-full text-left text-sm leading-[inherit]"
            headerClassName="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground [&_tr]:border-b-0"
            bodyClassName=""
            rowProps={() => ({
              className:
                "border-b border-border last:border-0 hover:bg-muted/20",
            })}
          >
            <TableCaption className="sr-only">
              Listado de zonas operativas
            </TableCaption>
          </DataTable>
        </div>
      )}

      <Dialog
        open={Boolean(neighborhoodZone)}
        onOpenChange={(open) => {
          if (!open) closeNeighborhoodDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle id="manage-neighborhoods-title" className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              Barrios
            </DialogTitle>
            <DialogDescription>
              {neighborhoodZone && (
                <span>
                  Zona: {neighborhoodZone.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {neighborhoodError && (
            <Alert variant="destructive">
              <AlertDescription>{neighborhoodError}</AlertDescription>
              {(catalogFailed || neighborhoodZone?.neighborhoodIds === undefined) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => void handleRetryNeighborhoods()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reintentar
                </Button>
              )}
            </Alert>
          )}

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section aria-labelledby="assigned-neighborhoods-heading" className="space-y-3">
              <div>
                <h3 id="assigned-neighborhoods-heading" className="text-sm font-semibold">
                  Barrios asignados
                </h3>
              </div>

              {isLoadingNeighborhoods ? (
                <LoadingRegion label="Barrios de la zona"><ListItemsSkeleton itemCount={2} /></LoadingRegion>
              ) : assignedNeighborhoods.length === 0 ? (
                <Empty className="border p-3">
                  <EmptyDescription>Esta zona todavía no tiene barrios asignados.</EmptyDescription>
                </Empty>
              ) : (
                <ItemGroup
                  aria-label="Barrios"
                  className="gap-0 overflow-hidden rounded-md border border-border"
                >
                  {assignedNeighborhoods.map((neighborhood) => (
                    <Item
                      key={neighborhood.id}
                      variant="outline"
                      size="sm"
                      className="items-center justify-between gap-3 rounded-none border-x-0 border-t-0 last:border-b-0"
                    >
                      <ItemContent className="min-w-0">
                        <ItemTitle className="flex items-center gap-2">
                          <span className="truncate">{neighborhood.nombre}</span>
                          {!neighborhood.activo && (
                            <Badge variant="secondary" className="shrink-0">
                              Inactivo
                            </Badge>
                          )}
                        </ItemTitle>
                        {neighborhood.zonaNombre && <ItemDescription>{neighborhood.zonaNombre}</ItemDescription>}
                      </ItemContent>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10 max-[760px]:h-12 shrink-0 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleRemoveNeighborhood(neighborhood.id)}
                        disabled={removingNeighborhoodId !== null || isSubmittingNeighborhoods}
                        aria-label={`Quitar ${neighborhood.nombre}`}
                      >
                        {removingNeighborhoodId === neighborhood.id ? (
                          <Spinner aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Quitar
                      </Button>
                    </Item>
                  ))}
                </ItemGroup>
              )}
            </section>

            <section aria-labelledby="available-neighborhoods-heading" className="space-y-3">
              <div>
                <h3 id="available-neighborhoods-heading" className="text-sm font-semibold">
                  Agregar barrios
                </h3>
              </div>

              <Field>
                <FieldLabel htmlFor="neighborhood-search">Buscar barrios</FieldLabel>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="neighborhood-search"
                    type="search"
                    className="pl-9"
                    placeholder="Buscar barrio"
                    value={neighborhoodSearch}
                    onChange={(event) => setNeighborhoodSearch(event.target.value)}
                    disabled={isLoadingNeighborhoods || !catalogLoaded}
                  />
                </div>
              </Field>
              <p role="status" className="sr-only">
                {catalogLoaded ? `${availableNeighborhoodCount} ${availableNeighborhoodCount === 1 ? "barrio disponible" : "barrios disponibles"}` : ""}
              </p>

              {neighborhoodGroups.length === 0 ? (
                <Empty className="border p-3">
                  <EmptyDescription>
                    {catalogLoaded ? "No se encontraron barrios para esta búsqueda." : catalogFailed ? "El catálogo de barrios no está disponible." : <LoadingRegion label="Barrios disponibles"><ListItemsSkeleton itemCount={3} /></LoadingRegion>}
                  </EmptyDescription>
                </Empty>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-border" role="group" aria-label="Barrios disponibles">
                  {neighborhoodGroups.map((group) => (
                    <FieldSet key={group.key} className="gap-0">
                      <FieldLegend variant="label" className="sticky top-0 m-0 w-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        {group.label}
                      </FieldLegend>
                      {group.neighborhoods.map((neighborhood) => {
                        const isAssigned = neighborhoodZone?.neighborhoodIds?.includes(neighborhood.id) ?? false;
                        const isSelected = selectedNeighborhoodIds.includes(neighborhood.id);
                        const inputId = `neighborhood-${neighborhood.id}`;
                        return (
                          <Field
                            key={neighborhood.id}
                            orientation="horizontal"
                            data-disabled={isAssigned || isSubmittingNeighborhoods || undefined}
                            className={`min-h-11 gap-3 border-b border-border px-3 py-2 last:border-0 ${
                              isAssigned ? "bg-muted/50" : "hover:bg-muted/40"
                            }`}
                          >
                            <Checkbox
                              id={inputId}
                              checked={isAssigned || isSelected}
                              disabled={isAssigned || isSubmittingNeighborhoods}
                              onCheckedChange={(checked) => {
                                setSelectedNeighborhoodIds((current) =>
                                  checked
                                    ? [...current, neighborhood.id]
                                    : current.filter((id) => id !== neighborhood.id),
                                );
                              }}
                            />
                            <FieldContent>
                              <FieldLabel htmlFor={inputId} className="min-w-0 cursor-pointer">
                                <span className="truncate">{neighborhood.nombre}</span>
                              </FieldLabel>
                              {isAssigned && <FieldDescription>Ya asignado</FieldDescription>}
                            </FieldContent>
                          </Field>
                        );
                      })}
                    </FieldSet>
                  ))}
                </div>
              )}

              <p role="status" className="text-xs text-muted-foreground">
                {selectedNeighborhoodIds.length === 1 ? "1 seleccionado" : `${selectedNeighborhoodIds.length} seleccionados`}
              </p>
              <Button
                type="button"
                className="w-full gap-1.5"
                onClick={() => void handleAssignNeighborhoods()}
                disabled={selectedNeighborhoodIds.length === 0 || isSubmittingNeighborhoods || isLoadingNeighborhoods}
              >
                {isSubmittingNeighborhoods && <Spinner aria-hidden="true" />}
                {isSubmittingNeighborhoods ? "Asignando..." : "Asignar seleccionados"}
              </Button>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeNeighborhoodDialog}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogDeactivationDialog
        open={Boolean(deactivatingZone)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingZone(null);
            setReferencesReport(null);
            setDeactivateError(null);
          }
        }}
        title={`Dar de baja la zona ${deactivatingZone?.name ?? ""}`.trim()}
        consequence={`La zona ${deactivatingZone?.name ?? ""} quedará inactiva.`.trim()}
        confirmAction={`Dar de baja la zona ${deactivatingZone?.name ?? ""}`.trim()}
        safeAlternative={`Conservar zona ${deactivatingZone?.name ?? ""}`.trim()}
        confirmDisabled={isLoadingReferences || (referencesUnavailable && !referencesAcknowledged)}
        isSubmitting={isSubmittingDeactivate}
        onConfirm={() => void handleConfirmDeactivate()}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
        {isLoadingReferences ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner aria-hidden="true" />
            Verificando…
          </div>
        ) : referencesUnavailable ? (
          <div className="flex flex-col gap-3">
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>
                No se pudo verificar si la zona está en uso.
              </AlertDescription>
            </Alert>
            <Field orientation="horizontal">
              <Checkbox
                id="zone-reference-acknowledgement"
                checked={referencesAcknowledged}
                onCheckedChange={setReferencesAcknowledged}
                disabled={isSubmittingDeactivate}
              />
              <FieldLabel htmlFor="zone-reference-acknowledgement">
                Dar de baja de todos modos
              </FieldLabel>
            </Field>
          </div>
        ) : referencesReport && referencesReport.totalReferences > 0 ? (
          <div className="flex flex-col gap-3 py-2 text-sm">
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                La zona está en uso:
              </AlertTitle>
              <AlertDescription>
                <ItemGroup className="gap-1">
                  {referencesReport.activeRoutes.length > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Recorridos activos ({referencesReport.activeRoutes.length})</ItemTitle>
                        <ItemDescription>
                          {referencesReport.activeRoutes
                            .map((route) => route.name)
                            .join(", ")}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.containersCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Contenedores</ItemTitle>
                        <ItemDescription>{referencesReport.containersCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.treesCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Árboles</ItemTitle>
                        <ItemDescription>{referencesReport.treesCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.greenSpacesCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Espacios verdes</ItemTitle>
                        <ItemDescription>{referencesReport.greenSpacesCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                </ItemGroup>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </CatalogDeactivationDialog>
    </section>
  );
}
