"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Trash2,
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  type CreateRouteInput,
  type Route,
  type RouteReferenceReport,
  RouteRequestError,
  routesAdapter,
} from "@/lib/routes";
import { type Zone, zonesAdapter } from "@/lib/zones";

const controlClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: Route[] }
  | { status: "error"; message: string };

export function RouteCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage =
    scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("route:manage");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  // Available zones for filtering
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  // Selected route for Detail View
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateRouteInput>({ code: "", name: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit state
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; active: boolean }>({
    name: "",
    active: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Deactivate confirmation state
  const [deactivatingRoute, setDeactivatingRoute] = useState<Route | null>(null);
  const [referencesReport, setReferencesReport] = useState<RouteReferenceReport | null>(null);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  // Load available zones once
  useEffect(() => {
    let isCurrent = true;
    async function loadZones() {
      try {
        const page = await zonesAdapter.list({ active: true });
        if (isCurrent) {
          setAvailableZones(page.zones);
        }
      } catch {
        // Non-blocking fallback
      }
    }
    void loadZones();
    return () => {
      isCurrent = false;
    };
  }, []);

  // Load routes
  useEffect(() => {
    let isCurrent = true;
    async function requestRoutes() {
      try {
        const activeParam =
          activeFilter === "all" ? undefined : activeFilter === "true";
        const zoneIdParam = zoneFilter === "all" ? undefined : zoneFilter;

        const page = await routesAdapter.list({
          search: search.trim() || undefined,
          active: activeParam,
          zoneId: zoneIdParam,
        });
        if (isCurrent) {
          setState({ status: "ready", items: page.routes });
          // If a route is currently selected, keep its reference fresh
          if (selectedRoute) {
            const fresh = page.routes.find((r) => r.id === selectedRoute.id);
            if (fresh) {
              setSelectedRoute(fresh);
            }
          }
        }
      } catch (caught) {
        if (isCurrent) {
          const message =
            caught instanceof RouteRequestError
              ? caught.message
              : "No se pudieron cargar los recorridos.";
          setState({ status: "error", message });
        }
      }
    }

    void requestRoutes();
    return () => {
      isCurrent = false;
    };
  }, [search, activeFilter, zoneFilter, requestVersion, selectedRoute]);

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    if (!createDraft.code.trim() || !createDraft.name.trim()) {
      setCreateError("El código y el nombre son obligatorios.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const created = await routesAdapter.create({
        code: createDraft.code.trim(),
        name: createDraft.name.trim(),
      });
      setShowCreate(false);
      setCreateDraft({ code: "", name: "" });
      // Acceptance Criteria #2:
      // "A newly created Route (which nace sin paradas) lands on its own detail view
      // with an empty stops section and an obvious call-to-action, not an auto-redirect into stop-editing mode."
      setSelectedRoute(created);
      setRequestVersion((v) => v + 1);
    } catch (caught) {
      const message =
        caught instanceof RouteRequestError
          ? caught.message
          : "No se pudo crear el recorrido. Intente nuevamente.";
      setCreateError(message);
    } finally {
      setIsSubmittingCreate(false);
    }
  }

  function handleOpenEdit(route: Route) {
    setEditingRoute(route);
    setEditDraft({ name: route.name, active: route.active });
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingRoute) return;
    setEditError(null);
    if (!editDraft.name.trim()) {
      setEditError("El nombre es obligatorio.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await routesAdapter.update(editingRoute.id, {
        name: editDraft.name.trim(),
        active: editDraft.active,
      });
      setEditingRoute(null);
      if (selectedRoute?.id === updated.id) {
        setSelectedRoute(updated);
      }
      setRequestVersion((v) => v + 1);
    } catch (caught) {
      const message =
        caught instanceof RouteRequestError
          ? caught.message
          : "No se pudo actualizar el recorrido. Intente nuevamente.";
      setEditError(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  async function handleOpenDeactivate(route: Route) {
    setDeactivatingRoute(route);
    setIsLoadingReferences(true);
    try {
      const report = await routesAdapter.checkReferences(route.id);
      setReferencesReport(report);
    } catch {
      setReferencesReport({
        routeId: route.id,
        activeServiceFrequencies: [],
        totalReferences: 0,
      });
    } finally {
      setIsLoadingReferences(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingRoute) return;
    setIsSubmittingDeactivate(true);
    try {
      const updated = await routesAdapter.delete(deactivatingRoute.id);
      setDeactivatingRoute(null);
      setReferencesReport(null);
      if (selectedRoute?.id === updated.id) {
        setSelectedRoute(updated);
      }
      setRequestVersion((v) => v + 1);
    } catch {
      // Deactivate failed
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Back navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/catalog"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a Catálogos
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Catálogo de Recorridos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestione los recorridos operativos para la planificación y ejecución de servicios.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5"
              data-testid="create-route-button"
            >
              <Plus className="h-4 w-4" />
              Nuevo recorrido
            </Button>
          </div>
        )}
      </div>

      {/* Detail View of Selected Route (Lands here after creation or clicking Ver Detalle) */}
      {selectedRoute && (
        <section
          className="rounded-lg border bg-card p-6 shadow-xs space-y-5"
          data-testid="route-detail-view"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-mono font-medium text-secondary-foreground">
                  {selectedRoute.code}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedRoute.active
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedRoute.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {selectedRoute.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(selectedRoute)}
                    className="inline-flex items-center gap-1 text-xs"
                    data-testid="detail-edit-button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  {selectedRoute.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDeactivate(selectedRoute)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10"
                      data-testid="detail-deactivate-button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Desactivar
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoute(null)}
                className="text-xs"
              >
                Cerrar detalle
              </Button>
            </div>
          </div>

          {/* Stops Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-muted-foreground" />
                Paradas del recorrido ({selectedRoute.stops.length})
              </h3>
            </div>

            {selectedRoute.stops.length === 0 ? (
              /* Acceptance Criteria #2: Empty stops section with obvious call-to-action */
              <div
                className="rounded-lg border border-dashed p-6 text-center space-y-3 bg-muted/20"
                data-testid="empty-stops-section"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">
                    Este recorrido no tiene paradas configuradas
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Los recorridos nuevos nacen sin paradas. Para diagramar y ordenar la secuencia de paradas operativas, utilice el generador de secuencias.
                  </p>
                </div>
                <div>
                  <Button
                    variant="default"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                    data-testid="add-stops-cta"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar paradas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y rounded-md border bg-background" data-testid="stops-list">
                {selectedRoute.stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                        {stop.sequence}
                      </span>
                      <div>
                        <div className="font-medium text-foreground">
                          {stop.zone?.name ?? `Zona ${stop.zoneId}`}
                        </div>
                        {stop.zone?.code && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {stop.zone.code}
                          </div>
                        )}
                      </div>
                    </div>
                    {stop.estimatedDurationMin !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{stop.estimatedDurationMin} min</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Filters band */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${controlClass} pl-9 w-full`}
              data-testid="search-routes-input"
            />
          </div>

          {/* Active status filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="route-active-filter" className="text-xs text-muted-foreground whitespace-nowrap">
              Estado:
            </label>
            <select
              id="route-active-filter"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
              className={controlClass}
              data-testid="active-filter-select"
            >
              <option value="all">Todos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
          </div>

          {/* Zone filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="route-zone-filter" className="text-xs text-muted-foreground whitespace-nowrap">
              Zona:
            </label>
            <select
              id="route-zone-filter"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className={controlClass}
              data-testid="zone-filter-select"
            >
              <option value="all">Todas las zonas</option>
              {availableZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRequestVersion((v) => v + 1)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto"
          title="Refrescar listado"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refrescar
        </Button>
      </div>

      {/* Routes list table / content */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        {state.status === "loading" && (
          <div className="p-6 space-y-4" data-testid="routes-loading">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {state.status === "error" && (
          <div className="p-6">
            <Empty>
              <EmptyHeader>
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <EmptyTitle>Error al cargar recorridos</EmptyTitle>
                <EmptyDescription>{state.message}</EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestVersion((v) => v + 1)}
                className="mt-4"
              >
                Reintentar
              </Button>
            </Empty>
          </div>
        )}

        {state.status === "ready" && state.items.length === 0 && (
          <div className="p-8 text-center" data-testid="empty-routes-state">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No se encontraron recorridos</EmptyTitle>
                <EmptyDescription>
                  {search || activeFilter !== "all" || zoneFilter !== "all"
                    ? "No hay recorridos que coincidan con los filtros seleccionados."
                    : "No hay recorridos registrados en el catálogo."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <Button
                  onClick={() => setShowCreate(true)}
                  size="sm"
                  className="mt-4 inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Crear primer recorrido
                </Button>
              )}
            </Empty>
          </div>
        )}

        {state.status === "ready" && state.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="routes-table">
              <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Paradas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {state.items.map((route) => (
                  <tr
                    key={route.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`route-row-${route.id}`}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {route.code}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {route.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {route.stops.length === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Sin paradas
                        </span>
                      ) : (
                        <span>{route.stops.length} {route.stops.length === 1 ? "parada" : "paradas"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          route.active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {route.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRoute(route)}
                          className="h-8 px-2 text-xs"
                          title="Ver detalle"
                          data-testid={`view-route-${route.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detalle
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(route)}
                              className="h-8 px-2 text-xs"
                              title="Editar recorrido"
                              data-testid={`edit-route-${route.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            {route.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeactivate(route)}
                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                title="Desactivar recorrido"
                                data-testid={`deactivate-route-${route.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Desactivar</span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Recorrido */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Nuevo recorrido</DialogTitle>
              <DialogDescription>
                Registre un recorrido operativo. El código asignado será inmutable tras la creación.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div
                className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium"
                data-testid="create-route-error"
              >
                {createError}
              </div>
            )}

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel htmlFor="create-route-code">Código del recorrido</FieldLabel>
                <input
                  id="create-route-code"
                  type="text"
                  placeholder="Ej: REC-004"
                  value={createDraft.code}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, code: e.target.value }))}
                  className={`${controlClass} w-full`}
                  disabled={isSubmittingCreate}
                  data-testid="create-route-code-input"
                />
                <FieldDescription>
                  Identificador único (inmutable tras la creación).
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="create-route-name">Nombre descriptivo</FieldLabel>
                <input
                  id="create-route-name"
                  type="text"
                  placeholder="Ej: Recorrido Nocturno San Telmo"
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
                  className={`${controlClass} w-full`}
                  disabled={isSubmittingCreate}
                  data-testid="create-route-name-input"
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={isSubmittingCreate}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCreate}
                data-testid="submit-create-route"
              >
                {isSubmittingCreate && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Crear recorrido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Recorrido (Código inmutable) */}
      <Dialog
        open={editingRoute !== null}
        onOpenChange={(open) => !open && setEditingRoute(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Editar recorrido</DialogTitle>
              <DialogDescription>
                Modifique los datos operativos del recorrido.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div
                className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium"
                data-testid="edit-route-error"
              >
                {editError}
              </div>
            )}

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel htmlFor="edit-route-code">Código</FieldLabel>
                <input
                  id="edit-route-code"
                  type="text"
                  value={editingRoute?.code ?? ""}
                  readOnly
                  disabled
                  className={`${controlClass} w-full bg-muted font-mono cursor-not-allowed`}
                  data-testid="edit-route-code-readonly"
                />
                <FieldDescription>
                  El código es inmutable tras la creación.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-route-name">Nombre descriptivo</FieldLabel>
                <input
                  id="edit-route-name"
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  className={`${controlClass} w-full`}
                  disabled={isSubmittingEdit}
                  data-testid="edit-route-name-input"
                />
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-route-active"
                  checked={editDraft.active}
                  onChange={(e) => setEditDraft((d) => ({ ...d, active: e.target.checked }))}
                  disabled={isSubmittingEdit}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  data-testid="edit-route-active-checkbox"
                />
                <label htmlFor="edit-route-active" className="text-sm font-medium text-foreground">
                  Recorrido activo
                </label>
              </div>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRoute(null)}
                disabled={isSubmittingEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                data-testid="submit-edit-route"
              >
                {isSubmittingEdit && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmación de desactivación con advertencia de referencias de ServiceFrequency */}
      <Dialog
        open={deactivatingRoute !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingRoute(null);
            setReferencesReport(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desactivar recorrido
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea desactivar el recorrido{" "}
              <strong>{deactivatingRoute?.code} ({deactivatingRoute?.name})</strong>?
            </DialogDescription>
          </DialogHeader>

          {isLoadingReferences ? (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando referencias a frecuencias de servicio...
            </div>
          ) : (
            referencesReport && (
              <div className="space-y-3">
                {referencesReport.totalReferences > 0 ? (
                  /* Acceptance Criteria #3: Warns when referenced by active ServiceFrequency */
                  <div
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2"
                    data-testid="references-warning-dialog"
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      Advertencia: El recorrido está asignado a frecuencias de servicio activas
                    </div>
                    <p>
                      El backend no realiza control referencial automático. Desactivar este recorrido mantendrá las frecuencias existentes pero podría impactar en la programación operativa futura.
                    </p>
                    <div className="rounded border bg-background/50 p-2 space-y-1 mt-1">
                      <div className="font-medium text-xs">Frecuencias activas ({referencesReport.activeServiceFrequencies.length}):</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {referencesReport.activeServiceFrequencies.map((freq) => (
                          <li key={freq.id}>
                            <strong>{freq.serviceTypeName}</strong> — Turno {freq.shift} ({freq.weekdays.join(", ")})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-md">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No se detectaron frecuencias de servicio activas referenciando este recorrido.
                  </div>
                )}
              </div>
            )
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeactivatingRoute(null);
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
              data-testid="confirm-deactivate-button"
            >
              {isSubmittingDeactivate && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Confirmar desactivación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
