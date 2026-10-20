"use client";
import { errorMessage } from "@/lib/error-message";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGroupRef } from "react-resizable-panels";
import { useSearchParams } from "next/navigation";
import {
  FilterX,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { InventoryMapDrawer, type InventoryMapDrawerSnapState } from "@/components/map/inventory-map-drawer";
import { Button } from "@/components/ui/button";
import { FormControl } from "@/components/ui/form-control";
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
import {
  streetClosureRequestsAdapter,
  type StreetClosureDependency,
} from "@/lib/street-closure-requests";
import { cn, normalizeForSearch } from "@/lib/utils";
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
import { createServiceOrdinals, sortServices } from "./service-sorting";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";
import { todayInArgentina } from "@/lib/argentina-date";
import { servicesMobileBreakpoint } from "@/lib/services-layout";
import styles from "./services-workspace.module.css";
import {
  ServicesColumnEditor,
  useServicesColumnPreferences,
} from "./services-column-editor";

type Period = "semana" | "mes" | "todo";

function getWorkspaceSplitStorageKey(userId: string): string {
  return `m6:services-workspace-split:v1:${encodeURIComponent(userId)}`;
}

function readWorkspaceSplit(storageKey: string): Record<string, number> | null {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    const mapSize = parsed["map-pane"];
    if (typeof mapSize !== "number" || !Number.isFinite(mapSize) || mapSize < 30 || mapSize > 70) {
      return null;
    }
    return { "map-pane": mapSize, "table-pane": 100 - mapSize };
  } catch {
    return null;
  }
}

