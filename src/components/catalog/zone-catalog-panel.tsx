"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import { Skeleton } from "@/components/ui/skeleton";
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

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: Zone[] }
  | { status: "error"; message: string };

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
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit state
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; active: boolean }>({
    name: "",
    active: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Deactivate confirmation state
  const [deactivatingZone, setDeactivatingZone] = useState<Zone | null>(null);
  const [referencesReport, setReferencesReport] = useState<ZoneReferenceReport | null>(null);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  // Neighborhood assignment state
  const [neighborhoodZone, setNeighborhoodZone] = useState<Zone | null>(null);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<Neighborhood[]>([]);
  const [assignedNeighborhoods, setAssignedNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedNeighborhoodIds, setSelectedNeighborhoodIds] = useState<string[]>([]);
  const [neighborhoodError, setNeighborhoodError] = useState<string | null>(null);
  const [neighborhoodNotice, setNeighborhoodNotice] = useState<string | null>(null);
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
    setCreateError(null);
    setIsSubmittingCreate(true);
    try {
      await zonesAdapter.create(createDraft);
      setShowCreate(false);
      setCreateDraft({ code: "", name: "" });
      setRequestVersion((v) => v + 1);
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setCreateError(caught.message);
      } else {
        setCreateError("Error inesperado al crear la zona operativa.");
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Start edit
  const handleStartEdit = (zone: Zone) => {
    setEditingZone(zone);
    setEditDraft({ name: zone.name, active: zone.active });
    setEditError(null);
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await zonesAdapter.update(editingZone.id, editDraft);
      setEditingZone(null);
      setRequestVersion((v) => v + 1);
    } catch (caught) {
      if (caught instanceof ZoneRequestError) {
        setEditError(caught.message);
      } else {
        setEditError("Error al actualizar la zona operativa.");
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Start deactivation with reference check
  const handleStartDeactivate = async (zone: Zone) => {
    setDeactivatingZone(zone);
    setIsLoadingReferences(true);
    try {
      const report = await zonesAdapter.checkReferences(zone.id);
      setReferencesReport(report);
    } catch {
      // Fallback: report with 0 references
      setReferencesReport({
        zoneId: zone.id,
        activeRoutes: [],
        containersCount: 0,
        treesCount: 0,
        greenSpacesCount: 0,
        totalReferences: 0,
      });
    } finally {
      setIsLoadingReferences(false);
    }
  };

  // Confirm deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivatingZone) return;
    setIsSubmittingDeactivate(true);
    try {
      await zonesAdapter.delete(deactivatingZone.id);
      setDeactivatingZone(null);
      setReferencesReport(null);
      setRequestVersion((v) => v + 1);
    } catch {
      // Keep dialog open or show error
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
    setNeighborhoodNotice(null);
    setIsLoadingNeighborhoods(true);

    try {
      const [options, assigned] = await Promise.all([
        neighborhoodsAdapter.search(),
        neighborhoodsAdapter.resolveIds(zone.neighborhoodIds),
      ]);
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
    setNeighborhoodNotice(null);
    setIsSubmittingNeighborhoods(true);

    try {
      const updated = await zonesAdapter.assignNeighborhoods(neighborhoodZone.id, {
        neighborhoodIds: selectedNeighborhoodIds,
      });
      updateZoneInState(updated);
      setNeighborhoodZone(updated);
      setAssignedNeighborhoods(await neighborhoodsAdapter.resolveIds(updated.neighborhoodIds));
      setSelectedNeighborhoodIds([]);
      setNeighborhoodNotice("Barrios asignados correctamente.");
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
    setNeighborhoodNotice(null);
    setRemovingNeighborhoodId(neighborhoodId);

    try {
      const updated = await zonesAdapter.removeNeighborhood(neighborhoodZone.id, neighborhoodId);
      updateZoneInState(updated);
      setNeighborhoodZone(updated);
      setAssignedNeighborhoods(await neighborhoodsAdapter.resolveIds(updated.neighborhoodIds));
      setNeighborhoodNotice("Barrio quitado de la zona.");
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
    setNeighborhoodNotice(null);
    setSelectedNeighborhoodIds([]);
  };

  return (
    <section aria-labelledby="zones-catalog-heading" className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              nativeButton={false}
              render={<Link href="/app?destination=catalog" />}
              variant="ghost"
              size="sm"
              className="gap-1 px-2 text-xs text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Catálogo
            </Button>
          </div>
          <h1 id="zones-catalog-heading" className="text-2xl font-semibold tracking-tight">
            Zonas operativas
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuración de áreas operativas para asignación de cuadrillas y recorridos de recolección.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setCreateError(null);
            }}
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva zona
          </Button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_200px]">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Buscar
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="Buscar zonas operativas"
              className={`${formControlClass} w-full pl-9`}
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Estado
          <select
            aria-label="Filtrar por estado"
            className={formControlClass}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
          >
            <option value="all">Todos</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </label>
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

          {createError && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="create-zone-code">Código</FieldLabel>
              <input
                id="create-zone-code"
                required
                className={formControlClass}
                placeholder="Ej. Z-04"
                value={createDraft.code}
                aria-invalid={Boolean(createError)}
                aria-describedby={createError ? "create-zone-code-error" : undefined}
                onChange={(e) => setCreateDraft({ ...createDraft, code: e.target.value })}
              />
              <FieldError id="create-zone-code-error" role="none">{createError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="create-zone-name">Nombre</FieldLabel>
              <input
                id="create-zone-name"
                required
                className={formControlClass}
                placeholder="Ej. Zona Centro Este"
                value={createDraft.name}
                onChange={(e) => setCreateDraft({ ...createDraft, name: e.target.value })}
              />
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

          {editError && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {editError}
            </div>
          )}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-zone-code">Código (inmutable)</FieldLabel>
              <input
                id="edit-zone-code"
                readOnly
                aria-readonly="true"
                className={`${formControlClass} bg-muted/50 cursor-not-allowed`}
                value={editingZone.code}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-zone-name">Nombre</FieldLabel>
              <input
                id="edit-zone-name"
                required
                className={formControlClass}
                value={editDraft.name}
                aria-invalid={Boolean(editError)}
                aria-describedby={editError ? "edit-zone-name-error" : undefined}
                onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
              />
              <FieldError id="edit-zone-name-error" role="none">{editError}</FieldError>
            </Field>

            <div className="sm:col-span-2 flex items-center gap-2 pt-2">
              <input
                id="edit-zone-active"
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={editDraft.active}
                onChange={(e) => setEditDraft({ ...editDraft, active: e.target.checked })}
              />
              <label htmlFor="edit-zone-active" className="text-sm font-medium">
                Zona activa para asignaciones
              </label>
            </div>
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
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5">
          <p className="text-destructive font-medium">{state.message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 gap-1.5"
            onClick={() => setRequestVersion((v) => v + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
                    {zone.neighborhoodIds.length > 0
                      ? `${zone.neighborhoodIds.length} ${zone.neighborhoodIds.length === 1 ? "barrio" : "barrios"}`
                      : "Sin barrios"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        zone.active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {zone.active ? "Activa" : "Inactiva"}
                    </span>
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
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {neighborhoodError}
            </div>
          )}
          {neighborhoodNotice && (
            <div role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
              {neighborhoodNotice}
            </div>
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Cargando barrios...
                </div>
              ) : assignedNeighborhoods.length === 0 ? (
                <p className="rounded-md border border-dashed border-[var(--color-border-strong)] p-3 text-sm text-muted-foreground">
                  Esta zona todavía no tiene barrios asignados.
                </p>
              ) : (
                <ul className="divide-y rounded-md border border-border" aria-label="Barrios asignados">
                  {assignedNeighborhoods.map((neighborhood) => (
                    <li key={neighborhood.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{neighborhood.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{neighborhood.id}</p>
                      </div>
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
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
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
                  <input
                    id="neighborhood-search"
                    className={`${formControlClass} w-full pl-9`}
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
                    const isAssigned = neighborhoodZone?.neighborhoodIds.includes(neighborhood.id) ?? false;
                    const isSelected = selectedNeighborhoodIds.includes(neighborhood.id);
                    return (
                      <label
                        key={neighborhood.id}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 ${
                          isAssigned ? "cursor-not-allowed bg-muted/50" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned || isSelected}
                          disabled={isAssigned || isSubmittingNeighborhoods}
                          onChange={(event) => {
                            setSelectedNeighborhoodIds((current) =>
                              event.target.checked
                                ? [...current, neighborhood.id]
                                : current.filter((id) => id !== neighborhood.id),
                            );
                          }}
                          className="h-4 w-4 rounded border-[var(--color-border-strong)] text-primary focus:ring-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{neighborhood.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{neighborhood.id}</span>
                        </span>
                        {isAssigned && <Check className="h-4 w-4 text-primary" aria-label="Ya asignado" />}
                      </label>
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
                {isSubmittingNeighborhoods && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
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

      {/* Deactivate confirmation dialog */}
      <Dialog
        open={Boolean(deactivatingZone)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingZone(null);
            setReferencesReport(null);
          }
        }}
      >
        <DialogContent aria-labelledby="confirm-deactivate-title">
          <DialogHeader>
            <DialogTitle id="confirm-deactivate-title" className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Confirmar baja de zona operativa
            </DialogTitle>
            <DialogDescription>
              {deactivatingZone && (
                <span>
                  Zona: <strong>{deactivatingZone.code}</strong> — {deactivatingZone.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingReferences ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando referencias de la zona...
            </div>
          ) : referencesReport && referencesReport.totalReferences > 0 ? (
            <div className="flex flex-col gap-3 py-2 text-sm">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="font-medium text-amber-900 dark:text-amber-300">
                  Advertencia: esta zona todavía cuenta con elementos activos referenciados:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-amber-800 dark:text-amber-400">
                  {referencesReport.activeRoutes.length > 0 && (
                    <li>
                      <strong>Recorridos activos ({referencesReport.activeRoutes.length}):</strong>{" "}
                      {referencesReport.activeRoutes.map((r) => `${r.code} (${r.name})`).join(", ")}
                    </li>
                  )}
                  {referencesReport.containersCount > 0 && (
                    <li>
                      <strong>Contenedores asociados:</strong> {referencesReport.containersCount}
                    </li>
                  )}
                  {referencesReport.treesCount > 0 && (
                    <li>
                      <strong>Árboles censados:</strong> {referencesReport.treesCount}
                    </li>
                  )}
                  {referencesReport.greenSpacesCount > 0 && (
                    <li>
                      <strong>Espacios verdes:</strong> {referencesReport.greenSpacesCount}
                    </li>
                  )}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                El backend no realiza control de integridad referencial. Si desactiva la zona, los elementos asociados
                continuarán vinculados a una zona inactiva.
              </p>
              <p className="font-semibold text-foreground">
                ¿Desea dar de baja la zona de todas formas?
              </p>
            </div>
          ) : (
            <div className="py-2 text-sm">
              <p>
                La zona no posee referencias activas en recorridos, contenedores, árboles ni espacios verdes.
              </p>
              <p className="mt-2 font-medium">
                ¿Confirmar la baja lógica de la zona operativa?
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeactivatingZone(null);
                setReferencesReport(null);
              }}
              disabled={isSubmittingDeactivate}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={isSubmittingDeactivate || isLoadingReferences}
            >
              {isSubmittingDeactivate ? "Dando de baja..." : "Dar de baja de todas formas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
