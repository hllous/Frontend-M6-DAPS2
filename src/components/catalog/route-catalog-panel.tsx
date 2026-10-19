"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Trash2,
} from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { notifySuccess } from "@/components/ui/feedback";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  type CreateRouteInput,
  type Route,
  type RouteReferenceReport,
  type RouteStopInput,
  RouteRequestError,
  routesAdapter,
} from "@/lib/routes";
import { type Zone, zonesAdapter } from "@/lib/zones";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: Route[] }
  | { status: "error"; message: string };

type StalenessWarningReason = "changed" | "unavailable" | null;

function stopSequenceSignature(stops: Route["stops"]) {
  return JSON.stringify(
    stops
      .map((stop) => ({
        zoneId: stop.zoneId,
        order: stop.sequence,
        estimatedDurationMin: stop.estimatedDurationMin,
      }))
      .sort((left, right) => left.order - right.order),
  );
}

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
  const selectedRouteId = selectedRoute?.id;

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
  const [referencesUnavailable, setReferencesUnavailable] = useState(false);
  const [referencesAcknowledged, setReferencesAcknowledged] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Stop sequence editor state (#111)
  type StopDraftItem = {
    tempId: string;
    zoneId: string;
    estimatedDurationMin: number;
    zoneName: string;
    zoneCode?: string;
  };
  const [isEditingStops, setIsEditingStops] = useState(false);
  const [initialUpdatedAt, setInitialUpdatedAt] = useState<string | null>(null);
  const [initialStopsSignature, setInitialStopsSignature] = useState("");
  const [draftStops, setDraftStops] = useState<StopDraftItem[]>([]);
  const [newStopZoneId, setNewStopZoneId] = useState("");
  const [newStopDuration, setNewStopDuration] = useState(30);
  const [stopEditorError, setStopEditorError] = useState<string | null>(null);
  const [isSavingStops, setIsSavingStops] = useState(false);
  const [stalenessWarningReason, setStalenessWarningReason] = useState<StalenessWarningReason>(null);

  // Load available zones once
  useEffect(() => {
    let isCurrent = true;
    async function loadZones() {
      try {
        const page = await zonesAdapter.list({ active: true, pageSize: 100 });
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
          if (selectedRouteId) {
            const fresh = page.routes.find((r) => r.id === selectedRouteId);
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
  }, [search, activeFilter, zoneFilter, requestVersion, selectedRouteId]);

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
      notifySuccess("Recorrido creado.");
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
      notifySuccess("Cambios guardados.");
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
    setReferencesReport(null);
    setReferencesUnavailable(false);
    setReferencesAcknowledged(false);
    setDeactivateError(null);
    setIsLoadingReferences(true);
    try {
      const report = await routesAdapter.checkReferences(route.id);
      setReferencesReport(report);
    } catch {
      setReferencesUnavailable(true);
    } finally {
      setIsLoadingReferences(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingRoute || isLoadingReferences || (referencesUnavailable && !referencesAcknowledged)) return;
    setIsSubmittingDeactivate(true);
    try {
      const updated = await routesAdapter.delete(deactivatingRoute.id);
      setDeactivatingRoute(null);
      setReferencesReport(null);
      if (selectedRoute?.id === updated.id) {
        setSelectedRoute(updated);
      }
      setRequestVersion((v) => v + 1);
      notifySuccess("Recorrido dado de baja.");
    } catch (caught) {
      setDeactivateError(caught instanceof RouteRequestError ? caught.message : "No se pudo dar de baja el recorrido.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  function handleOpenStopEditor() {
    if (!selectedRoute) return;
    setInitialUpdatedAt(selectedRoute.updatedAt ?? null);
    setInitialStopsSignature(stopSequenceSignature(selectedRoute.stops));
    setDraftStops(
      selectedRoute.stops.map((s, idx) => ({
        tempId: s.id || `stop-draft-${idx}-${Date.now()}`,
        zoneId: s.zoneId,
        estimatedDurationMin: s.estimatedDurationMin,
        zoneName: s.zoneName,
        zoneCode: s.zoneCode,
      })),
    );
    setNewStopZoneId("");
    setNewStopDuration(30);
    setStopEditorError(null);
    setStalenessWarningReason(null);
    setIsEditingStops(true);
  }

  function handleAddStop() {
    setStopEditorError(null);
    if (!newStopZoneId) {
      setStopEditorError("Debe seleccionar una zona para la parada.");
      return;
    }
    const zone = availableZones.find((z) => z.id === newStopZoneId);
    if (!zone) {
      setStopEditorError("La zona seleccionada no es válida.");
      return;
    }
    // Client-side duplicate check (acceptance criterion 2)
    if (draftStops.some((s) => s.zoneId === newStopZoneId)) {
      setStopEditorError(`Una zona no puede repetirse en el mismo recorrido: ${zone.name}.`);
      return;
    }
    const duration = Number(newStopDuration);
    if (isNaN(duration) || duration < 1 || duration > 1440) {
      setStopEditorError("La duración estimada debe ser un número entero entre 1 y 1440 minutos.");
      return;
    }

    setDraftStops((prev) => [
      ...prev,
      {
        tempId: `stop-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        zoneId: zone.id,
        estimatedDurationMin: Math.round(duration),
        zoneName: zone.name,
        zoneCode: zone.code,
      },
    ]);
    setNewStopZoneId("");
    setNewStopDuration(30);
  }

  function handleRemoveStop(index: number) {
    setStopEditorError(null);
    setDraftStops((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMoveStop(index: number, direction: "up" | "down") {
    setStopEditorError(null);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftStops.length) return;
    setDraftStops((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function handleDurationChange(index: number, value: number) {
    setDraftStops((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], estimatedDurationMin: value };
      }
      return next;
    });
  }

  async function handleSaveStopsInitiate() {
    if (!selectedRoute) return;
    setStopEditorError(null);

    // Validate stops durations
    for (let i = 0; i < draftStops.length; i++) {
      const stop = draftStops[i];
      if (
        !stop ||
        isNaN(stop.estimatedDurationMin) ||
        stop.estimatedDurationMin < 1 ||
        stop.estimatedDurationMin > 1440
      ) {
        setStopEditorError(
          "Cada parada debe tener una duración estimada válida entre 1 y 1440 minutos.",
        );
        return;
      }
    }
    const zoneIds = draftStops.map((s) => s.zoneId);
    const duplicates = zoneIds.filter((z, i) => zoneIds.indexOf(z) !== i);
    if (duplicates.length > 0) {
      setStopEditorError("Una zona no puede repetirse en el mismo recorrido.");
      return;
    }

    setIsSavingStops(true);
    // Advisory staleness check (criterion 4)
    try {
      const fresh = await routesAdapter.get(selectedRoute.id);
      const routeDetailsChanged = Boolean(
        initialUpdatedAt && fresh.updatedAt && fresh.updatedAt !== initialUpdatedAt,
      );
      const stopsChanged = stopSequenceSignature(fresh.stops) !== initialStopsSignature;
      if (routeDetailsChanged || stopsChanged) {
        // Staleness detected! Advisory warning
        setStalenessWarningReason("changed");
        setIsSavingStops(false);
        return;
      }
    } catch {
      setStalenessWarningReason("unavailable");
      setIsSavingStops(false);
      return;
    }

    await executeSaveStops();
  }

  async function executeSaveStops() {
    if (!selectedRoute) return;
    setIsSavingStops(true);
    setStopEditorError(null);
    setStalenessWarningReason(null);

    try {
      const updated = await routesAdapter.setStops(selectedRoute.id, {
        stops: draftStops.map((s) => ({
          zoneId: s.zoneId,
          estimatedDurationMin: s.estimatedDurationMin,
        })),
      });
      setSelectedRoute(updated);
      setIsEditingStops(false);
      setRequestVersion((v) => v + 1);
      notifySuccess("Secuencia de paradas guardada.");
    } catch (caught) {
      const message =
        caught instanceof RouteRequestError
          ? caught.message
          : errorMessage(caught, "No se pudo guardar la secuencia de paradas.");
      setStopEditorError(message);
    } finally {
      setIsSavingStops(false);
    }
  }

  function handleCancelStopEditor() {
    setIsEditingStops(false);
    setStopEditorError(null);
    setStalenessWarningReason(null);
  }

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Recorridos"
        description="Gestione los recorridos operativos para la planificación y ejecución de servicios."
        actions={canManage ? (
          <Button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5"
            data-testid="create-route-button"
          >
            <Plus className="h-4 w-4" />
            Nuevo recorrido
          </Button>
        ) : null}
      />

      {/* Detail View of Selected Route (Lands here after creation or clicking Ver Detalle) */}
      {selectedRoute && (
        <section
          className="rounded-lg border bg-card p-6 space-y-5"
          data-testid="route-detail-view"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-mono font-medium text-secondary-foreground">
                  {selectedRoute.code}
                </span>
                <Badge variant={selectedRoute.active ? "success" : "secondary"}>
                  {selectedRoute.active ? "Activo" : "Inactivo"}
                </Badge>
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
                onClick={() => {
                  setSelectedRoute(null);
                  setIsEditingStops(false);
                }}
                className="text-xs"
              >
                Cerrar detalle
              </Button>
            </div>
          </div>

          {/* Stops Section */}
          <div className="space-y-3">
            {!isEditingStops ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <RouteIcon className="h-4 w-4 text-muted-foreground" />
                    Paradas del recorrido ({selectedRoute.stops.length})
                  </h3>
                  {canManage && selectedRoute.stops.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenStopEditor}
                      className="inline-flex items-center gap-1 text-xs"
                      data-testid="edit-stops-button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar secuencia
                    </Button>
                  )}
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
                      {canManage ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="inline-flex items-center gap-1.5"
                          onClick={handleOpenStopEditor}
                          data-testid="add-stops-cta"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar paradas
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Modo lectura: se requieren permisos de oficina para configurar paradas.
                        </span>
                      )}
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
                              {stop.zoneName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {stop.zoneCode}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{stop.estimatedDurationMin} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Stop Sequence Builder (#111) */
              <div
                className="rounded-lg border bg-card p-4 space-y-4"
                data-testid="stop-sequence-builder"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-primary" />
                      Editor de secuencia de paradas
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure el orden y la duración de cada parada. Al guardar, se reemplazará la secuencia de forma atómica.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelStopEditor}
                    disabled={isSavingStops}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                </div>

                {stopEditorError && (
                  <div
                    className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
                    data-testid="stop-editor-error"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{stopEditorError}</span>
                  </div>
                )}

                {/* Ordered sequence list */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-foreground">
                    Secuencia ordenada ({draftStops.length} {draftStops.length === 1 ? "parada" : "paradas"})
                  </div>

                  {draftStops.length === 0 ? (
                    <div
                      className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground bg-muted/10"
                      data-testid="builder-empty-stops"
                    >
                      No hay paradas en la secuencia. Puede guardar el recorrido sin paradas o agregar zonas debajo.
                    </div>
                  ) : (
                    <div className="divide-y rounded-md border bg-background" data-testid="builder-stops-list">
                      {draftStops.map((stop, idx) => (
                        <div
                          key={stop.tempId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 gap-3 text-sm"
                          data-testid={`stop-item-${idx}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-medium text-foreground">
                                {stop.zoneName}
                              </div>
                              {stop.zoneCode && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {stop.zoneCode}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 self-stretch sm:flex-nowrap sm:self-auto">
                            <div className="flex items-center gap-1.5">
                              <FieldLabel
                                htmlFor={`duration-${idx}`}
                                className="text-xs text-muted-foreground whitespace-nowrap"
                              >
                                Duración:
                              </FieldLabel>
                              <Input
                                id={`duration-${idx}`}
                                type="number"
                                min={1}
                                max={1440}
                                value={stop.estimatedDurationMin}
                                onChange={(e) => handleDurationChange(idx, Number(e.target.value))}
                                className="h-10 w-20 px-2 text-right text-xs"
                                data-testid={`stop-duration-input-${idx}`}
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                            <div className="flex items-center gap-1 sm:ml-2">
                              <Tooltip>
                                <TooltipTrigger render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveStop(idx, "up")}
                                    disabled={idx === 0}
                                    className="h-10 w-10 p-0 max-[760px]:h-12 max-[760px]:w-12"
                                    aria-label="Mover arriba"
                                    data-testid={`stop-move-up-${idx}`}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                } />
                                <TooltipContent>Mover arriba</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveStop(idx, "down")}
                                    disabled={idx === draftStops.length - 1}
                                    className="h-10 w-10 p-0 max-[760px]:h-12 max-[760px]:w-12"
                                    aria-label="Mover abajo"
                                    data-testid={`stop-move-down-${idx}`}
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                } />
                                <TooltipContent>Mover abajo</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStop(idx)}
                                    className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 max-[760px]:h-12 max-[760px]:w-12"
                                    aria-label="Quitar parada"
                                    data-testid={`stop-remove-${idx}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                } />
                                <TooltipContent>Quitar parada</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add stop form */}
                <div className="rounded-md border p-3 bg-muted/20 space-y-2">
                  <div className="text-xs font-medium text-foreground">
                    Agregar parada operativa al recorrido
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Field className="flex-1">
                      <FieldLabel htmlFor="stop-zone-select" className="mb-1 text-xs font-medium text-foreground">
                        Zona operativa
                      </FieldLabel>
                      <Select
                        value={newStopZoneId || null}
                        items={Object.fromEntries(
                          availableZones
                            .filter((zone) => zone.active)
                            .map((zone) => [
                              zone.id,
                              `${zone.code} — ${zone.name}${draftStops.some((stop) => stop.zoneId === zone.id) ? " (Ya en recorrido)" : ""}`,
                            ]),
                        )}
                        onValueChange={(value) => setNewStopZoneId(value ?? "")}
                      >
                        <SelectTrigger id="stop-zone-select" aria-label="Zona operativa" data-testid="stop-zone-select" className="text-xs">
                          <SelectValue placeholder="Seleccione una zona operativa activa..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {availableZones
                              .filter((z) => z.active)
                              .map((z) => {
                                const isAlreadyAdded = draftStops.some((s) => s.zoneId === z.id);
                                return (
                                  <SelectItem key={z.id} value={z.id}>
                                    {z.code} — {z.name}{isAlreadyAdded ? " (Ya en recorrido)" : ""}
                                  </SelectItem>
                                );
                              })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center gap-1.5">
                      <FieldLabel
                        htmlFor="new-stop-duration"
                        className="text-xs text-muted-foreground whitespace-nowrap"
                      >
                        Duración est.:
                      </FieldLabel>
                      <Input
                        id="new-stop-duration"
                        type="number"
                        min={1}
                        max={1440}
                        value={newStopDuration}
                        onChange={(e) => setNewStopDuration(Number(e.target.value))}
                        className="h-10 w-20 px-2 text-right text-xs"
                        data-testid="stop-duration-input"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddStop}
                      className="inline-flex h-10 items-center gap-1 text-xs max-[760px]:h-12"
                      data-testid="add-stop-button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar parada
                    </Button>
                  </div>
                </div>

                {/* Builder footer actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {draftStops.length === 0
                      ? "Guardar dejará el recorrido sin paradas."
                      : `${draftStops.length} ${draftStops.length === 1 ? "parada lista" : "paradas listas"} para guardar.`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelStopEditor}
                      disabled={isSavingStops}
                      data-testid="cancel-sequence-button"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => void handleSaveStopsInitiate()}
                      disabled={isSavingStops}
                      className="inline-flex items-center gap-1.5"
                      data-testid="save-sequence-button"
                    >
                      {isSavingStops && <Spinner aria-hidden="true" className="size-3.5" />}
                      Guardar secuencia
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Filters band */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative min-w-0 max-w-sm flex-1">
            <FieldLabel htmlFor="search-routes-input" className="mb-1 text-xs font-medium text-foreground">
              Buscar recorridos
            </FieldLabel>
            <div className="relative flex w-full items-center">
              <Search aria-hidden="true" className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-routes-input"
                type="text"
                placeholder="Buscar por código o nombre..."
                value={search}
                maxLength={MAX_SEARCH_LENGTH}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="search-routes-input"
              />
            </div>
          </div>

          {/* Active status filter */}
          <div className="flex items-center gap-2">
            <FieldLabel htmlFor="route-active-filter" className="text-xs text-muted-foreground whitespace-nowrap">
              Estado:
            </FieldLabel>
            <Select
              value={activeFilter}
              items={{ all: "Todos", true: "Solo activos", false: "Solo inactivos" }}
              onValueChange={(value) => setActiveFilter(value as "all" | "true" | "false")}
            >
              <SelectTrigger id="route-active-filter" aria-label="Estado:" data-testid="active-filter-select" className="sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Solo activos</SelectItem>
                  <SelectItem value="false">Solo inactivos</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Zone filter */}
          <div className="flex items-center gap-2">
            <FieldLabel htmlFor="route-zone-filter" className="text-xs text-muted-foreground whitespace-nowrap">
              Zona:
            </FieldLabel>
            <Select
              value={zoneFilter}
              items={Object.fromEntries([
                ["all", "Todas las zonas"],
                ...availableZones.map((zone) => [zone.id, `${zone.name} (${zone.code})`]),
              ])}
              onValueChange={(value) => setZoneFilter(value ?? "all")}
            >
              <SelectTrigger id="route-zone-filter" aria-label="Zona:" data-testid="zone-filter-select" className="sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {availableZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name} ({z.code})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRequestVersion((v) => v + 1)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Routes list table / content */}
      <div className="rounded-lg border bg-card overflow-hidden">
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
          <div className="relative overflow-x-auto">
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
                        <span className="font-medium text-[var(--color-warning)]">
                          Sin paradas
                        </span>
                      ) : (
                        <span>{route.stops.length} {route.stops.length === 1 ? "parada" : "paradas"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={route.active ? "success" : "secondary"}>
                        {route.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRoute(route)}
                          className="h-8 px-2 text-xs"
                          data-testid={`view-route-${route.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detalle
                        </Button>
                        {canManage && (
                          <>
                            <Tooltip>
                              <TooltipTrigger render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(route)}
                                  className="h-8 px-2 text-xs"
                                  aria-label="Editar recorrido"
                                  data-testid={`edit-route-${route.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              } />
                              <TooltipContent>Editar recorrido</TooltipContent>
                            </Tooltip>
                            {route.active && (
                              <Tooltip>
                                <TooltipTrigger render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDeactivate(route)}
                                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                    aria-label="Desactivar recorrido"
                                    data-testid={`deactivate-route-${route.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                } />
                                <TooltipContent>Desactivar recorrido</TooltipContent>
                              </Tooltip>
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
              <Alert variant="destructive" data-testid="create-route-error">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel htmlFor="create-route-code">Código del recorrido</FieldLabel>
                <Input
                  id="create-route-code"
                  type="text"
                  placeholder="Ej: REC-004"
                  value={createDraft.code}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, code: e.target.value }))}
                  disabled={isSubmittingCreate}
                  data-testid="create-route-code-input"
                  aria-invalid={Boolean(createError)}
                />
                <FieldDescription>
                  Identificador único (inmutable tras la creación).
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="create-route-name">Nombre descriptivo</FieldLabel>
                <Input
                  id="create-route-name"
                  type="text"
                  placeholder="Ej: Recorrido Nocturno San Telmo"
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
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
                {isSubmittingCreate && <Spinner aria-hidden="true" className="mr-1.5 size-3.5" />}
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
              <Alert variant="destructive" data-testid="edit-route-error">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel htmlFor="edit-route-code">Código</FieldLabel>
                <Input
                  id="edit-route-code"
                  type="text"
                  value={editingRoute?.code ?? ""}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className="bg-muted/50 font-mono"
                  data-testid="edit-route-code-readonly"
                />
                <FieldDescription>
                  El código es inmutable tras la creación.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-route-name">Nombre descriptivo</FieldLabel>
                <Input
                  id="edit-route-name"
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  disabled={isSubmittingEdit}
                  data-testid="edit-route-name-input"
                  aria-invalid={Boolean(editError)}
                />
              </Field>

              <Field orientation="horizontal" className="pt-1">
                <Checkbox
                  id="edit-route-active"
                  checked={editDraft.active}
                  onCheckedChange={(checked) => setEditDraft((d) => ({ ...d, active: checked === true }))}
                  disabled={isSubmittingEdit}
                  data-testid="edit-route-active-checkbox"
                />
                <FieldLabel htmlFor="edit-route-active" className="text-sm font-medium text-foreground">
                  Recorrido activo
                </FieldLabel>
              </Field>
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
                {isSubmittingEdit && <Spinner aria-hidden="true" className="mr-1.5 size-3.5" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CatalogDeactivationDialog
        open={deactivatingRoute !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingRoute(null);
            setReferencesReport(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del recorrido ${deactivatingRoute?.code ?? ""}`.trim()}
        consequence={`El recorrido ${deactivatingRoute?.code ?? ""} — ${deactivatingRoute?.name ?? ""} quedará inactivo. Las frecuencias existentes conservarán su referencia.`.trim()}
        confirmAction={`Dar de baja el recorrido ${deactivatingRoute?.code ?? ""}`.trim()}
        safeAlternative={`Conservar recorrido ${deactivatingRoute?.code ?? ""}`.trim()}
        confirmDisabled={isLoadingReferences || (referencesUnavailable && !referencesAcknowledged)}
        isSubmitting={isSubmittingDeactivate}
        onConfirm={() => void handleConfirmDeactivate()}
        contentClassName="sm:max-w-md"
        confirmDataTestId="confirm-deactivate-button"
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
        {isLoadingReferences ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Spinner aria-hidden="true" />
            Verificando referencias a frecuencias de servicio...
          </div>
        ) : referencesUnavailable ? (
          <div className="flex flex-col gap-3">
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>
                No se pudieron verificar las referencias. Si continúa, la baja puede afectar servicios o elementos que todavía usan este registro.
              </AlertDescription>
            </Alert>
            <Field>
              <FieldLabel className="flex min-h-10 cursor-pointer items-center gap-3 [@media(max-width:760px)]:min-h-12">
                <Checkbox checked={referencesAcknowledged} onCheckedChange={setReferencesAcknowledged} disabled={isSubmittingDeactivate} />
                Entiendo que no se verificaron las referencias
              </FieldLabel>
            </Field>
          </div>
        ) : referencesReport ? (
          referencesReport.totalReferences > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2 rounded-md border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-xs text-[var(--color-warning)]" data-testid="references-warning-dialog">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Advertencia: el recorrido está asignado a frecuencias de servicio activas
                </div>
                <p>El backend no realiza control referencial automático. Desactivar este recorrido mantendrá las frecuencias existentes pero podría impactar en la programación operativa futura.</p>
                <div className="mt-1 space-y-1 rounded border bg-background/50 p-2">
                  <div className="text-xs font-medium">Frecuencias activas ({referencesReport.activeServiceFrequencies.length}):</div>
                  <ItemGroup className="gap-1">
                    {referencesReport.activeServiceFrequencies.map((frequency) => (
                      <Item key={frequency.id} variant="outline" size="xs" className="border-0 bg-background/50">
                        <ItemContent>
                          <ItemTitle>
                            <strong>{frequency.serviceTypeName}</strong> — Turno {frequency.shift} ({frequency.weekdays.join(", ")})
                          </ItemTitle>
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-[var(--color-success-fill)] p-2.5 text-xs text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              No se detectaron frecuencias de servicio activas referenciando este recorrido.
            </div>
          )
        ) : null}
      </CatalogDeactivationDialog>

      {/* Staleness Advisory Warning Dialog (#111) */}
      <Dialog
        open={stalenessWarningReason !== null}
        onOpenChange={(open) => !open && setStalenessWarningReason(null)}
      >
        <DialogContent data-testid="staleness-warning-dialog" className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning-fill)] text-[var(--color-warning)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">
              {stalenessWarningReason === "unavailable"
                ? "No se pudo verificar el recorrido"
                : "Aviso de concurrencia en el recorrido"}
            </DialogTitle>
            <DialogDescription className="text-center space-y-2 text-xs">
              <span className="block text-foreground text-sm font-medium">
                {stalenessWarningReason === "unavailable"
                  ? "No se pudo comprobar si el recorrido fue modificado en el servidor."
                  : "El recorrido fue modificado en el servidor después de que abrió este editor."}
              </span>
              <span className="block rounded-md border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-2.5 text-left font-medium text-[var(--color-warning)]">
                {stalenessWarningReason === "unavailable"
                  ? "Aviso informativo: no fue posible verificar la secuencia actual. Si continúa, la secuencia completa reemplazará los cambios existentes en el servidor de forma atómica."
                  : "Aviso informativo (no autoritativo): El backend no posee control de concurrencia ni bloqueo optimista para paradas. Si continúa, la secuencia completa reemplazará los cambios existentes en el servidor de forma atómica."}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStalenessWarningReason(null)}
              disabled={isSavingStops}
              data-testid="cancel-staleness-button"
            >
              Cancelar y revisar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => void executeSaveStops()}
              disabled={isSavingStops}
              data-testid="confirm-staleness-save-button"
            >
              {isSavingStops && <Spinner aria-hidden="true" className="mr-1.5 size-3.5" />}
              Continuar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
