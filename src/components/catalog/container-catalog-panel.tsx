"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArchiveX,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
  Wrench,
  X,
} from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import styles from "@/components/catalog/catalog-panel.module.css";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  CONTAINER_STATUS_LABELS,
  CONTAINER_TYPE_LABELS,
  containerStatusSchema,
  containerTypeSchema,
  containersAdapter,
  DAMAGE_TYPE_LABELS,
  SEVERITY_LABELS,
  type Attachment,
  type Container,
  type ContainerQuery,
  type ContainerStatus,
  type ContainerType,
  findInFlightServiceForContainer,
} from "@/lib/containers";
import type { OperationalScenario } from "@/lib/scenarios";
import { servicesAdapter, type Service } from "@/lib/services";
import { zonesAdapter, type Zone } from "@/lib/zones";
import { ConfirmRelocationDialog } from "./confirm-relocation-dialog";
import { EmptyContainerDialog } from "./empty-container-dialog";
import { ReportDamageDialog } from "./report-damage-dialog";
import { ReportOverflowDialog } from "./report-overflow-dialog";
import { StartRelocationDialog } from "./start-relocation-dialog";
import { CompleteRepairDialog } from "./complete-repair-dialog";
import { RemoveContainerDialog } from "./remove-container-dialog";
import { StartRepairDialog } from "./start-repair-dialog";
import {
  MAX_INT32,
  MAX_SEARCH_LENGTH,
  parseCoordinateField,
} from "@/lib/input-limits";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; containers: Container[] };

type ContainerForm = {
  code: string;
  containerType: ContainerType;
  zoneId: string;
  address: string;
  lat: string;
  lng: string;
  capacityLiters: string;
};

type FormErrors = {
  code?: string;
  zoneId?: string;
  address?: string;
  lat?: string;
  lng?: string;
  capacityLiters?: string;
  general?: string;
};

const emptyForm: ContainerForm = {
  code: "",
  containerType: "HOUSEHOLD",
  zoneId: "",
  address: "",
  lat: "",
  lng: "",
  capacityLiters: "1100",
};

const containerTypes = containerTypeSchema.options;
const containerStatuses = containerStatusSchema.options;
const serviceLookupFailure =
  "No se pudo verificar si hay un servicio en curso para este contenedor. Reintente para habilitar las acciones.";

function StatusBadge({ status }: { status: ContainerStatus }) {
  const label = CONTAINER_STATUS_LABELS[status];
  const variants = {
    ACTIVE: "success",
    DAMAGED: "danger",
    REMOVED: "neutral",
    OVERFLOWED: "warning",
    UNDER_REPAIR: "warning",
    RELOCATING: "info",
  } as const;
  return (
    <Badge
      variant={variants[status]}
      role="status"
      aria-label={`Estado: ${label}`}
    >
      {status === "ACTIVE" && <Check data-icon="inline-start" aria-hidden />}
      {(status === "DAMAGED" || status === "REMOVED") && (
        <AlertTriangle data-icon="inline-start" aria-hidden />
      )}
      {(status === "OVERFLOWED" || status === "UNDER_REPAIR") && (
        <Clock data-icon="inline-start" aria-hidden />
      )}
      {status === "RELOCATING" && (
        <RotateCcw data-icon="inline-start" aria-hidden />
      )}
      {label}
    </Badge>
  );
}

