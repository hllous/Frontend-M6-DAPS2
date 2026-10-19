"use client";

import { useEffect, useState } from "react";
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
import { neighborhoodsAdapter, type Neighborhood } from "@/lib/neighborhoods";
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
  | { status: "ready"; items: Zone[] }
  | { status: "error"; message: string };

type FormErrors = { code?: string; name?: string; form?: string };

function mapFormError(message: string): FormErrors {
  const errors: FormErrors = {};
  if (/\bc[oó]digo\b/i.test(message)) errors.code = message;
  if (/\bnombre\b/i.test(message)) errors.name = message;
  if (!errors.code && !errors.name) errors.form = message;
  return errors;
}

export function ZoneCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage =
    scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("zone:manage");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateZoneInput>({ code: "", name: "" });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit state
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; active: boolean }>({
    name: "",
    active: true,
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
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<Neighborhood[]>([]);
  const [assignedNeighborhoods, setAssignedNeighborhoods] = useState<Neighborhood[]>([]);
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
        });
        if (isCurrent) {
          setState({ status: "ready", items: page.zones });
        }
      } catch (caught) {
        if (isCurrent) {
          const message =
            caught instanceof ZoneRequestError
              ? caught.message
              : "No se pudieron cargar las zonas operativas.";
          setState({ status: "error", message });
        }
      }
    }

    void requestZones();
    return () => {
      isCurrent = false;
    };
  }, [search, activeFilter, requestVersion]);

  // Submit create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    const validationErrors: FormErrors = {};
    if (!createDraft.code.trim()) validationErrors.code = "El código es obligatorio.";
    if (!createDraft.name.trim()) validationErrors.name = "El nombre es obligatorio.";
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }

    setIsSubmittingCreate(true);
    try {
      await zonesAdapter.create(createDraft);
      setShowCreate(false);
      setCreateDraft({ code: "", name: "" });
      setRequestVersion((v) => v + 1);
      setCreateErrors({});
      notifySuccess("Zona creada.");
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setCreateErrors(mapFormError(caught.message));
      } else {
        setCreateErrors({ form: "Error inesperado al crear la zona operativa." });
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Start edit
  const handleStartEdit = (zone: Zone) => {
    setEditingZone(zone);
    setEditDraft({ name: zone.name, active: zone.active });
    setEditErrors({});
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    setEditErrors({});
    if (!editDraft.name.trim()) {
      setEditErrors({ name: "El nombre es obligatorio." });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await zonesAdapter.update(editingZone.id, editDraft);
      setEditingZone(null);
      setRequestVersion((v) => v + 1);
      setEditErrors({});
      notifySuccess("Cambios guardados.");
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setEditErrors(mapFormError(caught.message));
      } else {
        setEditErrors({ form: "Error al actualizar la zona operativa." });
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
      setDeactivateError(caught instanceof ZoneRequestError ? caught.message : "No se pudo dar de baja la zona operativa.");
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

  const handleStartNeighborhoods = async (zone: Zone) => {
    setNeighborhoodZone(zone);
    setNeighborhoodSearch("");
    setSelectedNeighborhoodIds([]);
    setNeighborhoodError(null);
    setIsLoadingNeighborhoods(true);

    try {
      // El listado del backend no informa los barrios de la zona; el detalle sí,
      // así que se pide cuando hace falta en vez de asumir que no tiene ninguno.
      const detail = zone.neighborhoodIds === undefined ? await zonesAdapter.get(zone.id) : zone;
      const [options, assigned] = await Promise.all([
        neighborhoodsAdapter.search(),
        neighborhoodsAdapter.resolveIds(detail.neighborhoodIds ?? []),
      ]);
      setNeighborhoodZone(detail);
      setNeighborhoodOptions(options);
      setAssignedNeighborhoods(assigned);
    } catch {
      setNeighborhoodError("No se pudieron cargar los barrios disponibles.");
    } finally {
      setIsLoadingNeighborhoods(false);
    }
  };

  useEffect(() => {
    if (!neighborhoodZone) return;

    let isCurrent = true;
    void neighborhoodsAdapter.search({ search: neighborhoodSearch }).then((options) => {
      if (isCurrent) setNeighborhoodOptions(options);
    });

    return () => {
      isCurrent = false;
    };
  }, [neighborhoodSearch, neighborhoodZone]);

  const handleAssignNeighborhoods = async () => {
    if (!neighborhoodZone || selectedNeighborhoodIds.length === 0) return;
    setNeighborhoodError(null);
    setIsSubmittingNeighborhoods(true);

    try {
      const updated = await zonesAdapter.assignNeighborhoods(neighborhoodZone.id, {
        neighborhoodIds: selectedNeighborhoodIds,
      });
      updateZoneInState(updated);
      setNeighborhoodZone(updated);
      setAssignedNeighborhoods(await neighborhoodsAdapter.resolveIds(updated.neighborhoodIds ?? []));
      setSelectedNeighborhoodIds([]);
      notifySuccess("Barrios asignados correctamente.");
    } catch (caught) {
      setNeighborhoodError(
        caught instanceof ZoneRequestError ? caught.message : "No se pudieron asignar los barrios.",
      );
    } finally {
      setIsSubmittingNeighborhoods(false);
    }
  };

  const handleRemoveNeighborhood = async (neighborhoodId: string) => {
    if (!neighborhoodZone) return;
    setNeighborhoodError(null);
    setRemovingNeighborhoodId(neighborhoodId);

    try {
      const updated = await zonesAdapter.removeNeighborhood(neighborhoodZone.id, neighborhoodId);
      updateZoneInState(updated);
      setNeighborhoodZone(updated);
      setAssignedNeighborhoods(await neighborhoodsAdapter.resolveIds(updated.neighborhoodIds ?? []));
      notifySuccess("Barrio quitado de la zona.");
    } catch (caught) {
      setNeighborhoodError(
        caught instanceof ZoneRequestError ? caught.message : "No se pudo quitar el barrio de la zona.",
      );
    } finally {
      setRemovingNeighborhoodId(null);
    }
  };

  const closeNeighborhoodDialog = () => {
    setNeighborhoodZone(null);
    setNeighborhoodError(null);
    setSelectedNeighborhoodIds([]);
  };

  return (
    <section aria-labelledby="zones-catalog-heading" className="flex flex-col gap-6">
      <CatalogPageHeader
        title="Zonas operativas"
        titleId="zones-catalog-heading"
        description="Configuración de áreas operativas para asignación de cuadrillas y recorridos de recolección."
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
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_200px]">
        <Field>
          <FieldLabel htmlFor="zone-search">Buscar</FieldLabel>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="zone-search"
              aria-label="Buscar zonas operativas"
              className="pl-9"
              placeholder="Buscar por código o nombre..."
              value={search}
              maxLength={MAX_SEARCH_LENGTH}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>

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
      </div>

      {/* Create form section (if expanded) */}
      {showCreate && canManage && (
        <form
          onSubmit={handleCreateSubmit}
          aria-label="Formulario de nueva zona"
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Nueva zona operativa</h2>
              <FieldDescription>
                El código identifica la zona de forma única y es inmutable tras la creación.
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
                placeholder="Ej. Z-04"
                value={createDraft.code}
                onInvalid={(event) => {
                  event.preventDefault();
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
                placeholder="Ej. Zona Centro Este"
                value={createDraft.name}
                onInvalid={(event) => {
                  event.preventDefault();
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
        </form>
      )}

      {/* Edit form section */}
      {editingZone && canManage && (
        <form
          onSubmit={handleEditSubmit}
          aria-label="Formulario de edición de zona"
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Editar zona operativa</h2>
              <FieldDescription>
                El código es de solo lectura porque identifica unívocamente la zona y no puede modificarse.
              </FieldDescription>
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

            <Field orientation="horizontal" className="pt-2 sm:col-span-2">
              <Checkbox
                id="edit-zone-active"
                checked={editDraft.active}
                onCheckedChange={(checked) => setEditDraft({ ...editDraft, active: checked })}
              />
              <FieldLabel htmlFor="edit-zone-active">Zona activa para asignaciones</FieldLabel>
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
        </form>
      )}

      {/* Main content table / states */}
      {state.status === "loading" && (
        <div aria-label="Cargando zonas operativas" className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
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

      {state.status === "ready" && state.items.length > 0 && (
        <div className="relative overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Listado de zonas operativas</caption>
            <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Barrios</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((zone) => (
                <tr key={zone.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                    {zone.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {zone.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {zone.neighborhoodIds === undefined
                      ? "Ver en gestionar barrios"
                      : zone.neighborhoodIds.length > 0
                      ? `${zone.neighborhoodIds.length} ${zone.neighborhoodIds.length === 1 ? "barrio" : "barrios"}`
                      : "Sin barrios"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={zone.active ? "success" : "secondary"}>
                      {zone.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleStartNeighborhoods(zone)}
                          className="h-8 gap-1 text-xs"
                        >
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          Gestionar barrios
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(zone)}
                          className="h-8 gap-1 text-xs"
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
                            className="h-8 gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Dar de baja
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(neighborhoodZone)}
        onOpenChange={(open) => {
          if (!open) closeNeighborhoodDialog();
        }}
      >
        <DialogContent className="max-w-2xl" aria-labelledby="manage-neighborhoods-title">
          <DialogHeader>
            <DialogTitle id="manage-neighborhoods-title" className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              Gestionar barrios
            </DialogTitle>
            <DialogDescription>
              {neighborhoodZone && (
                <span>
                  Zona: <strong>{neighborhoodZone.code}</strong> — {neighborhoodZone.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {neighborhoodError && (
            <Alert variant="destructive">
              <AlertDescription>{neighborhoodError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section aria-labelledby="assigned-neighborhoods-heading" className="space-y-3">
              <div>
                <h3 id="assigned-neighborhoods-heading" className="text-sm font-semibold">
                  Barrios asignados
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quite un barrio para eliminarlo de esta zona.
                </p>
              </div>

              {isLoadingNeighborhoods ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Spinner aria-hidden="true" />
                  Cargando barrios...
                </div>
              ) : assignedNeighborhoods.length === 0 ? (
                <p className="rounded-md border border-dashed border-[var(--color-border-strong)] p-3 text-sm text-muted-foreground">
                  Esta zona todavía no tiene barrios asignados.
                </p>
              ) : (
                <ItemGroup
                  aria-label="Barrios asignados"
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
                        <ItemTitle className="truncate">{neighborhood.name}</ItemTitle>
                        <ItemDescription className="font-mono">{neighborhood.id}</ItemDescription>
                      </ItemContent>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10 max-[760px]:h-12 shrink-0 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleRemoveNeighborhood(neighborhood.id)}
                        disabled={removingNeighborhoodId !== null || isSubmittingNeighborhoods}
                        aria-label={`Quitar ${neighborhood.name}`}
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
                <p className="text-xs text-muted-foreground">
                  Busque y seleccione uno o más barrios.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="neighborhood-search">Buscar barrios</FieldLabel>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="neighborhood-search"
                    className="pl-9"
                    placeholder="Buscar por nombre o identificador"
                    value={neighborhoodSearch}
                    onChange={(event) => setNeighborhoodSearch(event.target.value)}
                    disabled={isLoadingNeighborhoods}
                  />
                </div>
              </Field>

              {neighborhoodOptions.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No se encontraron barrios para esta búsqueda.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-border" role="group" aria-label="Barrios disponibles">
                  {neighborhoodOptions.map((neighborhood) => {
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
                            <span className="truncate">{neighborhood.name}</span>
                          </FieldLabel>
                          <FieldDescription className="font-mono text-xs">
                            {neighborhood.id}
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    );
                  })}
                </div>
              )}

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
        title={`Confirmar baja de zona ${deactivatingZone?.code ?? ""}`.trim()}
        consequence={`La zona ${deactivatingZone?.code ?? ""} — ${deactivatingZone?.name ?? ""} quedará inactiva. Los registros asociados conservarán su referencia.`.trim()}
        confirmAction={`Dar de baja la zona ${deactivatingZone?.code ?? ""}`.trim()}
        safeAlternative={`Conservar zona ${deactivatingZone?.code ?? ""}`.trim()}
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
            Verificando referencias de la zona...
          </div>
        ) : referencesUnavailable ? (
          <div className="flex flex-col gap-3">
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>
                No se pudieron verificar las referencias. Si continúa, la baja puede afectar servicios o elementos que todavía usan este registro.
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
                Entiendo que no se verificaron las referencias
              </FieldLabel>
            </Field>
          </div>
        ) : referencesReport && referencesReport.totalReferences > 0 ? (
          <div className="flex flex-col gap-3 py-2 text-sm">
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                Advertencia: esta zona todavía cuenta con elementos activos referenciados:
              </AlertTitle>
              <AlertDescription>
                <ItemGroup className="gap-1">
                  {referencesReport.activeRoutes.length > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Recorridos activos ({referencesReport.activeRoutes.length})</ItemTitle>
                        <ItemDescription>
                          {referencesReport.activeRoutes
                            .map((route) => `${route.code} (${route.name})`)
                            .join(", ")}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.containersCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Contenedores asociados:</ItemTitle>
                        <ItemDescription>{referencesReport.containersCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.treesCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Árboles censados:</ItemTitle>
                        <ItemDescription>{referencesReport.treesCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                  {referencesReport.greenSpacesCount > 0 ? (
                    <Item size="xs">
                      <ItemContent>
                        <ItemTitle>Espacios verdes:</ItemTitle>
                        <ItemDescription>{referencesReport.greenSpacesCount}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ) : null}
                </ItemGroup>
                <p className="mt-2">
                  El backend no realiza control de integridad referencial; los elementos asociados seguirán vinculados a una zona inactiva.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </CatalogDeactivationDialog>
    </section>
  );
}
