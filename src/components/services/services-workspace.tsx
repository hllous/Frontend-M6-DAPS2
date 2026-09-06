"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  FilterX,
  LayoutList,
  Map as MapIcon,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import type { OperationalScenario } from "@/lib/scenarios";
import { repairRequestsAdapter, type RepairRequest } from "@/lib/repair-requests";
import {
  ServiceRequestError,
  servicesAdapter,
  type Service,
  type ServiceOrigin,
  type ServiceQuery,
  type ServiceStatus,
} from "@/lib/services";
import { cn } from "@/lib/utils";
import { MapView } from "./map-view";
import { AssignCrewDialog } from "./assign-crew-dialog";
import { ScheduleServiceDialog } from "./schedule-service-dialog";
import { ServiceDetail } from "./service-detail";
import { ServicePreview } from "./service-preview";
import { SuspendServiceDialog } from "./suspend-service-dialog";
import { RescheduleReasonDialog } from "./reschedule-reason-dialog";
import { ConfirmRescheduleDialog } from "./confirm-reschedule-dialog";
import { CancelServiceDialog } from "./cancel-service-dialog";
import { CreateRepairRequestDialog } from "./create-repair-request-dialog";
import { CreateStreetClosureRequestDialog } from "./create-street-closure-request-dialog";
import {
  ServicesTable,
  type ColumnFilters,
  type SortDir,
  type SortKey,
} from "./services-table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; services: Service[] };