export function ContainerCatalogPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("container:manage");
  const canReport = scenario.capabilities.includes("container:report");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [requestVersion, setRequestVersion] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | "all">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<ContainerType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(
    null,
  );
  const [form, setForm] = useState<ContainerForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailContainer, setDetailContainer] = useState<Container | null>(
    null,
  );
  const [detailSheetSide, setDetailSheetSide] = useState<"right" | "bottom">(
    "right",
  );
  const [detailEvidence, setDetailEvidence] = useState<Attachment[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

  const [reportingOverflowContainer, setReportingOverflowContainer] =
    useState<Container | null>(null);
  const [reportingDamageContainer, setReportingDamageContainer] =
    useState<Container | null>(null);
  const [emptyContainer, setEmptyContainer] = useState<Container | null>(null);
  const [startRelocatingContainer, setStartRelocatingContainer] =
    useState<Container | null>(null);
  const [confirmRelocatingContainer, setConfirmRelocatingContainer] =
    useState<Container | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesStatus, setServicesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [serviceLookupVersion, setServiceLookupVersion] = useState(0);
  const [startingRepairContainer, setStartingRepairContainer] =
    useState<Container | null>(null);
  const pendingRepairFocusId = useRef<string | null>(null);
  const [completingRepairContainer, setCompletingRepairContainer] =
    useState<Container | null>(null);
  const [removingContainer, setRemovingContainer] = useState<Container | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 760px)");
    const updateSide = () => setDetailSheetSide(media.matches ? "bottom" : "right");
    updateSide();
    media.addEventListener("change", updateSide);
    return () => media.removeEventListener("change", updateSide);
  }, []);

  useEffect(() => {
    if (startingRepairContainer || !pendingRepairFocusId.current) return;
    const containerId = pendingRepairFocusId.current;
    pendingRepairFocusId.current = null;
    document.getElementById(`container-detail-${containerId}`)?.focus();
  }, [startingRepairContainer]);

  useEffect(() => {
    let isCurrent = true;
    async function requestServices() {
      setServicesStatus("loading");
      const services: Service[] = [];
      let page = 1;
      let totalPages = 1;
      let total = 0;
      do {
        const result = await servicesAdapter.list({ page, pageSize: 100 });
        if (!isCurrent) return;
        if (result.page !== page) throw new Error(serviceLookupFailure);
        services.push(...result.services);
        totalPages = result.totalPages;
        total = result.total;
        page += 1;
      } while (page <= totalPages && page <= 20);
      if (totalPages >= 20 || services.length < total)
        throw new Error(serviceLookupFailure);
      setServices(services);
      setServicesStatus("ready");
    }
    void requestServices().catch(() => {
      if (isCurrent) setServicesStatus("error");
    });
    return () => {
      isCurrent = false;
    };
  }, [requestVersion, serviceLookupVersion]);

  useEffect(() => {
    if (!detailContainer) return;
    let isCurrent = true;
    containersAdapter
      .getEvidence(detailContainer.id)
      .then((attachments) => {
        if (isCurrent) setDetailEvidence(attachments);
      })
      .catch(() => {
        if (isCurrent) setDetailEvidence([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingEvidence(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [detailContainer]);

  const query = useMemo<ContainerQuery>(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      containerType: typeFilter === "all" ? undefined : typeFilter,
      zoneId: zoneFilter === "all" ? undefined : zoneFilter,
      search: search.trim() || undefined,
      pageSize: 100,
    }),
    [statusFilter, typeFilter, zoneFilter, search],
  );

  useEffect(() => {
    let isCurrent = true;
    void zonesAdapter
      .list()
      .then((page) => {
        if (isCurrent) setZones(page.zones);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function requestContainers() {
      setState({ status: "loading" });
      try {
        const page = await containersAdapter.list(query);
        if (isCurrent)
          setState({ status: "ready", containers: page.containers });
      } catch (caught) {
        if (isCurrent) {
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar los contenedores.",
            ),
          });
        }
      }
    }
    void requestContainers();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion]);

  // `?detail=<UUID>` (p. ej. desde el tablero de indicadores) abre ese contenedor;
  // se pide por id porque el listado trae sólo la primera página.
  useEffect(() => {
    const detailId = new URLSearchParams(window.location.search).get("detail");
    if (!detailId) return;
    let isCurrent = true;
    containersAdapter
      .get(encodeURIComponent(detailId))
      .then((container) => {
        if (!isCurrent) return;
        setDetailEvidence([]);
        setIsLoadingEvidence(true);
        setDetailContainer(container);
        refreshServiceLookup();
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  function openCreate() {
    setEditingContainer(null);
    setForm({ ...emptyForm, zoneId: zones[0]?.id ?? "" });
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(container: Container) {
    setEditingContainer(container);
    setForm({
      code: container.code,
      containerType: container.containerType,
      zoneId: container.zoneId,
      address: container.address ?? "",
      lat: container.lat === null ? "" : String(container.lat),
      lng: container.lng === null ? "" : String(container.lng),
      capacityLiters: String(container.capacityLiters),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function openDetail(container: Container) {
    setDetailEvidence([]);
    setIsLoadingEvidence(true);
    setDetailContainer(container);
    refreshServiceLookup();
  }

  function refreshServiceLookup() {
    setServicesStatus("loading");
    setServiceLookupVersion((version) => version + 1);
  }

  function closeDetail() {
    setDetailContainer(null);
    setDetailEvidence([]);
    setIsLoadingEvidence(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormErrors({});

    const errors: FormErrors = {};
    if (!editingContainer && !form.code.trim()) {
      errors.code = "El código del contenedor es obligatorio.";
    }
    if (!form.zoneId) {
      errors.zoneId = "Debe seleccionar una zona operativa.";
    }
    if (!form.address.trim()) {
      errors.address = "La dirección de instalación es obligatoria.";
    }

    const latResult = parseCoordinateField(form.lat, "lat");
    const lngResult = parseCoordinateField(form.lng, "lng");
    if (latResult.error) errors.lat = latResult.error;
    if (lngResult.error) errors.lng = lngResult.error;
    const latNum = latResult.value ?? 0;
    const lngNum = lngResult.value ?? 0;

    const capacityNum = Number(form.capacityLiters);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      errors.capacityLiters =
        "La capacidad debe ser un número entero mayor a 0 litros.";
    } else if (capacityNum > MAX_INT32) {
      errors.capacityLiters = `La capacidad no puede superar ${MAX_INT32.toLocaleString("es-AR")} litros.`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingContainer) {
        await containersAdapter.update(editingContainer.id, {
          zoneId: form.zoneId,
          address: form.address.trim(),
          lat: latNum,
          lng: lngNum,
          capacityLiters: capacityNum,
        });
        setNotice("Contenedor actualizado con éxito.");
      } else {
        await containersAdapter.create({
          code: form.code.trim(),
          containerType: form.containerType,
          zoneId: form.zoneId,
          address: form.address.trim(),
          lat: latNum,
          lng: lngNum,
          capacityLiters: capacityNum,
        });
        setNotice("Contenedor registrado con éxito.");
      }
      setFormOpen(false);
      setRequestVersion((v) => v + 1);
    } catch (caught) {
      setFormErrors({
        general: errorMessage(
          caught,
          "No se pudo completar la operación solicitada.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyUpdatedContainer(updated: Container) {
    setState((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            containers: prev.containers.map((c) =>
              c.id === updated.id ? updated : c,
            ),
          }
        : prev,
    );
    if (detailContainer?.id === updated.id) setDetailContainer(updated);
  }

  const detailInFlight = detailContainer
    ? findInFlightServiceForContainer(detailContainer, services)
    : undefined;

  return (
    <section aria-labelledby="containers-title" className="flex flex-col gap-5">
      <CatalogPageHeader
        title="Contenedores"
        titleId="containers-title"
        description="Inventario urbano de contenedores de vía pública para recolección diferenciada y mantenimiento."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar contenedor
            </Button>
          ) : null
        }
      />

      {notice && (
        <Alert role="status" aria-live="polite">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {servicesStatus === "error" && !detailContainer ? (
        <Alert role="status">
          <AlertDescription>
            <p>{serviceLookupFailure}</p>
            <Button variant="outline" onClick={refreshServiceLookup}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Filter panel */}
      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4"
        aria-label="Filtros del catálogo de contenedores"
      >
        <Field>
          <FieldLabel htmlFor="container-search-filter">
            Buscar contenedor
          </FieldLabel>
          <Input
            id="container-search-filter"
            type="search"
            placeholder="Código o dirección…"
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="container-status-filter">Estado</FieldLabel>
          <Select
            items={{ all: "Todos los estados", ...CONTAINER_STATUS_LABELS }}
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value ?? "") as ContainerStatus | "all")
            }
          >
            <SelectTrigger id="container-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los estados</SelectItem>
                {containerStatuses.map((st) => (
                  <SelectItem key={st} value={st}>
                    {CONTAINER_STATUS_LABELS[st]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="container-type-filter">
            Tipo de contenedor
          </FieldLabel>
          <Select
            items={{ all: "Todos los tipos", ...CONTAINER_TYPE_LABELS }}
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter((value ?? "") as ContainerType | "all")
            }
          >
            <SelectTrigger id="container-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {containerTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTAINER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="container-zone-filter">Zona</FieldLabel>
          <Select
            items={{
              all: "Todas las zonas",
              ...Object.fromEntries(
                zones.map((zone) => [zone.id, `${zone.code} · ${zone.name}`]),
              ),
            }}
            value={zoneFilter}
            onValueChange={(value) => setZoneFilter(value ?? "")}
          >
            <SelectTrigger id="container-zone-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.code} · {zone.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {state.status === "loading" && (
        <p
          aria-label="Cargando contenedores"
          className="text-sm text-muted-foreground"
        >
          Cargando inventario de contenedores…
        </p>
      )}

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>
            <span>{state.message}</span>
            <Button
              variant="outline"
              onClick={() => setRequestVersion((v) => v + 1)}
            >
              Reintentar carga
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {state.status === "ready" && state.containers.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              No hay contenedores registrados que coincidan con los filtros de
              búsqueda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {state.status === "ready" && state.containers.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Inventario de contenedores registrados</caption>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Código</th>
                <th scope="col" className="px-4 py-3">Tipo</th>
                <th scope="col" className="px-4 py-3">Zona</th>
                <th scope="col" className="px-4 py-3">Dirección</th>
                <th scope="col" className="px-4 py-3">Capacidad</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="sr-only">Abrir detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.containers.map((container) => {
                const zone = zones.find((z) => z.id === container.zoneId);
                return (
                  <tr key={container.id} className={styles.catalogRow}>
                    <th scope="row" data-label="Código" className="px-4 py-3 font-semibold text-foreground">
                      <Button
                        id={`container-detail-${container.id}`}
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Ver detalle de ${container.code}`}
                        onClick={() => openDetail(container)}
                        className="min-w-0 justify-start px-0 font-semibold text-foreground hover:bg-transparent hover:text-foreground after:absolute after:inset-0 after:z-10 after:cursor-pointer focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)]"
                      >
                        {container.code}
                        <ChevronRight data-icon="inline-end" aria-hidden className="hidden max-[760px]:inline" />
                      </Button>
                    </th>
                    <td data-label="Tipo" className="px-4 py-3">{CONTAINER_TYPE_LABELS[container.containerType]}</td>
                    <td data-label="Zona" className="px-4 py-3">
                      {zone ? `${zone.code} · ${zone.name}` : container.zoneId}
                    </td>
                    <td data-label="Dirección" className="px-4 py-3">{container.address ?? "—"}</td>
                    <td data-label="Capacidad" className="px-4 py-3">{container.capacityLiters.toLocaleString("es-AR")} L</td>
                    <td data-label="Estado" className="px-4 py-3">
                      <StatusBadge status={container.status} />
                    </td>
                    <td className={`${styles.rowChevron} px-4 py-3`} aria-hidden="true">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContainer ? "Editar contenedor" : "Registrar contenedor"}
            </DialogTitle>
            <DialogDescription>
              {editingContainer
                ? "Actualice los datos operativos del contenedor. El código y el tipo son inmutables tras su registro."
                : "Complete los datos del nuevo contenedor para incorporarlo al inventario en estado Activo."}
            </DialogDescription>
          </DialogHeader>

          {formErrors.general && (
            <Alert variant="destructive">
              <AlertDescription>{formErrors.general}</AlertDescription>
            </Alert>
          )}

          <form id="container-form" onSubmit={(e) => void handleSave(e)}>
            <FieldGroup>
              <Field data-invalid={Boolean(formErrors.code)}>
                <FieldLabel htmlFor="container-code">Código</FieldLabel>
                <Input
                  id="container-code"
                  value={form.code}
                  disabled={Boolean(editingContainer)}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required={!editingContainer}
                  aria-invalid={Boolean(formErrors.code)}
                  aria-describedby={
                    formErrors.code ? "container-code-error" : undefined
                  }
                />
                {formErrors.code && (
                  <FieldError id="container-code-error" role="none">
                    {formErrors.code}
                  </FieldError>
                )}
                {editingContainer && (
                  <FieldDescription>
                    Identificador inmutable asignado al alta.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="container-type-form">
                  Tipo de contenedor en el formulario
                </FieldLabel>
                <Select
                  items={CONTAINER_TYPE_LABELS}
                  value={form.containerType}
                  disabled={Boolean(editingContainer)}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      containerType: (value ?? "") as ContainerType,
                    })
                  }
                >
                  <SelectTrigger id="container-type-form">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {containerTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CONTAINER_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {editingContainer && (
                  <FieldDescription>
                    Categoría de residuo inmutable tras el registro.
                  </FieldDescription>
                )}
              </Field>

              <Field data-invalid={Boolean(formErrors.zoneId)}>
                <FieldLabel htmlFor="container-zone-form">
                  Zona en el formulario
                </FieldLabel>
                <Select
                  items={Object.fromEntries(
                    zones.map((zone) => [
                      zone.id,
                      `${zone.code} · ${zone.name}`,
                    ]),
                  )}
                  value={form.zoneId}
                  onValueChange={(value) =>
                    setForm({ ...form, zoneId: value ?? "" })
                  }
                  required
                >
                  <SelectTrigger
                    id="container-zone-form"
                    aria-required="true"
                    aria-invalid={Boolean(formErrors.zoneId)}
                    aria-describedby={
                      formErrors.zoneId ? "container-zone-error" : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.code} · {z.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {formErrors.zoneId && (
                  <FieldError id="container-zone-error" role="none">
                    {formErrors.zoneId}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(formErrors.capacityLiters)}>
                <FieldLabel htmlFor="container-capacity">
                  Capacidad (litros)
                </FieldLabel>
                <Input
                  id="container-capacity"
                  type="number"
                  min="1"
                  max={MAX_INT32}
                  step="1"
                  value={form.capacityLiters}
                  onChange={(e) =>
                    setForm({ ...form, capacityLiters: e.target.value })
                  }
                  required
                  aria-invalid={Boolean(formErrors.capacityLiters)}
                  aria-describedby={
                    formErrors.capacityLiters
                      ? "container-capacity-error"
                      : undefined
                  }
                />
                {formErrors.capacityLiters && (
                  <FieldError id="container-capacity-error" role="none">
                    {formErrors.capacityLiters}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(formErrors.address)}>
                <FieldLabel htmlFor="container-address">Dirección</FieldLabel>
                <Input
                  id="container-address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  required
                  aria-invalid={Boolean(formErrors.address)}
                  aria-describedby={
                    formErrors.address ? "container-address-error" : undefined
                  }
                />
                {formErrors.address && (
                  <FieldError id="container-address-error" role="none">
                    {formErrors.address}
                  </FieldError>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={Boolean(formErrors.lat)}>
                  <FieldLabel htmlFor="container-lat">Latitud</FieldLabel>
                  <Input
                    id="container-lat"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    required
                    aria-invalid={Boolean(formErrors.lat)}
                    aria-describedby={
                      formErrors.lat ? "container-lat-error" : undefined
                    }
                  />
                  {formErrors.lat && (
                    <FieldError id="container-lat-error" role="none">
                      {formErrors.lat}
                    </FieldError>
                  )}
                </Field>

                <Field data-invalid={Boolean(formErrors.lng)}>
                  <FieldLabel htmlFor="container-lng">Longitud</FieldLabel>
                  <Input
                    id="container-lng"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    required
                    aria-invalid={Boolean(formErrors.lng)}
                    aria-describedby={
                      formErrors.lng ? "container-lng-error" : undefined
                    }
                  />
                  {formErrors.lng && (
                    <FieldError id="container-lng-error" role="none">
                      {formErrors.lng}
                    </FieldError>
                  )}
                </Field>
              </div>
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" form="container-form" disabled={isSubmitting}>
              Guardar contenedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet
        open={Boolean(detailContainer)}
        onOpenChange={(open) => !open && closeDetail()}
      >
        {detailContainer && (
          <SheetContent
            side={detailSheetSide}
            className={
              detailSheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <SheetTitle>
                  Detalle del contenedor {detailContainer.code}
                </SheetTitle>
                <StatusBadge status={detailContainer.status} />
              </div>
              <SheetDescription>
                Información técnica y geográfica registrada en el inventario
                urbano.
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-2 gap-4 px-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {CONTAINER_TYPE_LABELS[detailContainer.containerType]}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Capacidad
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {detailContainer.capacityLiters.toLocaleString("es-AR")}{" "}
                  litros
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Zona operativa
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {zones.find((z) => z.id === detailContainer.zoneId)
                    ? `${zones.find((z) => z.id === detailContainer.zoneId)!.code} · ${zones.find((z) => z.id === detailContainer.zoneId)!.name}`
                    : detailContainer.zoneId}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Coordenadas
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {detailContainer.lat === null || detailContainer.lng === null
                    ? "—"
                    : `${detailContainer.lat}, ${detailContainer.lng}`}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dirección
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {detailContainer.address ?? "—"}
                </dd>
              </div>

              {detailContainer.status === "DAMAGED" && (
                <div className="col-span-2">
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-semibold text-destructive">
                        Diagnóstico de daño
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Tipo de daño:{" "}
                          </span>
                          <span className="font-medium text-foreground">
                            {detailContainer.damageType
                              ? DAMAGE_TYPE_LABELS[detailContainer.damageType]
                              : "No especificado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Severidad:{" "}
                          </span>
                          <span className="font-medium text-foreground">
                            {detailContainer.severity
                              ? SEVERITY_LABELS[detailContainer.severity]
                              : "No especificada"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Obras Públicas requeridas:{" "}
                          </span>
                          <span className="font-medium text-foreground">
                            {detailContainer.requiresPublicWorks
                              ? "Sí (notificación a M3)"
                              : "No"}
                          </span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidencias adjuntas
                </dt>
                <dd className="mt-1">
                  {isLoadingEvidence ? (
                    <p className="text-xs text-muted-foreground">
                      Cargando evidencias…
                    </p>
                  ) : detailEvidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No registra evidencias adjuntas.
                    </p>
                  ) : (
                    <ItemGroup
                      aria-label="Evidencias adjuntas"
                      className="gap-2"
                    >
                      {detailEvidence.map((att) => (
                        <Item
                          key={att.id}
                          variant="outline"
                          size="sm"
                          className="flex-wrap"
                        >
                          <ItemMedia variant="icon">
                            <FileText aria-hidden />
                          </ItemMedia>
                          <ItemContent className="min-w-0">
                            <ItemTitle className="break-all">
                              {att.filename}
                            </ItemTitle>
                            <ItemDescription>{att.contentType}</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              variant="link"
                              size="sm"
                              render={
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                />
                              }
                            >
                              Ver archivo
                            </Button>
                          </ItemActions>
                        </Item>
                      ))}
                    </ItemGroup>
                  )}
                </dd>
              </div>
            </dl>

            <SheetFooter className="gap-4 pt-0">
              {canManage && servicesStatus === "error" ? (
                <Alert role="status">
                  <AlertDescription>
                    <p>{serviceLookupFailure}</p>
                    <Button variant="outline" onClick={refreshServiceLookup}>
                      Reintentar
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
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
                      const target = detailContainer;
                      closeDetail();
                      openEdit(target);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                </section>
              ) : null}

              {((canReport && detailContainer.status === "ACTIVE") ||
                (canManage &&
                  ["OVERFLOWED", "ACTIVE", "RELOCATING"].includes(
                    detailContainer.status,
                  ))) && (
                <section aria-label="Operación" className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operación
                  </h3>
                  {canReport && detailContainer.status === "ACTIVE" ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setReportingOverflowContainer(target);
                        }}
                      >
                        <AlertTriangle data-icon="inline-start" aria-hidden />
                        Reportar desborde
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setReportingDamageContainer(target);
                        }}
                      >
                        <AlertTriangle data-icon="inline-start" aria-hidden />
                        Reportar daño
                      </Button>
                    </>
                  ) : null}
                  {canManage && detailContainer.status === "OVERFLOWED" ? (
                    detailInFlight ? (
                      <Badge variant="info" className="w-fit max-w-full">
                        <Clock data-icon="inline-start" aria-hidden />
                        Servicio en curso ({detailInFlight.id})
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={servicesStatus !== "ready"}
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setEmptyContainer(target);
                        }}
                      >
                        <Check data-icon="inline-start" aria-hidden />
                        Vaciar contenedor
                      </Button>
                    )
                  ) : null}
                  {canManage && detailContainer.status === "ACTIVE" ? (
                    detailInFlight ? (
                      <Badge variant="info" className="w-fit max-w-full">
                        <Clock data-icon="inline-start" aria-hidden />
                        Servicio en curso ({detailInFlight.id})
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={servicesStatus !== "ready"}
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setStartRelocatingContainer(target);
                        }}
                      >
                        <RotateCcw data-icon="inline-start" aria-hidden />
                        Reubicar
                      </Button>
                    )
                  ) : null}
                  {canManage && detailContainer.status === "RELOCATING" ? (
                    detailInFlight ? (
                      <Badge variant="info" className="w-fit max-w-full">
                        <Clock data-icon="inline-start" aria-hidden />
                        Servicio en curso ({detailInFlight.id})
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={servicesStatus !== "ready"}
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setConfirmRelocatingContainer(target);
                        }}
                      >
                        <MapPin data-icon="inline-start" aria-hidden />
                        Confirmar ubicación
                      </Button>
                    )
                  ) : null}
                </section>
              )}

              {canManage &&
              (detailContainer.status === "DAMAGED" ||
                detailContainer.status === "UNDER_REPAIR") ? (
                <section aria-label="Mantenimiento" className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mantenimiento
                  </h3>
                  {detailContainer.status === "DAMAGED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        const target = detailContainer;
                        pendingRepairFocusId.current = target.id;
                        closeDetail();
                        setStartingRepairContainer(target);
                      }}
                    >
                      <Wrench data-icon="inline-start" aria-hidden />
                      Iniciar reparación independiente
                    </Button>
                  ) : detailInFlight ? (
                    <Badge variant="info" className="w-fit max-w-full">
                      <Clock data-icon="inline-start" aria-hidden />
                      Servicio en curso ({detailInFlight.id})
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      disabled={servicesStatus !== "ready"}
                      onClick={() => {
                        const target = detailContainer;
                        closeDetail();
                        setCompletingRepairContainer(target);
                      }}
                    >
                      <CheckCircle2 data-icon="inline-start" aria-hidden />
                      Completar reparación independiente
                    </Button>
                  )}
                </section>
              ) : null}

              {canManage && detailContainer.status === "DAMAGED" ? (
                <section aria-label="Destructivas" className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Destructivas
                  </h3>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full justify-start"
                    disabled={servicesStatus !== "ready" || Boolean(detailInFlight)}
                    onClick={() => {
                      const target = detailContainer;
                      closeDetail();
                      setRemovingContainer(target);
                    }}
                  >
                    <ArchiveX data-icon="inline-start" aria-hidden />
                    Retirar contenedor
                  </Button>
                </section>
              ) : null}
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      {/* Report Overflow Dialog */}
      <ReportOverflowDialog
        open={Boolean(reportingOverflowContainer)}
        onOpenChange={(open) => !open && setReportingOverflowContainer(null)}
        container={reportingOverflowContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) =>
                    c.id === updated.id ? updated : c,
                  ),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(
            `Desborde reportado con éxito para el contenedor ${updated.code}.`,
          );
        }}
      />

      {/* Report Damage Dialog */}
      <ReportDamageDialog
        open={Boolean(reportingDamageContainer)}
        onOpenChange={(open) => !open && setReportingDamageContainer(null)}
        container={reportingDamageContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          applyUpdatedContainer(updated);
          setNotice(
            `Reporte de daño registrado con éxito para el contenedor ${updated.code}.`,
          );
        }}
      />

      {/* Empty Container Dialog (#123) */}
      <EmptyContainerDialog
        open={Boolean(emptyContainer)}
        onOpenChange={(open) => !open && setEmptyContainer(null)}
        container={emptyContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) =>
                    c.id === updated.id ? updated : c,
                  ),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(
            `Vaciado registrado con éxito para el contenedor ${updated.code}.`,
          );
        }}
      />

      {/* Start Relocation Dialog (#123) */}
      <StartRelocationDialog
        open={Boolean(startRelocatingContainer)}
        onOpenChange={(open) => !open && setStartRelocatingContainer(null)}
        container={startRelocatingContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) =>
                    c.id === updated.id ? updated : c,
                  ),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(
            `Proceso de reubicación iniciado para el contenedor ${updated.code}.`,
          );
        }}
      />

      {/* Confirm Relocation Dialog (#123) */}
      <ConfirmRelocationDialog
        open={Boolean(confirmRelocatingContainer)}
        onOpenChange={(open) => !open && setConfirmRelocatingContainer(null)}
        container={confirmRelocatingContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) =>
                    c.id === updated.id ? updated : c,
                  ),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(
            `Nueva ubicación confirmada con éxito para el contenedor ${updated.code}.`,
          );
        }}
      />

      <StartRepairDialog
        open={Boolean(startingRepairContainer)}
        onOpenChange={(open) => !open && setStartingRepairContainer(null)}
        container={startingRepairContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          applyUpdatedContainer(updated);
          setNotice(`Reparación iniciada para el contenedor ${updated.code}.`);
        }}
      />

      <CompleteRepairDialog
        open={Boolean(completingRepairContainer)}
        onOpenChange={(open) => !open && setCompletingRepairContainer(null)}
        container={completingRepairContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          applyUpdatedContainer(updated);
          setNotice(
            `Reparación completada con éxito para el contenedor ${updated.code}.`,
          );
        }}
      />

      <RemoveContainerDialog
        open={Boolean(removingContainer)}
        onOpenChange={(open) => !open && setRemovingContainer(null)}
        container={removingContainer}
        onSuccess={(updated) => {
          refreshServiceLookup();
          applyUpdatedContainer(updated);
          setNotice(`Contenedor ${updated.code} retirado con éxito.`);
        }}
      />
    </section>
  );
}