function writeWorkspaceSplit(storageKey: string, layout: Record<string, number>): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // The current split remains usable if storage is unavailable.
  }
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadedScopeRef = useRef<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [periodChoice, setPeriodChoice] = useState<Period | null>(() => {
    const value = getParam("periodo");
    return value === "semana" || value === "mes" || value === "todo" ? value : null;
  });
  const [activePeriod, setActivePeriod] = useState<Period>(periodChoice ?? "todo");
  const handlePeriodChoiceChange = useCallback((period: Period) => {
    setActivePeriod(period);
    setPeriodChoice(period);
  }, []);

  // Global search
  const [search, setSearch] = useState<string>(() => getParam("q") ?? "");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey | null>(() => {
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
  const [retainedPreviewId, setRetainedPreviewId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(() => getParam("detail"));
  const [resolvedDetail, setResolvedDetail] = useState<{ id: string; service: Service | null; error?: string } | null>(null);

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
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startErrors, setStartErrors] = useState<Record<string, string>>({});
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
  const [mobileDrawerSnap, setMobileDrawerSnap] = useState<InventoryMapDrawerSnapState>("half");
  const columnPreferences = useServicesColumnPreferences({
    userId: scenario?.actor.userId ?? "user-lucia",
    variant: "1",
    data: loadState.status === "ready" ? loadState.services : [],
  });
  const panelGroupRef = useGroupRef();
  const workspaceSplitStorageKey = getWorkspaceSplitStorageKey(scenario?.actor.userId ?? "user-lucia");
  const loadedSplitStorageKeyRef = useRef<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    loadedSplitStorageKeyRef.current = null;
    const savedLayout = readWorkspaceSplit(workspaceSplitStorageKey);
    if (savedLayout) panelGroupRef.current?.setLayout(savedLayout);
    loadedSplitStorageKeyRef.current = workspaceSplitStorageKey;
  }, [loadState.status, panelGroupRef, workspaceSplitStorageKey]);

  const handlePanelLayoutChanged = useCallback((layout: Record<string, number>, meta: { isUserInteraction: boolean }) => {
    if (!meta.isUserInteraction || loadedSplitStorageKeyRef.current !== workspaceSplitStorageKey) return;
    writeWorkspaceSplit(workspaceSplitStorageKey, layout);
  }, [workspaceSplitStorageKey]);

  // Map resilience
  const [mapError, setMapError] = useState(initialMapError);

  // Use the design token as the single source for the workspace breakpoint.
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth <= servicesMobileBreakpoint());
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Fetch all services
  useEffect(() => {
    let isCurrent = true;
    const scopeKey = scenario?.actor.kind === "FIELD"
      ? `field:${scenario.actor.crewId ?? ""}`
      : "office";
    const keepCurrentWorkspace = loadedScopeRef.current === scopeKey;
    if (keepCurrentWorkspace) {
      setIsRefreshing(true);
      setRefreshError(null);
    } else {
      setLoadState({ status: "loading" });
      setIsRefreshing(false);
      setRefreshError(null);
    }

    async function load() {
      try {
        const base: ServiceQuery = {};
        if (scenario?.actor.kind === "FIELD" && scenario.actor.crewId) {
          base.crewId = scenario.actor.crewId;
        }
        let period = periodChoice;
        if (!period) {
          const count = await servicesAdapter.list({ ...base, pageSize: 1 });
          if (!isCurrent) return;
          period = count.total > 100 ? "semana" : "todo";
        }
        setActivePeriod(period);
        const query: ServiceQuery = { ...base, pageSize: 100 };
        if (period !== "todo") {
          const today = todayInArgentina();
          const from = new Date(`${today}T00:00:00Z`);
          const to = new Date(from);
          if (period === "semana") {
            from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
            to.setTime(from.getTime());
            to.setUTCDate(to.getUTCDate() + 6);
          } else {
            from.setUTCDate(1);
            to.setUTCMonth(to.getUTCMonth() + 1, 0);
          }
          query.scheduledFrom = from.toISOString().slice(0, 10);
          query.scheduledTo = to.toISOString().slice(0, 10);
        }
        const page = await servicesAdapter.list(query);
        const services = [...page.services];
        let totalPages = page.totalPages;
        for (let nextPage = 2; nextPage <= Math.min(totalPages, 20); nextPage += 1) {
          if (!isCurrent) return;
          const next = await servicesAdapter.list({ ...query, page: nextPage });
          services.push(...next.services);
          totalPages = next.totalPages;
        }
        if (totalPages > 20) throw new RangeError("El período tiene demasiados servicios; acote el período.");
        if (isCurrent) {
          loadedScopeRef.current = scopeKey;
          setLoadState({ status: "ready", services });
          setIsRefreshing(false);
          setRefreshError(null);
        }
      } catch (cause) {
        if (!isCurrent) return;
        const msg =
          cause instanceof RangeError ? cause.message : cause instanceof ServiceRequestError
            ? `Error del servidor (${cause.status}): ${cause.message}`
            : "No se pudieron cargar los servicios operativos.";
        if (keepCurrentWorkspace) {
          setIsRefreshing(false);
          setRefreshError(msg);
        } else {
          setLoadState({ status: "error", message: msg });
        }
      }
    }
    void load();
    return () => {
      isCurrent = false;
    };
  }, [reloadVersion, scenario, periodChoice]);

  const focusSelectedServiceAction = useCallback((id = selectedId) => {
    if (!id || typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const action = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-service-select]"))
        .find((element) => element.dataset.serviceId === id);
      action?.focus();
    });
  }, [selectedId]);

  const closePreview = useCallback(() => {
    const id = selectedId;
    if (id) setRetainedPreviewId(id);
    setSelectedId(null);
    focusSelectedServiceAction(id ?? undefined);
  }, [focusSelectedServiceAction, selectedId]);

  useEffect(() => {
    if (!selectedId || detailId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (target instanceof Element && target.closest('[role="dialog"]')) return;
      event.preventDefault();
      closePreview();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePreview, detailId, selectedId]);

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
    if (periodChoice) newParams.set("periodo", periodChoice);
    if (sortKey && sortKey !== "status") newParams.set("sort", sortKey);
    if (sortKey && sortDir !== "asc") newParams.set("dir", sortDir);
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
    periodChoice,
    sortKey,
    sortDir,
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
        const q = normalizeForSearch(search.trim());
        const haystack = normalizeForSearch(
          [
            service.id,
            service.title,
            service.serviceTypeName,
            service.crewName ?? "sin asignar",
            service.routeName ?? "",
            service.targetRef ?? "",
            ...service.zoneNames,
          ].join(" "),
        );
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

  const sortedServices = useMemo(
    () => sortKey ? sortServices(filteredServices, sortKey, sortDir) : filteredServices,
    [filteredServices, sortKey, sortDir],
  );
  const serviceOrdinals = useMemo(
    () => createServiceOrdinals(sortedServices),
    [sortedServices],
  );

  const selectedService = useMemo(() => {
    if (!selectedId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, loadState]);
  const previewService = selectedService ?? (loadState.status === "ready" && retainedPreviewId
    ? loadState.services.find((service) => service.id === retainedPreviewId) ?? null
    : null);

  useEffect(() => {
    if (selectedService || !retainedPreviewId) return;
    const timeout = window.setTimeout(() => setRetainedPreviewId(null), 420);
    return () => window.clearTimeout(timeout);
  }, [retainedPreviewId, selectedService]);

  const windowDetailService = useMemo(() => {
    if (!detailId || loadState.status !== "ready") return null;
    return loadState.services.find((s) => s.id === detailId) ?? null;
  }, [detailId, loadState]);

  useEffect(() => {
    if (!detailId || loadState.status !== "ready" || windowDetailService) return;
    let isCurrent = true;
    void servicesAdapter.get(detailId).then((service) => {
      if (!isCurrent) return;
      const allowed = scenario?.actor.kind !== "FIELD" || service.crewId === scenario.actor.crewId;
      setResolvedDetail({ id: detailId, service: allowed ? service : null });
    }).catch((cause) => {
      if (!isCurrent) return;
      setResolvedDetail({
        id: detailId, service: null,
        error: cause instanceof ServiceRequestError && cause.status === 404 ? undefined : "No se pudo cargar el detalle del servicio.",
      });
    });
    return () => { isCurrent = false; };
  }, [detailId, loadState, windowDetailService, scenario]);

  const outsideDetail = loadState.status === "ready" && resolvedDetail?.id === detailId ? resolvedDetail : null;
  const detailService = windowDetailService ?? outsideDetail?.service ?? null;

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
    setRetainedPreviewId(id);
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenDetail = useCallback((id: string) => {
    setStartErrors({});
    setDetailId(id);
  }, []);

  const handleSortChange = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }, [sortKey, sortDir]);

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
    setRetainedPreviewId(newService.id);
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
  const canAssignCrew = Boolean(scenario?.capabilities.includes("service:assign"));
  const canSchedule = !isField;
  const canReschedule = Boolean(scenario?.capabilities.includes("service:reschedule"));
  const canCancel = Boolean(scenario?.capabilities.includes("service:cancel"));
  const canExecuteService = Boolean(scenario?.capabilities.includes("service:execute"));
  const canCreateRepairRequest = scenario?.actor.kind === "OFFICE" || fieldCanViewRepairRequests;
  const canCreateStreetClosureRequest = scenario?.actor.kind === "OFFICE";

  const [streetClosureDependencyState, setStreetClosureDependencyState] = useState<{
    serviceId: string | null;
    dependency: StreetClosureDependency | null;
    error: string | null;
  }>({ serviceId: null, dependency: null, error: null });

  useEffect(() => {
    if (!canCreateStreetClosureRequest || !detailId) return;

    let isCurrent = true;
    void streetClosureRequestsAdapter
      .getForService(detailId)
      .then((dependency) => {
        if (!isCurrent) return;
        setStreetClosureDependencyState({ serviceId: detailId, dependency, error: null });
      })
      .catch((cause) => {
        if (!isCurrent) return;
        setStreetClosureDependencyState({
          serviceId: detailId,
          dependency: null,
          error: errorMessage(cause, "No se pudo consultar la respuesta de M7."),
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [canCreateStreetClosureRequest, detailId]);

  const displayedStreetClosureState =
    canCreateStreetClosureRequest && detailId && streetClosureDependencyState.serviceId === detailId
      ? streetClosureDependencyState
      : { serviceId: null, dependency: null, error: null };

  const handleStartService = useCallback(async (service: Service) => {
    setStartingId(service.id);
    setStartErrors((prev) => ({ ...prev, [service.id]: "" }));
    try {
      const updated = await servicesAdapter.start(service.id);
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
          : "No se pudo registrar el inicio del servicio.";
      setStartErrors((prev) => ({ ...prev, [service.id]: msg }));
    } finally {
      setStartingId((current) => (current === service.id ? null : current));
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

  // Lo que cambian los paneles de ejecución (resultado por zona, completar el
  // servicio o la inspección) vuelve al listado; sin esto el detalle queda viejo.
  const handleServiceUpdated = useCallback((updatedService: Service) => {
    setLoadState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === updatedService.id ? updatedService : s)),
      };
    });
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

  const servicesTableProps = {
    services: sortedServices,
    filterOptionsServices: loadState.status === "ready" ? loadState.services : [],
    serviceOrdinals,
    selectedId,
    onSelect: handleSelect,
    sortKey,
    sortDir,
    onSortChange: handleSortChange,
    columnFilters,
    onColumnFiltersChange: setColumnFilters,
    hasActiveFilters,
    onClearFilters: handleClearFilters,
    dense: isNarrow,
    columnPreferences,
  };
  const servicesTable = (
    <ServicesTable
      {...servicesTableProps}
    />
  );

  const periodBar = (
    <div className={cn(
      "flex flex-wrap items-center bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
      isNarrow ? "gap-2 px-2 py-1 text-xs" : "gap-3 px-4 py-2 text-sm",
    )} aria-busy={isRefreshing}>
      <label className="flex items-center gap-2">
        <span>Período</span>
        <select
          value={activePeriod}
          onChange={(event) => handlePeriodChoiceChange(event.target.value as Period)}
          className={cn(
            "rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm",
            isNarrow ? "h-10 min-h-10" : "min-h-10",
          )}
        >
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="todo">Todo el período</option>
        </select>
      </label>
      <span
        className="inline-flex size-6 items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={isRefreshing ? "Actualizando servicios" : refreshError ? "No se pudieron actualizar los servicios" : undefined}
        title={refreshError ?? undefined}
      >
        {isRefreshing ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : null}
        {refreshError ? <span aria-hidden="true" className="font-bold text-[var(--color-danger)]">!</span> : null}
      </span>
    </div>
  );

  // Full detail view (explicit action)
  if (detailService) {
    return (
      <>
        {!windowDetailService && (
          <p role="status" className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">Este servicio está fuera del período seleccionado.</p>
        )}
        <ServiceDetail
          service={detailService}
          onBack={() => {
            setDetailId(null);
            focusSelectedServiceAction();
          }}
          onAssignCrew={canAssignCrew ? (s) => setAssigningServiceId(s.id) : undefined}
          onStartService={canExecuteService ? handleStartService : undefined}
          onSuspendService={canExecuteService ? (s) => setSuspendingServiceId(s.id) : undefined}
          onResumeService={canExecuteService ? handleResumeService : undefined}
          onReschedule={canReschedule ? (s) => setReschedulingServiceId(s.id) : undefined}
          onConfirmReschedule={canReschedule ? (s) => setConfirmingRescheduleServiceId(s.id) : undefined}
          onCancelService={canCancel ? (s) => setCancelingServiceId(s.id) : undefined}
          onCreateRepairRequest={canCreateRepairRequest ? (s) => setRepairRequestServiceId(s.id) : undefined}
          onCreateStreetClosureRequest={canCreateStreetClosureRequest ? (s) => setStreetClosureServiceId(s.id) : undefined}
          onServiceUpdated={handleServiceUpdated}
          canStartService={canExecuteService}
          isStarting={startingId === detailService.id}
          startError={startErrors[detailService.id] ?? null}
          isResuming={resumingId === detailService.id}
          resumeError={resumeErrors[detailService.id] ?? null}
          streetClosureDependency={displayedStreetClosureState.dependency}
          streetClosureDependencyLoading={Boolean(
            canCreateStreetClosureRequest &&
              detailId &&
              displayedStreetClosureState.serviceId !== detailId,
          )}
          streetClosureDependencyError={displayedStreetClosureState.error}
          onRejectedClosureReschedule={canReschedule ? (service) => setReschedulingServiceId(service.id) : undefined}
          onRejectedClosureCancel={canCancel ? (service) => setCancelingServiceId(service.id) : undefined}
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
            {canCreateStreetClosureRequest && streetClosureService && (
              <CreateStreetClosureRequestDialog
                key={streetClosureService.id}
                open={Boolean(streetClosureServiceId && detailService.id === streetClosureServiceId)}
                onOpenChange={(open) => {
                  if (!open) setStreetClosureServiceId(null);
                }}
                service={streetClosureService}
                onCreated={(request) =>
                  setStreetClosureDependencyState({
                    serviceId: detailService.id,
                    dependency: { request, outcome: "blocked" },
                    error: null,
                  })
                }
              />
            )}
          </>
        )}
        {canCancel && (
          <CancelServiceDialog
            open={Boolean(cancelingServiceId && detailService.id === cancelingServiceId)}
            onOpenChange={(open) => {
              if (!open) setCancelingServiceId(null);
            }}
            service={cancelingServiceId ? detailService : null}
            onCancelled={handleServiceCancelled}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--color-canvas)]">
      {/* Workspace Header & Toolbar */}
      <header className={cn(
        "border-b border-[var(--color-border)] bg-[var(--color-surface)]",
        isNarrow ? "p-2" : "px-5 py-3",
      )}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)]">
              Servicios Urbanos
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Global search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden />
              <FormControl
                as="input"
                type="search"
                value={search}
                maxLength={MAX_SEARCH_LENGTH}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isNarrow ? "Buscar" : "Buscar servicio, zona o cuadrilla…"}
                aria-label="Buscar servicios por texto libre"
                className="rounded-xl pl-8 pr-8 text-xs"
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
                className={cn("text-xs font-semibold gap-1.5 shrink-0", isNarrow && "h-12 px-3")}
                aria-label="Programar nuevo servicio"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>{isNarrow ? "Programar" : "Programar servicio"}</span>
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

      {loadState.status === "error" && periodBar}

      {/* Ready State */}
      {outsideDetail?.error && <p role="alert" className="px-4 py-3 text-sm text-[var(--color-danger)]">{outsideDetail.error}</p>}
      {loadState.status === "ready" && (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div data-services-filter-toolbar className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)]">
              {periodBar}
              {refreshError && (
                <p role="alert" className="px-4 py-1.5 text-xs text-[var(--color-danger)]">
                  No se pudieron actualizar los servicios. Se mantienen los resultados anteriores.
                </p>
              )}
              <ServicesColumnEditor controller={columnPreferences} />
            </div>

            <div className={cn(
              "relative min-h-0 min-w-0 flex-1",
              isNarrow ? styles.mobileWorkspaceLayout : styles.desktopWorkspaceLayout,
              styles.workspaceResults,
            )}
            data-refreshing={isRefreshing}
            aria-busy={isRefreshing}
          >
              <ResizablePanelGroup
                groupRef={panelGroupRef}
                orientation="horizontal"
                defaultLayout={{ "map-pane": 50, "table-pane": 50 }}
                onLayoutChanged={handlePanelLayoutChanged}
                className={cn("h-full min-w-0 flex-1", styles.panelGroup)}
                aria-hidden={Boolean(isNarrow && selectedService) || undefined}
                inert={Boolean(isNarrow && selectedService)}
              >
                <ResizablePanel
                  id="map-pane"
                  defaultSize="50%"
                  minSize="30%"
                  style={{ overflow: "hidden" }}
                  aria-hidden={Boolean(isNarrow && mobileDrawerSnap === "full") || undefined}
                  inert={Boolean(isNarrow && mobileDrawerSnap === "full")}
                  className={cn("min-h-0 min-w-0 overflow-hidden", isNarrow && styles.mobileMapPanel)}
                >
                  <div className={cn("h-full min-h-0 min-w-0", !isNarrow && "p-3")}>
                    <MapView
                      services={sortedServices}
                      serviceOrdinals={serviceOrdinals}
                      selectedId={selectedId}
                      onSelect={handleSelect}
                      error={mapError}
                      onRetry={() => setMapError(false)}
                      compact={isNarrow}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle
                  withHandle={false}
                  disabled={isNarrow}
                  aria-label="Ajustar ancho entre mapa y tabla"
                  className={cn(styles.mobileResizeHandle, isNarrow && "hidden")}
                />

                <ResizablePanel
                  id="table-pane"
                  defaultSize="50%"
                  minSize="30%"
                  style={{ overflow: "hidden" }}
                  className={cn("min-h-0 min-w-0 overflow-hidden", isNarrow && styles.mobileTablePanel)}
                >
                  <div className={cn("h-full min-h-0", styles.tableContent, isNarrow && "pointer-events-none")}>
                    {isNarrow ? (
                      <InventoryMapDrawer
                        ariaLabel="Lista de servicios"
                        summary={`${sortedServices.length} servicios`}
                        snapState={mobileDrawerSnap}
                        onSnapStateChange={setMobileDrawerSnap}
                        suspended={Boolean(selectedService)}
                        className={styles.mobileServiceDrawer}
                      >
                        <div className={styles.mobileDrawerContent}>
                          <div
                            className={cn(styles.mobileTablePane, selectedService && styles.mobileTablePaneHidden)}
                            aria-hidden={Boolean(selectedService)}
                            inert={Boolean(selectedService)}
                          >
                            {servicesTable}
                          </div>
                        </div>
                      </InventoryMapDrawer>
                    ) : servicesTable}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>

              {isNarrow && previewService && (
                <div
                  className={cn(styles.mobilePreviewOverlay, selectedService && styles.mobilePreviewOverlayOpen)}
                  aria-hidden={!selectedService}
                  inert={!selectedService}
                >
                  <ServicePreview
                    service={previewService}
                    onOpenDetail={handleOpenDetail}
                    onAssignCrew={canAssignCrew ? (service) => setAssigningServiceId(service.id) : undefined}
                    onClose={closePreview}
                    autoFocusCloseButton={isNarrow}
                    className="select-text border-l-0"
                  />
                </div>
              )}

              {!isNarrow && (
                <div
                  className={cn(styles.previewRail, selectedService && styles.previewRailOpen)}
                  data-preview-rail="true"
                  aria-hidden={!selectedService}
                  inert={!selectedService}
                >
                  <div className={styles.previewSurface}>
                    {previewService && (
                      <ServicePreview
                        service={previewService}
                        onOpenDetail={handleOpenDetail}
                        onAssignCrew={canAssignCrew ? (service) => setAssigningServiceId(service.id) : undefined}
                        onClose={closePreview}
                        className="select-text"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
