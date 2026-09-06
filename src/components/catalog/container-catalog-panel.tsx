"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Archive,
  ArchiveX,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
  Wrench,
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { formControlClass } from "@/components/ui/form-control";
import {
  CONTAINER_STATUS_CLASSES,
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

function StatusBadge({ status }: { status: ContainerStatus }) {
  const label = CONTAINER_STATUS_LABELS[status];
  const style = CONTAINER_STATUS_CLASSES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
      role="status"
      aria-label={`Estado: ${label}`}
    >
      {status === "ACTIVE" && <Check className="size-3.5 shrink-0" aria-hidden />}
      {(status === "DAMAGED" || status === "REMOVED") && (
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      )}
      {(status === "OVERFLOWED" || status === "UNDER_REPAIR") && (
        <Clock className="size-3.5 shrink-0" aria-hidden />
      )}
      {status === "RELOCATING" && <RotateCcw className="size-3.5 shrink-0" aria-hidden />}
      <span>{label}</span>
    </span>
  );
}

export function ContainerCatalogPanel({ scenario }: { scenario: OperationalScenario }) {
  const canManage =
    scenario.actor.kind === "OFFICE" && scenario.capabilities.includes("container:manage");
  const canReport = scenario.capabilities.includes("container:report");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [requestVersion, setRequestVersion] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ContainerType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [form, setForm] = useState<ContainerForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailContainer, setDetailContainer] = useState<Container | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<Attachment[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

  const [reportingOverflowContainer, setReportingOverflowContainer] = useState<Container | null>(null);
  const [reportingDamageContainer, setReportingDamageContainer] = useState<Container | null>(null);
  const [emptyContainer, setEmptyContainer] = useState<Container | null>(null);
  const [startRelocatingContainer, setStartRelocatingContainer] = useState<Container | null>(null);
  const [confirmRelocatingContainer, setConfirmRelocatingContainer] = useState<Container | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [startingRepairContainer, setStartingRepairContainer] = useState<Container | null>(null);
  const [completingRepairContainer, setCompletingRepairContainer] = useState<Container | null>(null);
  const [removingContainer, setRemovingContainer] = useState<Container | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void servicesAdapter
      .list({ pageSize: 100 })
      .then((page) => {
        if (isCurrent) setServices(page.services);
      })
      .catch(() => {
        if (isCurrent) setServices([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [requestVersion]);

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
        if (isCurrent) setState({ status: "ready", containers: page.containers });
      } catch (caught) {
        if (isCurrent) {
          setState({
            status: "error",
            message:
              caught instanceof Error ? caught.message : "No se pudieron cargar los contenedores.",
          });
        }
      }
    }
    void requestContainers();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion]);

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
      address: container.address,
      lat: String(container.lat),
      lng: String(container.lng),
      capacityLiters: String(container.capacityLiters),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function openDetail(container: Container) {
    setDetailEvidence([]);
    setIsLoadingEvidence(true);
    setDetailContainer(container);
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

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (!Number.isFinite(latNum)) {
      errors.lat = "Indique una latitud numérica válida.";
    }
    if (!Number.isFinite(lngNum)) {
      errors.lng = "Indique una longitud numérica válida.";
    }

    const capacityNum = Number(form.capacityLiters);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      errors.capacityLiters = "La capacidad debe ser un número entero mayor a 0 litros.";
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
        general:
          caught instanceof Error ? caught.message : "No se pudo completar la operación solicitada.",
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
            containers: prev.containers.map((c) => (c.id === updated.id ? updated : c)),
          }
        : prev,
    );
    if (detailContainer?.id === updated.id) setDetailContainer(updated);
  }

  return (
    <section aria-labelledby="containers-title" className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Archive aria-hidden className="size-5 text-[var(--color-institutional)]" />
            <h1 id="containers-title" className="text-xl font-semibold tracking-tight">
              Contenedores
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario urbano de contenedores de vía pública para recolección diferenciada y mantenimiento.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden />
            Registrar contenedor
          </Button>
        )}
      </div>

      {notice && (
        <p
          className="text-sm font-medium text-[var(--color-success)]"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      )}

      {/* Filter panel */}
      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4"
        aria-label="Filtros del catálogo de contenedores"
      >
        <Field>
          <FieldLabel htmlFor="container-search-filter">Buscar contenedor</FieldLabel>
          <input
            id="container-search-filter"
            type="search"
            placeholder="Código o dirección…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={formControlClass}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="container-status-filter">Estado</FieldLabel>
          <select
            id="container-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContainerStatus | "all")}
            className={formControlClass}
          >
            <option value="all">Todos los estados</option>
            {containerStatuses.map((st) => (
              <option key={st} value={st}>
                {CONTAINER_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="container-type-filter">Tipo de contenedor</FieldLabel>
          <select
            id="container-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContainerType | "all")}
            className={formControlClass}
          >
            <option value="all">Todos los tipos</option>
            {containerTypes.map((t) => (
              <option key={t} value={t}>
                {CONTAINER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="container-zone-filter">Zona</FieldLabel>
          <select
            id="container-zone-filter"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className={formControlClass}
          >
            <option value="all">Todas las zonas</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.code} · {zone.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state.status === "loading" && (
        <p aria-label="Cargando contenedores" className="text-sm text-muted-foreground">
          Cargando inventario de contenedores…
        </p>
      )}

      {state.status === "error" && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <span>{state.message}</span>
          <Button variant="outline" onClick={() => setRequestVersion((v) => v + 1)}>
            Reintentar carga
          </Button>
        </div>
      )}

      {state.status === "ready" && state.containers.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No hay contenedores registrados que coincidan con los filtros de búsqueda.
        </p>
      )}

      {state.status === "ready" && state.containers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Inventario de contenedores registrados</caption>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Código</th>
                <th scope="col" className="px-4 py-3">Tipo</th>
                <th scope="col" className="px-4 py-3">Zona</th>
                <th scope="col" className="px-4 py-3">Dirección</th>
                <th scope="col" className="px-4 py-3">Capacidad</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.containers.map((container) => {
                const zone = zones.find((z) => z.id === container.zoneId);
                const inFlight = findInFlightServiceForContainer(container, services);
                return (
                  <tr key={container.id}>
                    <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                      {container.code}
                    </th>
                    <td className="px-4 py-3">{CONTAINER_TYPE_LABELS[container.containerType]}</td>
                    <td className="px-4 py-3">
                      {zone ? `${zone.code} · ${zone.name}` : container.zoneId}
                    </td>
                    <td className="px-4 py-3">{container.address}</td>
                    <td className="px-4 py-3">{container.capacityLiters.toLocaleString("es-AR")} L</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={container.status} />
                    </td>
                    <td className="flex flex-wrap gap-2 px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(container)}
                      >
                        <Eye data-icon="inline-start" aria-hidden />
                        Ver detalle
                      </Button>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(container)}
                        >
                          <Pencil data-icon="inline-start" aria-hidden />
                          Editar
                        </Button>
                      )}
                      {canReport && container.status === "ACTIVE" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReportingOverflowContainer(container)}
                            className="text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10"
                          >
                            <AlertTriangle data-icon="inline-start" aria-hidden />
                            Reportar desborde
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReportingDamageContainer(container)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <AlertTriangle data-icon="inline-start" aria-hidden />
                            Reportar daño
                          </Button>
                        </>
                      )}
                      {canManage && container.status === "OVERFLOWED" && (
                        inFlight ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-medium text-[var(--color-warning)]"
                            title={`Servicio en curso vinculado: ${inFlight.id}`}
                            data-testid={`in-flight-badge-${container.id}`}
                          >
                            <Clock className="size-3.5 shrink-0" aria-hidden />
                            <span>Servicio en curso ({inFlight.id})</span>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEmptyContainer(container)}
                            className="text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                          >
                            <Check data-icon="inline-start" aria-hidden />
                            Vaciar contenedor
                          </Button>
                        )
                      )}
                      {canManage && container.status === "ACTIVE" && (
                        inFlight ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-medium text-[var(--color-info)]"
                            title={`Servicio en curso vinculado: ${inFlight.id}`}
                            data-testid={`in-flight-badge-${container.id}`}
                          >
                            <Clock className="size-3.5 shrink-0" aria-hidden />
                            <span>Servicio en curso ({inFlight.id})</span>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStartRelocatingContainer(container)}
                            className="text-[var(--color-info)] hover:bg-[var(--color-info)]/10"
                          >
                            <RotateCcw data-icon="inline-start" aria-hidden />
                            Reubicar
                          </Button>
                        )
                      )}
                      {canManage && container.status === "RELOCATING" && (
                        inFlight ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-medium text-[var(--color-info)]"
                            title={`Servicio en curso vinculado: ${inFlight.id}`}
                            data-testid={`in-flight-badge-${container.id}`}
                          >
                            <Clock className="size-3.5 shrink-0" aria-hidden />
                            <span>Servicio en curso ({inFlight.id})</span>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRelocatingContainer(container)}
                            className="text-[var(--color-info)] hover:bg-[var(--color-info)]/10"
                          >
                            <MapPin data-icon="inline-start" aria-hidden />
                            Confirmar ubicación
                          </Button>
                        )
                      )}
                      {canManage && container.status === "DAMAGED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStartingRepairContainer(container)}
                            className="text-[var(--color-action)]"
                          >
                            <Wrench data-icon="inline-start" aria-hidden />
                            Iniciar reparación independiente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRemovingContainer(container)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <ArchiveX data-icon="inline-start" aria-hidden />
                            Retirar contenedor
                          </Button>
                        </>
                      )}
                      {canManage && container.status === "UNDER_REPAIR" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCompletingRepairContainer(container)}
                          className="text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                        >
                          <CheckCircle2 data-icon="inline-start" aria-hidden />
                          Completar reparación independiente
                        </Button>
                      )}
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
        <DialogContent>
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
            <p role="alert" className="text-sm text-destructive">
              {formErrors.general}
            </p>
          )}

          <form id="container-form" onSubmit={(e) => void handleSave(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="container-code">Código</FieldLabel>
                <input
                  id="container-code"
                  value={form.code}
                  disabled={Boolean(editingContainer)}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className={formControlClass}
                  required={!editingContainer}
                  aria-invalid={Boolean(formErrors.code)}
                  aria-describedby={formErrors.code ? "container-code-error" : undefined}
                />
                {formErrors.code && (
                  <FieldError id="container-code-error" role="none">
                    {formErrors.code}
                  </FieldError>
                )}
                {editingContainer && (
                  <FieldDescription>Identificador inmutable asignado al alta.</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="container-type-form">
                  Tipo de contenedor en el formulario
                </FieldLabel>
                <select
                  id="container-type-form"
                  value={form.containerType}
                  disabled={Boolean(editingContainer)}
                  onChange={(e) =>
                    setForm({ ...form, containerType: e.target.value as ContainerType })
                  }
                  className={formControlClass}
                >
                  {containerTypes.map((t) => (
                    <option key={t} value={t}>
                      {CONTAINER_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                {editingContainer && (
                  <FieldDescription>Categoría de residuo inmutable tras el registro.</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="container-zone-form">Zona en el formulario</FieldLabel>
                <select
                  id="container-zone-form"
                  value={form.zoneId}
                  onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
                  className={formControlClass}
                  required
                  aria-invalid={Boolean(formErrors.zoneId)}
                  aria-describedby={formErrors.zoneId ? "container-zone-error" : undefined}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} · {z.name}
                    </option>
                  ))}
                </select>
                {formErrors.zoneId && (
                  <FieldError id="container-zone-error" role="none">
                    {formErrors.zoneId}
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="container-capacity">Capacidad (litros)</FieldLabel>
                <input
                  id="container-capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacityLiters}
                  onChange={(e) => setForm({ ...form, capacityLiters: e.target.value })}
                  className={formControlClass}
                  required
                  aria-invalid={Boolean(formErrors.capacityLiters)}
                  aria-describedby={formErrors.capacityLiters ? "container-capacity-error" : undefined}
                />
                {formErrors.capacityLiters && (
                  <FieldError id="container-capacity-error" role="none">
                    {formErrors.capacityLiters}
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="container-address">Dirección</FieldLabel>
                <input
                  id="container-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={formControlClass}
                  required
                  aria-invalid={Boolean(formErrors.address)}
                  aria-describedby={formErrors.address ? "container-address-error" : undefined}
                />
                {formErrors.address && (
                  <FieldError id="container-address-error" role="none">
                    {formErrors.address}
                  </FieldError>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="container-lat">Latitud</FieldLabel>
                  <input
                    id="container-lat"
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className={formControlClass}
                    required
                    aria-invalid={Boolean(formErrors.lat)}
                    aria-describedby={formErrors.lat ? "container-lat-error" : undefined}
                  />
                  {formErrors.lat && (
                    <FieldError id="container-lat-error" role="none">
                      {formErrors.lat}
                    </FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="container-lng">Longitud</FieldLabel>
                  <input
                    id="container-lng"
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className={formControlClass}
                    required
                    aria-invalid={Boolean(formErrors.lng)}
                    aria-describedby={formErrors.lng ? "container-lng-error" : undefined}
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

      {/* Detail Dialog */}
      <Dialog open={Boolean(detailContainer)} onOpenChange={(open) => !open && closeDetail()}>
        {detailContainer && (
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>Detalle del contenedor {detailContainer.code}</DialogTitle>
                <StatusBadge status={detailContainer.status} />
              </div>
              <DialogDescription>
                Información técnica y geográfica registrada en el inventario urbano.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-4 text-sm">
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
                  {detailContainer.capacityLiters.toLocaleString("es-AR")} litros
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
                  {detailContainer.lat}, {detailContainer.lng}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dirección
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {detailContainer.address}
                </dd>
              </div>

              {detailContainer.status === "DAMAGED" && (
                <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="font-semibold text-destructive">Diagnóstico de daño</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tipo de daño: </span>
                      <span className="font-medium text-foreground">
                        {detailContainer.damageType ? DAMAGE_TYPE_LABELS[detailContainer.damageType] : "No especificado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Severidad: </span>
                      <span className="font-medium text-foreground">
                        {detailContainer.severity ? SEVERITY_LABELS[detailContainer.severity] : "No especificada"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Obras Públicas requeridas: </span>
                      <span className="font-medium text-foreground">
                        {detailContainer.requiresPublicWorks ? "Sí (notificación a M3)" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidencias adjuntas
                </dt>
                <dd className="mt-1">
                  {isLoadingEvidence ? (
                    <p className="text-xs text-muted-foreground">Cargando evidencias…</p>
                  ) : detailEvidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No registra evidencias adjuntas.</p>
                  ) : (
                    <ul className="space-y-1.5" role="list">
                      {detailEvidence.map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="truncate">
                              <span className="font-medium text-foreground">{att.filename}</span>
                              <span className="ml-2 text-[11px] text-muted-foreground">
                                ({att.contentType})
                              </span>
                            </div>
                          </div>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline shrink-0"
                          >
                            Ver archivo
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
              {(canReport && detailContainer.status === "ACTIVE") ||
              (canManage &&
                ["DAMAGED", "UNDER_REPAIR", "OVERFLOWED", "ACTIVE", "RELOCATING"].includes(
                  detailContainer.status,
                )) ? (
                <div className="flex flex-wrap gap-2">
                  {canReport && detailContainer.status === "ACTIVE" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setReportingOverflowContainer(target);
                        }}
                        className="text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10"
                      >
                        <AlertTriangle data-icon="inline-start" aria-hidden />
                        Reportar desborde
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setReportingDamageContainer(target);
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <AlertTriangle data-icon="inline-start" aria-hidden />
                        Reportar daño
                      </Button>
                    </>
                  )}
                  {(() => {
                    const detailInFlight = findInFlightServiceForContainer(detailContainer, services);
                    return (
                      <>
                        {canManage && detailContainer.status === "OVERFLOWED" && (
                          detailInFlight ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-medium text-[var(--color-warning)]"
                              title={`Servicio en curso vinculado: ${detailInFlight.id}`}
                            >
                              <Clock className="size-3.5 shrink-0" aria-hidden />
                              <span>Servicio en curso ({detailInFlight.id})</span>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const target = detailContainer;
                                closeDetail();
                                setEmptyContainer(target);
                              }}
                              className="text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                            >
                              <Check data-icon="inline-start" aria-hidden />
                              Vaciar contenedor
                            </Button>
                          )
                        )}
                        {canManage && detailContainer.status === "ACTIVE" && (
                          detailInFlight ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-medium text-[var(--color-info)]"
                              title={`Servicio en curso vinculado: ${detailInFlight.id}`}
                            >
                              <Clock className="size-3.5 shrink-0" aria-hidden />
                              <span>Servicio en curso ({detailInFlight.id})</span>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const target = detailContainer;
                                closeDetail();
                                setStartRelocatingContainer(target);
                              }}
                              className="text-[var(--color-info)] hover:bg-[var(--color-info)]/10"
                            >
                              <RotateCcw data-icon="inline-start" aria-hidden />
                              Reubicar
                            </Button>
                          )
                        )}
                        {canManage && detailContainer.status === "RELOCATING" && (
                          detailInFlight ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-medium text-[var(--color-info)]"
                              title={`Servicio en curso vinculado: ${detailInFlight.id}`}
                            >
                              <Clock className="size-3.5 shrink-0" aria-hidden />
                              <span>Servicio en curso ({detailInFlight.id})</span>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const target = detailContainer;
                                closeDetail();
                                setConfirmRelocatingContainer(target);
                              }}
                              className="text-[var(--color-info)] hover:bg-[var(--color-info)]/10"
                            >
                              <MapPin data-icon="inline-start" aria-hidden />
                              Confirmar ubicación
                            </Button>
                          )
                        )}
                      </>
                    );
                  })()}
                  {canManage && detailContainer.status === "DAMAGED" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setStartingRepairContainer(target);
                        }}
                        className="text-[var(--color-action)]"
                      >
                        <Wrench data-icon="inline-start" aria-hidden />
                        Iniciar reparación independiente
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = detailContainer;
                          closeDetail();
                          setRemovingContainer(target);
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <ArchiveX data-icon="inline-start" aria-hidden />
                        Retirar contenedor
                      </Button>
                    </>
                  )}
                  {canManage && detailContainer.status === "UNDER_REPAIR" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = detailContainer;
                        closeDetail();
                        setCompletingRepairContainer(target);
                      }}
                      className="text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                    >
                      <CheckCircle2 data-icon="inline-start" aria-hidden />
                      Completar reparación independiente
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}
              <Button type="button" variant="outline" onClick={closeDetail}>
                Cerrar detalle
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Report Overflow Dialog */}
      <ReportOverflowDialog
        open={Boolean(reportingOverflowContainer)}
        onOpenChange={(open) => !open && setReportingOverflowContainer(null)}
        container={reportingOverflowContainer}
        onSuccess={(updated) => {
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(`Desborde reportado con éxito para el contenedor ${updated.code}.`);
        }}
      />

      {/* Report Damage Dialog */}
      <ReportDamageDialog
        open={Boolean(reportingDamageContainer)}
        onOpenChange={(open) => !open && setReportingDamageContainer(null)}
        container={reportingDamageContainer}
        onSuccess={(updated) => {
          applyUpdatedContainer(updated);
          setNotice(`Reporte de daño registrado con éxito para el contenedor ${updated.code}.`);
        }}
      />

      {/* Empty Container Dialog (#123) */}
      <EmptyContainerDialog
        open={Boolean(emptyContainer)}
        onOpenChange={(open) => !open && setEmptyContainer(null)}
        container={emptyContainer}
        onSuccess={(updated) => {
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(`Vaciado registrado con éxito para el contenedor ${updated.code}.`);
        }}
      />

      {/* Start Relocation Dialog (#123) */}
      <StartRelocationDialog
        open={Boolean(startRelocatingContainer)}
        onOpenChange={(open) => !open && setStartRelocatingContainer(null)}
        container={startRelocatingContainer}
        onSuccess={(updated) => {
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(`Proceso de reubicación iniciado para el contenedor ${updated.code}.`);
        }}
      />

      {/* Confirm Relocation Dialog (#123) */}
      <ConfirmRelocationDialog
        open={Boolean(confirmRelocatingContainer)}
        onOpenChange={(open) => !open && setConfirmRelocatingContainer(null)}
        container={confirmRelocatingContainer}
        onSuccess={(updated) => {
          setState((prev) =>
            prev.status === "ready"
              ? {
                  ...prev,
                  containers: prev.containers.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev,
          );
          if (detailContainer?.id === updated.id) {
            setDetailContainer(updated);
          }
          setNotice(`Nueva ubicación confirmada con éxito para el contenedor ${updated.code}.`);
        }}
      />

      <StartRepairDialog
        open={Boolean(startingRepairContainer)}
        onOpenChange={(open) => !open && setStartingRepairContainer(null)}
        container={startingRepairContainer}
        onSuccess={(updated) => {
          applyUpdatedContainer(updated);
          setNotice(`Reparación iniciada para el contenedor ${updated.code}.`);
        }}
      />

      <CompleteRepairDialog
        open={Boolean(completingRepairContainer)}
        onOpenChange={(open) => !open && setCompletingRepairContainer(null)}
        container={completingRepairContainer}
        onSuccess={(updated) => {
          applyUpdatedContainer(updated);
          setNotice(`Reparación completada con éxito para el contenedor ${updated.code}.`);
        }}
      />

      <RemoveContainerDialog
        open={Boolean(removingContainer)}
        onOpenChange={(open) => !open && setRemovingContainer(null)}
        container={removingContainer}
        onSuccess={(updated) => {
          applyUpdatedContainer(updated);
          setNotice(`Contenedor ${updated.code} retirado con éxito.`);
        }}
      />
    </section>
  );
}