export function ServicesWorkspace({
  scenario,
  initialMapError = false,
}: {
  scenario?: OperationalScenario;
  initialMapError?: boolean;
}) {
  const nextSearchParams = useSearchParams();

  const getParam = useCallback((key: string): string | null => {
    if (nextSearchParams) return nextSearchParams.get(key);
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get(key);
    }
    return null;
  }, [nextSearchParams]);

  const getAllParams = useCallback((key: string): string[] => {
    if (nextSearchParams) return nextSearchParams.getAll(key);
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).getAll(key);
    }
    return [];
  }, [nextSearchParams]);

  // Load state
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [reloadVersion, setReloadVersion] = useState(0);

  // Global search
  const [search, setSearch] = useState<string>(() => getParam("q") ?? "");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const s = getParam("sort") as SortKey | null;
    return s && ["service", "zone", "status", "crew", "scheduled"].includes(s) ? s : "status";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    const d = getParam("dir") as SortDir | null;
    return d === "desc" ? "desc" : "asc";
  });

  // Column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(() => {
    const zones = new Set(getAllParams("zone"));
    const rawStatuses = getAllParams("status");
    const statuses = new Set<ServiceStatus>(
      rawStatuses.filter((st): st is ServiceStatus =>
        [
          "SCHEDULED",
          "RESCHEDULED",
          "IN_PROGRESS",
          "SUSPENDED",
          "COMPLETED",
          "PARTIALLY_COMPLETED",
          "CANCELLED",
        ].includes(st),
      ),
    );
    const crews = new Set(getAllParams("crew"));
    const timeFrom = getParam("timeFrom") ?? "";
    const timeTo = getParam("timeTo") ?? "";
    return { zones, statuses, crews, timeFrom, timeTo };
  });

  // Selection & Detail
  const [selectedId, setSelectedId] = useState<string | null>(() => getParam("selected"));
  const [detailId, setDetailId] = useState<string | null>(() => getParam("detail"));

  // Scheduling modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(() => {
    return getParam("action") === "schedule";
  });
  const [scheduleOrigin, setScheduleOrigin] = useState<ServiceOrigin | undefined>(() => {
    const orig = getParam("origin");
    return orig && ["PLANNED", "TICKET", "WEATHER_ALERT", "INSPECTION", "MANUAL"].includes(orig)
      ? (orig as ServiceOrigin)
      : undefined;
  });
  const [scheduleReferenceId, setScheduleReferenceId] = useState<string | undefined>(() => {
    return (
      getParam("referenceId") ??
      getParam("ticketId") ??
      getParam("inspectionId") ??
      getParam("weatherAlertId") ??
      undefined
    );
  });

  // Assignment modal state
  const [assigningServiceId, setAssigningServiceId] = useState<string | null>(() => {
    return getParam("action") === "assign" ? getParam("serviceId") : null;
  });

  // Suspend modal state (Field crew leader)
  const [suspendingServiceId, setSuspendingServiceId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeErrors, setResumeErrors] = useState<Record<string, string>>({});

  // Reschedule modal state (Office two-step flow)
  const [reschedulingServiceId, setReschedulingServiceId] = useState<string | null>(null);
  const [confirmingRescheduleServiceId, setConfirmingRescheduleServiceId] = useState<string | null>(null);

  // Cancel modal state (Office action)
  const [cancelingServiceId, setCancelingServiceId] = useState<string | null>(null);

  // RepairRequest entry point is Office-wide or Field-only from the actor's assigned Service.
  const [repairRequestServiceId, setRepairRequestServiceId] = useState<string | null>(null);
  const [repairRequests, setRepairRequests] = useState<Record<string, RepairRequest[]>>({});
  const [repairRequestsErrors, setRepairRequestsErrors] = useState<Record<string, string>>({});
  // Office-only outbound referral from the canonical Service context.
  const [streetClosureServiceId, setStreetClosureServiceId] = useState<string | null>(null);

  // Layout presentation
  const [mapSide, setMapSide] = useState<"left" | "right">(() => {
    return getParam("mapSide") === "left" ? "left" : "right";
  });
  const [mobileTab, setMobileTab] = useState<"list" | "map">(() => {
    return getParam("view") === "map" ? "map" : "list";
  });
  const [isNarrow, setIsNarrow] = useState(false);

  // Map resilience
  const [mapError, setMapError] = useState(initialMapError);

  // Detect viewport width for 760px boundary
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 760);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Fetch all services
  useEffect(() => {
    let isCurrent = true;
    async function load() {
      setLoadState({ status: "loading" });
      try {
        const query: ServiceQuery = { pageSize: 100 };
        if (scenario?.actor.kind === "FIELD" && scenario.actor.crewId) {
          query.crewId = scenario.actor.crewId;
        }
        const page = await servicesAdapter.list(query);
        if (isCurrent) setLoadState({ status: "ready", services: page.services });
      } catch (cause) {
        if (!isCurrent) return;
        const msg =
          cause instanceof ServiceRequestError
            ? `Error del servidor (${cause.status}): ${cause.message}`
            : "No se pudieron cargar los servicios operativos.";
        setLoadState({ status: "error", message: msg });
      }
    }
    void load();
    return () => {
      isCurrent = false;
    };
  }, [reloadVersion, scenario]);

  // Compute filter fingerprint to trigger map bounds fit only when filters change
  const filterFingerprint = useMemo(() => {
    const z = Array.from(columnFilters.zones).sort().join(",");
    const s = Array.from(columnFilters.statuses).sort().join(",");
    const c = Array.from(columnFilters.crews).sort().join(",");
    return `${search}|${z}|${s}|${c}|${columnFilters.timeFrom}|${columnFilters.timeTo}`;
  }, [search, columnFilters]);

  // Synchronize state with URL parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const p = url.searchParams;

    // Retain destination param if present
    const currentDest = p.get("destination");

    // Clear previous filters/workspace params
    const newParams = new URLSearchParams();
    if (currentDest) newParams.set("destination", currentDest);

    if (search.trim()) newParams.set("q", search.trim());
    if (selectedId) newParams.set("selected", selectedId);
    if (detailId) newParams.set("detail", detailId);
    if (sortKey !== "status") newParams.set("sort", sortKey);
    if (sortDir !== "asc") newParams.set("dir", sortDir);
    if (mapSide !== "right") newParams.set("mapSide", mapSide);
    if (mobileTab !== "list") newParams.set("view", mobileTab);

    columnFilters.zones.forEach((z) => newParams.append("zone", z));
    columnFilters.statuses.forEach((st) => newParams.append("status", st));
    columnFilters.crews.forEach((cr) => newParams.append("crew", cr));
    if (columnFilters.timeFrom) newParams.set("timeFrom", columnFilters.timeFrom);
    if (columnFilters.timeTo) newParams.set("timeTo", columnFilters.timeTo);

    if (isScheduleOpen) {
      newParams.set("action", "schedule");
      if (scheduleOrigin) newParams.set("origin", scheduleOrigin);
      if (scheduleReferenceId) newParams.set("referenceId", scheduleReferenceId);
    }

    if (assigningServiceId) {
      newParams.set("action", "assign");
      newParams.set("serviceId", assigningServiceId);
    }

    const newQuery = newParams.toString();
    const newUrl = `${url.pathname}${newQuery ? `?${newQuery}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    search,
    selectedId,
    detailId,
    sortKey,
    sortDir,
    mapSide,
    mobileTab,
    columnFilters,
    isScheduleOpen,
    scheduleOrigin,
    scheduleReferenceId,
    assigningServiceId,
  ]);

  // Client-side filtering of loaded services
  const filteredServices = useMemo(() => {
    if (loadState.status !== "ready") return [];

    return loadState.services.filter((service) => {
      // Global search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          service.id,
          service.title,
          service.serviceTypeName,
          service.crewName ?? "sin asignar",
          service.routeName ?? "",
          service.targetRef ?? "",
          ...service.zoneNames,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Column: Zones
      if (columnFilters.zones.size > 0) {
        const matchesAnyZone = service.zoneNames.some((zn) => columnFilters.zones.has(zn));
        if (!matchesAnyZone) return false;
      }

      // Column: Status
      if (columnFilters.statuses.size > 0) {
        if (!columnFilters.statuses.has(service.status)) return false;
      }

      // Column: Crew
      if (columnFilters.crews.size > 0) {
        const crewDisplay = service.crewName ?? "Sin asignar";
        if (!columnFilters.crews.has(crewDisplay)) return false;
      }

      // Column: Time
      if (columnFilters.timeFrom && service.windowFrom && service.windowFrom < columnFilters.timeFrom) {
        return false;
      }
      if (columnFilters.timeTo && service.windowTo && service.windowTo > columnFilters.timeTo) {
        return false;
      }

      return true;
    });
  }, [loadState, search, columnFilters]);

  const selectedService = useMemo(() => {
    if (!selectedId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, loadState]);

  const detailService = useMemo(() => {
    if (!detailId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === detailId) ?? null;
  }, [detailId, loadState]);

  const fieldCanViewRepairRequests = Boolean(
    scenario?.actor.kind === "FIELD" &&
      scenario.actor.crewId &&
      detailService?.crewId === scenario.actor.crewId,
  );

  useEffect(() => {
    if (!fieldCanViewRepairRequests || !detailService) return;

    let isCurrent = true;
    void repairRequestsAdapter.list({ detectedInId: detailService.id, pageSize: 50 })
      .then((page) => {
        if (isCurrent) setRepairRequests((current) => ({ ...current, [detailService.id]: page.repairRequests }));
      })
      .catch(() => {
        if (isCurrent) setRepairRequestsErrors((current) => ({ ...current, [detailService.id]: "No se pudieron cargar las derivaciones de este Servicio." }));
      });

    return () => {
      isCurrent = false;
    };
  }, [detailService, fieldCanViewRepairRequests]);

  const assigningService = useMemo(() => {
    if (!assigningServiceId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === assigningServiceId) ?? null;
  }, [assigningServiceId, loadState]);

  const repairRequestService = useMemo(() => {
    if (!repairRequestServiceId || loadState.status !== "ready") return null;
    return loadState.services.find((service) => service.id === repairRequestServiceId) ?? null;
  }, [repairRequestServiceId, loadState]);

  const streetClosureService = useMemo(() => {
    if (!streetClosureServiceId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === streetClosureServiceId) ?? null;
  }, [streetClosureServiceId, loadState]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSortChange = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setColumnFilters({
      zones: new Set(),
      statuses: new Set(),
      crews: new Set(),
      timeFrom: "",
      timeTo: "",
    });
  }, []);

  const handleScheduleOpenChange = useCallback((open: boolean) => {
    setIsScheduleOpen(open);
    if (!open) {
      setScheduleOrigin(undefined);
      setScheduleReferenceId(undefined);
    }
  }, []);

  const handleServiceCreated = useCallback((newService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: [newService, ...prev.services],
      };
    });
    setSearch("");
    setSelectedId(newService.id);
    setIsScheduleOpen(false);
    setScheduleOrigin(undefined);
    setScheduleReferenceId(undefined);
  }, []);

  const handleServiceAssigned = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
    setAssigningServiceId(null);
  }, []);

  const isField = scenario?.actor.kind === "FIELD";
  const canAssignCrew = !isField;
  const canSchedule = !isField;
  const canReschedule = !isField;
  const canExecuteService = Boolean(scenario?.capabilities.includes("service:execute"));
  const canCreateRepairRequest = scenario?.actor.kind === "OFFICE" || fieldCanViewRepairRequests;
  const canCreateStreetClosureRequest = scenario?.actor.kind === "OFFICE";

  const handleStartService = useCallback(async (service: Service) => {
    try {
      const updated = await servicesAdapter.start(service.id);
      setLoadState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          services: prev.services.map((s) => (s.id === updated.id ? updated : s)),
        };
      });
    } catch {
      // Handled in dialog or caller
    }
  }, []);

  const handleResumeService = useCallback(async (service: Service) => {
    setResumingId(service.id);
    setResumeErrors((prev) => ({ ...prev, [service.id]: "" }));
    try {
      const updated = await servicesAdapter.resume(service.id);
      setLoadState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          services: prev.services.map((s) => (s.id === updated.id ? updated : s)),
        };
      });
    } catch (cause) {
      const msg =
        cause instanceof ServiceRequestError
          ? cause.message
          : "No se pudo registrar la reanudación del servicio.";
      setResumeErrors((prev) => ({ ...prev, [service.id]: msg }));
    } finally {
      setResumingId(null);
    }
  }, []);

  const handleServiceSuspended = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
    setSuspendingServiceId(null);
  }, []);

  const handleServiceRescheduled = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
    setReschedulingServiceId(null);
  }, []);

  const handleRescheduleConfirmed = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
    setConfirmingRescheduleServiceId(null);
  }, []);

  const handleServiceCancelled = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
    setCancelingServiceId(null);
  }, []);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    columnFilters.zones.size > 0 ||
    columnFilters.statuses.size > 0 ||
    columnFilters.crews.size > 0 ||
    Boolean(columnFilters.timeFrom || columnFilters.timeTo);

  // Full detail view (explicit action)
  if (detailService) {
    return (
      <>
        <ServiceDetail
          service={detailService}
          onBack={() => setDetailId(null)}
          onAssignCrew={canAssignCrew ? (s) => setAssigningServiceId(s.id) : undefined}
          onStartService={canExecuteService ? handleStartService : undefined}
          onSuspendService={canExecuteService ? (s) => setSuspendingServiceId(s.id) : undefined}
          onResumeService={canExecuteService ? handleResumeService : undefined}
          onReschedule={canReschedule ? (s) => setReschedulingServiceId(s.id) : undefined}
          onConfirmReschedule={canReschedule ? (s) => setConfirmingRescheduleServiceId(s.id) : undefined}
          onCancelService={canReschedule ? (s) => setCancelingServiceId(s.id) : undefined}
          onCreateRepairRequest={canCreateRepairRequest ? (s) => setRepairRequestServiceId(s.id) : undefined}
          onCreateStreetClosureRequest={canCreateStreetClosureRequest ? (s) => setStreetClosureServiceId(s.id) : undefined}
          canStartService={canExecuteService}
          isResuming={resumingId === detailService.id}
          resumeError={resumeErrors[detailService.id] ?? null}
          repairRequests={fieldCanViewRepairRequests ? repairRequests[detailService.id] ?? [] : undefined}
          repairRequestsLoading={fieldCanViewRepairRequests && !Object.prototype.hasOwnProperty.call(repairRequests, detailService.id) && !repairRequestsErrors[detailService.id]}
          repairRequestsError={repairRequestsErrors[detailService.id] ?? null}
        />
        {canAssignCrew && (
          <AssignCrewDialog
            open={Boolean(assigningService)}
            onOpenChange={(open) => {
              if (!open) setAssigningServiceId(null);
            }}
            service={assigningService}
            allServices={loadState.status === "ready" ? loadState.services : []}
            onAssigned={handleServiceAssigned}
          />
        )}
        {canCreateRepairRequest && repairRequestService && (
          <CreateRepairRequestDialog
            open={repairRequestServiceId === repairRequestService.id}
            service={repairRequestService}
            onOpenChange={(open) => {
              if (!open) setRepairRequestServiceId(null);
            }}
            onCreated={(request) => {
              setRepairRequests((current) => ({
                ...current,
                [request.detectedInId]: [
                  request,
                  ...(current[request.detectedInId] ?? []).filter((item) => item.id !== request.id),
                ],
              }));
            }}
          />
        )}
        {canExecuteService && (
          <SuspendServiceDialog
            open={Boolean(suspendingServiceId && detailService.id === suspendingServiceId)}
            onOpenChange={(open) => {
              if (!open) setSuspendingServiceId(null);
            }}
            service={suspendingServiceId ? detailService : null}
            onSuspended={handleServiceSuspended}
          />
        )}
        {canReschedule && (
          <>
            <RescheduleReasonDialog
              open={Boolean(reschedulingServiceId && detailService.id === reschedulingServiceId)}
              onOpenChange={(open) => {
                if (!open) setReschedulingServiceId(null);
              }}
              service={reschedulingServiceId ? detailService : null}
              onRescheduled={handleServiceRescheduled}
            />
            <ConfirmRescheduleDialog
              open={Boolean(
                confirmingRescheduleServiceId && detailService.id === confirmingRescheduleServiceId,
              )}
              onOpenChange={(open) => {
                if (!open) setConfirmingRescheduleServiceId(null);
              }}
              service={confirmingRescheduleServiceId ? detailService : null}
              onConfirmed={handleRescheduleConfirmed}
            />
            <CancelServiceDialog
              open={Boolean(cancelingServiceId && detailService.id === cancelingServiceId)}
              onOpenChange={(open) => {
                if (!open) setCancelingServiceId(null);
              }}
              service={cancelingServiceId ? detailService : null}
              onCancelled={handleServiceCancelled}
            />
            {canCreateStreetClosureRequest && streetClosureService && (
              <CreateStreetClosureRequestDialog
                open={Boolean(streetClosureServiceId && detailService.id === streetClosureServiceId)}
                onOpenChange={(open) => {
                  if (!open) setStreetClosureServiceId(null);
                }}
                service={streetClosureService}
              />
            )}
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-canvas)]">
      {/* Workspace Header & Toolbar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)]">
              Servicios Urbanos
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Programación y seguimiento territorial de recorridos y puntos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Global search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar servicio, zona o cuadrilla…"
                aria-label="Buscar servicios por texto libre"
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] pl-8 pr-8 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-[var(--color-action)] font-semibold"
                aria-label="Limpiar todos los filtros aplicados"
              >
                <FilterX data-icon="inline-start" aria-hidden />
                <span>Limpiar filtros</span>
              </Button>
            )}

            {canSchedule && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setScheduleOrigin(undefined);
                  setScheduleReferenceId(undefined);
                  setIsScheduleOpen(true);
                }}
                className="text-xs font-semibold gap-1.5 shrink-0"
                aria-label="Programar nuevo servicio"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>Programar servicio</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loadState.status === "loading" && (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex w-full max-w-xl flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      )}

      {/* Error State */}
      {loadState.status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center" role="alert">
          <h2 className="text-base font-bold text-[var(--color-text)]">
            No se pudieron cargar los servicios
          </h2>
          <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
            {loadState.message}
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => setReloadVersion((v) => v + 1)}
            className="mt-4"
          >
            <RefreshCw data-icon="inline-start" aria-hidden />
            Reintentar carga
          </Button>
        </div>
      )}

      {/* Ready State */}
      {loadState.status === "ready" && (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {isNarrow ? (
            /* Narrow Screens (< 760px): Focused List/Map Presentation */
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <button
                  type="button"
                  onClick={() => setMobileTab("list")}
                  aria-pressed={mobileTab === "list"}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                    mobileTab === "list"
                      ? "border-[var(--color-action)] text-[var(--color-action)] bg-[var(--color-surface-subtle)]"
                      : "border-transparent text-[var(--color-text-secondary)]",
                  )}
                >
                  <LayoutList className="h-4 w-4" aria-hidden />
                  <span>Lista ({filteredServices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("map")}
                  aria-pressed={mobileTab === "map"}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                    mobileTab === "map"
                      ? "border-[var(--color-action)] text-[var(--color-action)] bg-[var(--color-surface-subtle)]"
                      : "border-transparent text-[var(--color-text-secondary)]",
                  )}
                >
                  <MapIcon className="h-4 w-4" aria-hidden />
                  <span>Mapa</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 relative">
                {mobileTab === "list" ? (
                  <ServicesTable
                    services={filteredServices}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                    columnFilters={columnFilters}
                    onColumnFiltersChange={setColumnFilters}
                    dense
                  />
                ) : (
                  <div className="h-full p-2">
                    <MapView
                      services={filteredServices}
                      selectedId={selectedId}
                      onSelect={handleSelect}
                      error={mapError}
                      onRetry={() => setMapError(false)}
                      filterFingerprint={filterFingerprint}
                    />
                  </div>
                )}

                {/* Mobile live preview sheet/card when an item is selected */}
                {selectedService && (
                  <div className="absolute inset-x-0 bottom-0 z-40 max-h-[75%] rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
                    <ServicePreview
                      service={selectedService}
                      onOpenDetail={(id) => setDetailId(id)}
                      onAssignCrew={canAssignCrew ? (s) => setAssigningServiceId(s.id) : undefined}
                      onClose={() => setSelectedId(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Wide Screens (>= 760px): Resizable, side-swappable split pane with live preview */
            <div className="relative flex flex-1 min-h-0 flex-col">
              {/* Split pane control bar */}
              <div className="flex items-center justify-end gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)]">
                <button
                  type="button"
                  onClick={() => setMapSide((s) => (s === "right" ? "left" : "right"))}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] transition-colors"
                  aria-label={`Intercambiar paneles: colocar mapa a la ${mapSide === "right" ? "izquierda" : "derecha"}`}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                  <span>Mapa a la {mapSide === "right" ? "izquierda" : "derecha"}</span>
                </button>
              </div>

              <div className="relative flex-1 min-h-0">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {mapSide === "left" ? (
                    <>
                      <ResizablePanel
                        id="map-pane"
                        defaultSize={50}
                        minSize={30}
                      >
                        <div className="h-full p-3">
                          <MapView
                            services={filteredServices}
                            selectedId={selectedId}
                            onSelect={handleSelect}
                            error={mapError}
                            onRetry={() => setMapError(false)}
                            filterFingerprint={filterFingerprint}
                          />
                        </div>
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        id="table-pane"
                        defaultSize={50}
                        minSize={30}
                      >
                        <ServicesTable
                          services={filteredServices}
                          selectedId={selectedId}
                          onSelect={handleSelect}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSortChange={handleSortChange}
                          columnFilters={columnFilters}
                          onColumnFiltersChange={setColumnFilters}
                        />
                      </ResizablePanel>
                    </>
                  ) : (
                    <>
                      <ResizablePanel
                        id="table-pane"
                        defaultSize={50}
                        minSize={30}
                      >
                        <ServicesTable
                          services={filteredServices}
                          selectedId={selectedId}
                          onSelect={handleSelect}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSortChange={handleSortChange}
                          columnFilters={columnFilters}
                          onColumnFiltersChange={setColumnFilters}
                        />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        id="map-pane"
                        defaultSize={50}
                        minSize={30}
                      >
                        <div className="h-full p-3">
                          <MapView
                            services={filteredServices}
                            selectedId={selectedId}
                            onSelect={handleSelect}
                            error={mapError}
                            onRetry={() => setMapError(false)}
                            filterFingerprint={filterFingerprint}
                          />
                        </div>
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>

                {/* Anchored live preview alongside split pane when service selected */}
                {selectedService && (
                  <div className="absolute inset-y-0 right-0 z-30 w-80 md:w-96 shadow-2xl transition-transform duration-300">
                    <ServicePreview
                      service={selectedService}
                      onOpenDetail={(id) => setDetailId(id)}
                      onAssignCrew={canAssignCrew ? (s) => setAssigningServiceId(s.id) : undefined}
                      onClose={() => setSelectedId(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Service Dialog (Generic & Linked-create) */}
      <ScheduleServiceDialog
        open={isScheduleOpen}
        onOpenChange={handleScheduleOpenChange}
        onCreated={handleServiceCreated}
        initialOrigin={scheduleOrigin}
        initialReferenceId={scheduleReferenceId}
      />

      {/* Assign Crew and Vehicle Dialog */}
      <AssignCrewDialog
        open={Boolean(assigningService)}
        onOpenChange={(open) => {
          if (!open) setAssigningServiceId(null);
        }}
        service={assigningService}
        allServices={loadState.status === "ready" ? loadState.services : []}
        onAssigned={handleServiceAssigned}
      />
    </div>
  );
}
