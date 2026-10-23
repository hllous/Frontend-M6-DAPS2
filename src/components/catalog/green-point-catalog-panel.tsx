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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  greenPointCreateInputSchema,
  greenPointUpdateInputSchema,
  greenPointsAdapter,
  GreenPointRequestError,
  wasteTypeSchema,
  type GreenPoint,
  type GreenPointCreateInput,
  type GreenPointQuery,
  type GreenPointUpdateInput,
  type WasteType,
  WASTE_TYPE_LABELS,
} from "@/lib/green-points";
import type { OperationalScenario } from "@/lib/scenarios";
import { zoneLabel, zonesAdapter, type Zone } from "@/lib/zones";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

import styles from "./catalog-panel.module.css";

const wasteTypes = wasteTypeSchema.options;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: GreenPoint[]; total: number }
  | { status: "error"; message: string };

type PointForm = {
  code: string;
  name: string;
  zoneId: string;
  wasteTypes: WasteType[];
  address: string;
  lat: string;
  lng: string;
  active: boolean;
};

type PointFormField = keyof PointForm;
type PointFormFieldErrors = Partial<Record<PointFormField, string>>;

const emptyForm: PointForm = {
  code: "",
  name: "",
  zoneId: "",
  wasteTypes: ["RECYCLABLE"],
  address: "",
  lat: "",
  lng: "",
  active: true,
};

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function pointFormPayload(form: PointForm) {
  return {
    name: form.name,
    zoneId: form.zoneId,
    wasteTypes: form.wasteTypes,
    address: form.address.trim() || undefined,
    lat: parseOptionalNumber(form.lat),
    lng: parseOptionalNumber(form.lng),
    active: form.active,
  };
}

export function GreenPointCatalogPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("greenPoint:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [zoneFilter, setZoneFilter] = useState("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | "all">(
    "all",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<GreenPoint | null>(null);
  const [form, setForm] = useState<PointForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<PointFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailPoint, setDetailPoint] = useState<GreenPoint | null>(null);
  const [detailSheetSide, setDetailSheetSide] = useState<"right" | "bottom">(
    "right",
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deactivatingPoint, setDeactivatingPoint] = useState<GreenPoint | null>(
    null,
  );
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 760px)");
    const updateSide = () =>
      setDetailSheetSide(media.matches ? "bottom" : "right");
    updateSide();
    media.addEventListener("change", updateSide);
    return () => media.removeEventListener("change", updateSide);
  }, []);

  const query = useMemo<GreenPointQuery>(
    () => ({
      active: activeFilter === "all" ? undefined : activeFilter === "true",
      zoneId: zoneFilter === "all" ? undefined : zoneFilter,
      wasteType: wasteTypeFilter === "all" ? undefined : wasteTypeFilter,
      search: search.trim() || undefined,
      pageSize: 100,
    }),
    [activeFilter, search, wasteTypeFilter, zoneFilter],
  );

  useEffect(() => {
    let isCurrent = true;
    void zonesAdapter
      .list({ pageSize: 100 })
      .then((page) => {
        if (isCurrent) setZones(page.zones);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setZonesLoaded(true);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    async function loadPoints() {
      setState({ status: "loading" });
      try {
        const page = await greenPointsAdapter.list(query);
        if (isCurrent)
          setState({
            status: "ready",
            items: page.greenPoints,
            total: page.total,
          });
      } catch (caught) {
        if (isCurrent)
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar los puntos verdes.",
            ),
          });
      }
    }
    void loadPoints();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion]);

  const openCreate = () => {
    setEditingPoint(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (point: GreenPoint) => {
    setEditingPoint(point);
    setForm({
      code: point.code,
      name: point.name,
      zoneId: point.zoneId,
      wasteTypes: point.wasteTypes,
      address: point.address ?? "",
      lat: point.lat === null ? "" : String(point.lat),
      lng: point.lng === null ? "" : String(point.lng),
      active: point.active,
    });
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openDetail = async (point: GreenPoint) => {
    setDetailPoint(point);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetailPoint(await greenPointsAdapter.get(point.id));
    } catch (caught) {
      setDetailError(
        errorMessage(caught, "No se pudo cargar el detalle del punto verde."),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleWasteType = (wasteType: WasteType) => {
    setForm((current) => ({
      ...current,
      wasteTypes: current.wasteTypes.includes(wasteType)
        ? current.wasteTypes.filter((item) => item !== wasteType)
        : [...current.wasteTypes, wasteType],
    }));
    setFieldErrors((current) => ({ ...current, wasteTypes: undefined }));
    setFormError(null);
  };

  const updateFormField = <K extends PointFormField>(
    field: K,
    value: PointForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const payload = pointFormPayload(form);
    const parsed = editingPoint
      ? greenPointUpdateInputSchema.safeParse(payload)
      : greenPointCreateInputSchema.safeParse({ code: form.code, ...payload });
    if (!parsed.success) {
      const nextFieldErrors: PointFormFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          typeof field === "string" &&
          field in emptyForm &&
          !nextFieldErrors[field as PointFormField]
        ) {
          nextFieldErrors[field as PointFormField] = issue.message;
        }
      }
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setFormError(
          parsed.error.issues[0]?.message ?? "Revise los datos del formulario.",
        );
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPoint) {
        await greenPointsAdapter.update(
          editingPoint.id,
          parsed.data as GreenPointUpdateInput,
        );
        setNotice("Punto verde actualizado.");
      } else {
        await greenPointsAdapter.create(parsed.data as GreenPointCreateInput);
        setNotice("Punto verde creado.");
      }
      setFormOpen(false);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(
        caught instanceof GreenPointRequestError
          ? caught.message
          : errorMessage(caught, "No se pudo guardar el punto verde."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivate = (point: GreenPoint) => {
    setNotice(null);
    setDeactivateError(null);
    setDeactivatingPoint(point);
  };

  const confirmDeactivation = async () => {
    if (!deactivatingPoint) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await greenPointsAdapter.remove(deactivatingPoint.id);
      setDeactivatingPoint(null);
      setNotice(
        "Punto verde dado de baja.",
      );
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(
        caught instanceof GreenPointRequestError
          ? caught.message
          : "No se pudo dar de baja el punto verde.",
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  return (
    <section
      aria-labelledby="green-points-title"
      className="flex flex-col gap-6"
    >
      <CatalogPageHeader
        title="Puntos verdes"
        titleId="green-points-title"
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar punto verde
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Solo consulta
        </p>
      ) : null}
      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_190px_150px]">
        <Field>
          <FieldLabel htmlFor="green-point-search">
            Buscar por nombre o dirección
          </FieldLabel>
          <Input
            id="green-point-search"
            aria-label="Buscar punto verde"
            placeholder="Nombre o dirección"
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="green-point-zone-filter">Zona</FieldLabel>
          <Select
            items={{
              all: "Todas",
              ...Object.fromEntries(
                zones.map((zone) => [zone.id, zone.name]),
              ),
            }}
            value={zoneFilter}
            onValueChange={(value) => setZoneFilter(value ?? "")}
          >
            <SelectTrigger
              id="green-point-zone-filter"
              aria-label="Filtrar puntos verdes por zona"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas</SelectItem>
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
          <FieldLabel htmlFor="green-point-waste-filter">
            Residuo aceptado
          </FieldLabel>
          <Select
            items={{ all: "Todos", ...WASTE_TYPE_LABELS }}
            value={wasteTypeFilter}
            onValueChange={(value) =>
              setWasteTypeFilter((value ?? "") as WasteType | "all")
            }
          >
            <SelectTrigger
              id="green-point-waste-filter"
              aria-label="Filtrar puntos verdes por residuo"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos</SelectItem>
                {wasteTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {WASTE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="green-point-active-filter">Estado</FieldLabel>
          <Select
            items={{ all: "Todos", true: "Activos", false: "Inactivos" }}
            value={activeFilter}
            onValueChange={(value) =>
              setActiveFilter((value ?? "") as "all" | "true" | "false")
            }
          >
            <SelectTrigger
              id="green-point-active-filter"
              aria-label="Filtrar puntos verdes por estado"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {state.status === "loading" ? (
        <div
          role="status"
          aria-label="Cargando puntos verdes"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{state.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => setRequestVersion((version) => version + 1)}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin puntos verdes</EmptyTitle>
            <EmptyDescription>
              No hay resultados para los filtros seleccionados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {state.total}{" "}
            {state.total === 1
              ? "punto verde encontrado"
              : "puntos verdes encontrados"}
          </p>
          <div className={`${styles.tableWrap} hidden md:block`}>
            <table className={styles.table}>
            <caption className="sr-only">Catálogo de puntos verdes</caption>
            <thead><tr><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Zona</th><th scope="col">Residuos aceptados</th><th scope="col">Ubicación</th><th scope="col">Estado</th><th scope="col" className="sr-only">Abrir detalle</th></tr></thead>
            <tbody>{state.items.map((point) => (
              <tr key={point.id} className={styles.catalogRow}>
                <th scope="row" data-label="Código">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Ver detalle de ${point.code}`}
                    onClick={() => void openDetail(point)}
                    className="min-w-0 justify-start px-0 font-semibold text-foreground hover:bg-transparent hover:text-foreground after:absolute after:inset-0 after:z-10 after:cursor-pointer focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] active:not-aria-[haspopup]:translate-none"
                  >
                    {point.code}
                  </Button>
                </th>
                <td data-label="Nombre">{point.name}</td>
                <td data-label="Zona">{zoneLabel(zones, point.zoneId, zonesLoaded)}</td>
                <td data-label="Residuos aceptados">{point.wasteTypes.map((type) => WASTE_TYPE_LABELS[type]).join(", ")}</td>
                <td data-label="Ubicación" className="max-w-[220px]">{point.address ?? "Sin dirección registrada"}</td>
                <td data-label="Estado"><span className="inline-flex items-center gap-1.5">{point.active ? <Check className="size-4 text-[var(--color-success)]" aria-hidden /> : null}{point.active ? "Activo" : "Inactivo"}</span></td>
                <td className={`${styles.rowChevron} px-4 py-3`} aria-hidden="true"><ChevronRight className="ml-auto size-4 text-muted-foreground" /></td>
              </tr>
            ))}</tbody>
          </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {state.items.map((point) => (
              <Card key={point.id} className={styles.clickableCard}>
                <CardHeader>
                  <CardDescription>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Ver detalle de ${point.code}`}
                      onClick={() => void openDetail(point)}
                      className="min-w-0 justify-start px-0 font-semibold text-foreground hover:bg-transparent hover:text-foreground after:absolute after:inset-0 after:z-10 after:cursor-pointer focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] active:not-aria-[haspopup]:translate-none"
                    >
                      {point.code}
                      <ChevronRight data-icon="inline-end" aria-hidden />
                    </Button>
                  </CardDescription>
                  <CardTitle>{point.name}</CardTitle>
                  <CardAction>
                    <Badge variant={point.active ? "success" : "neutral"}>
                      {point.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Zona
                      </dt>
                      <dd className="mt-0.5">
                        {zoneLabel(zones, point.zoneId, zonesLoaded)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Residuos aceptados
                      </dt>
                      <dd className="mt-0.5">
                        {point.wasteTypes
                          .map((type) => WASTE_TYPE_LABELS[type])
                          .join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ubicación
                      </dt>
                      <dd className="mt-0.5">
                        {point.address ?? "Sin dirección registrada"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="gap-4">
          <DialogHeader>
            <DialogTitle>
              {editingPoint ? "Editar punto verde" : "Registrar punto verde"}
            </DialogTitle>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form
            id="green-point-form"
            onSubmit={(event) => void submitForm(event)}
            noValidate
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <FieldGroup>
              <Field data-invalid={Boolean(fieldErrors.code)}>
                <FieldLabel htmlFor="green-point-code">Código</FieldLabel>
                <Input
                  id="green-point-code"
                  value={form.code}
                  disabled={Boolean(editingPoint)}
                  onChange={(event) =>
                    updateFormField("code", event.target.value)
                  }
                  required={!editingPoint}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={[
                    "green-point-code-help",
                    fieldErrors.code ? "green-point-code-error" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <FieldDescription id="green-point-code-help">
                  No se puede cambiar después.
                </FieldDescription>
                {fieldErrors.code ? (
                  <FieldError id="green-point-code-error">
                    {fieldErrors.code}
                  </FieldError>
                ) : null}
              </Field>
              <Field data-invalid={Boolean(fieldErrors.name)}>
                <FieldLabel htmlFor="green-point-name">Nombre</FieldLabel>
                <Input
                  id="green-point-name"
                  value={form.name}
                  onChange={(event) =>
                    updateFormField("name", event.target.value)
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? "green-point-name-error" : undefined
                  }
                />
                {fieldErrors.name ? (
                  <FieldError id="green-point-name-error">
                    {fieldErrors.name}
                  </FieldError>
                ) : null}
              </Field>
              <Field data-invalid={Boolean(fieldErrors.zoneId)}>
                <FieldLabel htmlFor="green-point-zone">
                  Zona operativa
                </FieldLabel>
                <Select
                  items={{
                    "": "Seleccione una zona",
                    ...Object.fromEntries(
                      zones.map((zone) => [
                        zone.id,
                        zone.name,
                      ]),
                    ),
                  }}
                  value={form.zoneId}
                  onValueChange={(value) =>
                    updateFormField("zoneId", value ?? "")
                  }
                  required
                >
                  <SelectTrigger
                    id="green-point-zone"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.zoneId)}
                    aria-describedby={
                      fieldErrors.zoneId ? "green-point-zone-error" : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">Seleccione una zona</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {fieldErrors.zoneId ? (
                  <FieldError id="green-point-zone-error">
                    {fieldErrors.zoneId}
                  </FieldError>
                ) : null}
              </Field>
              <FieldSet
                data-invalid={Boolean(fieldErrors.wasteTypes)}
                aria-invalid={Boolean(fieldErrors.wasteTypes)}
                aria-describedby={
                  fieldErrors.wasteTypes
                    ? "green-point-waste-types-error"
                    : undefined
                }
              >
                <FieldLegend>Residuos aceptados</FieldLegend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {wasteTypes.map((type) => (
                    <Field
                      data-invalid={Boolean(fieldErrors.wasteTypes)}
                      key={type}
                      orientation="horizontal"
                      className="min-h-12"
                    >
                      <FieldLabel
                        htmlFor={`green-point-waste-${type}`}
                        className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5"
                      >
                        <Checkbox
                          id={`green-point-waste-${type}`}
                          aria-invalid={Boolean(fieldErrors.wasteTypes)}
                          checked={form.wasteTypes.includes(type)}
                          onCheckedChange={() => toggleWasteType(type)}
                        />
                        {WASTE_TYPE_LABELS[type]}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
                {fieldErrors.wasteTypes ? (
                  <FieldError id="green-point-waste-types-error">
                    {fieldErrors.wasteTypes}
                  </FieldError>
                ) : null}
              </FieldSet>
              <Field data-invalid={Boolean(fieldErrors.address)}>
                <FieldLabel htmlFor="green-point-address">Dirección</FieldLabel>
                <Input
                  id="green-point-address"
                  value={form.address}
                  onChange={(event) =>
                    updateFormField("address", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={
                    fieldErrors.address
                      ? "green-point-address-error"
                      : undefined
                  }
                />
                {fieldErrors.address ? (
                  <FieldError id="green-point-address-error">
                    {fieldErrors.address}
                  </FieldError>
                ) : null}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={Boolean(fieldErrors.lat)}>
                  <FieldLabel htmlFor="green-point-lat">Latitud</FieldLabel>
                  <Input
                    id="green-point-lat"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={form.lat}
                    onChange={(event) =>
                      updateFormField("lat", event.target.value)
                    }
                    aria-invalid={Boolean(fieldErrors.lat)}
                    aria-describedby={
                      fieldErrors.lat ? "green-point-lat-error" : undefined
                    }
                  />
                  {fieldErrors.lat ? (
                    <FieldError id="green-point-lat-error">
                      {fieldErrors.lat}
                    </FieldError>
                  ) : null}
                </Field>
                <Field data-invalid={Boolean(fieldErrors.lng)}>
                  <FieldLabel htmlFor="green-point-lng">Longitud</FieldLabel>
                  <Input
                    id="green-point-lng"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={form.lng}
                    onChange={(event) =>
                      updateFormField("lng", event.target.value)
                    }
                    aria-invalid={Boolean(fieldErrors.lng)}
                    aria-describedby={
                      fieldErrors.lng ? "green-point-lng-error" : undefined
                    }
                  />
                  {fieldErrors.lng ? (
                    <FieldError id="green-point-lng-error">
                      {fieldErrors.lng}
                    </FieldError>
                  ) : null}
                </Field>
              </div>
              {editingPoint ? (
                <Field orientation="horizontal">
                  <Checkbox
                    id="green-point-active"
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      updateFormField("active", checked)
                    }
                  />
                  <FieldLabel htmlFor="green-point-active">Activo</FieldLabel>
                </Field>
              ) : null}
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
            <Button
              type="submit"
              form="green-point-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando…" : "Guardar punto verde"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogDeactivationDialog
        contentClassName="overflow-y-auto"
        footerClassName="flex-col items-stretch [&>button]:whitespace-normal"
        open={Boolean(deactivatingPoint)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingPoint(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        consequence="El punto verde quedará inactivo."
        confirmAction={`Dar de baja el punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        safeAlternative={`Conservar el punto verde ${deactivatingPoint?.code ?? ""}`.trim()}
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>

      <Sheet
        open={Boolean(detailPoint)}
        onOpenChange={(open) => !open && setDetailPoint(null)}
      >
        <SheetContent
          side={detailSheetSide}
          className={
            detailSheetSide === "bottom"
              ? "max-h-[88dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              : "w-[min(92vw,28rem)] overflow-y-auto"
          }
        >
          <SheetHeader>
            <SheetTitle>
              Detalle del punto verde {detailPoint?.code}
            </SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <Alert role="status">
              <AlertDescription>Cargando detalle…</AlertDescription>
            </Alert>
          ) : null}
          {detailError ? (
            <Alert variant="destructive">
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          ) : null}
          {detailPoint && !detailLoading && !detailError ? (
            <dl className="grid gap-4 px-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre
                </dt>
                <dd className="mt-0.5 font-medium">{detailPoint.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado
                </dt>
                <dd className="mt-0.5 font-medium">
                  {detailPoint.active ? "Activo" : "Inactivo"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Zona operativa
                </dt>
                <dd className="mt-0.5 font-medium">
                  {zoneLabel(zones, detailPoint.zoneId, zonesLoaded)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Residuos aceptados
                </dt>
                <dd className="mt-0.5 font-medium">
                  {detailPoint.wasteTypes
                    .map((type) => WASTE_TYPE_LABELS[type])
                    .join(", ")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dirección
                </dt>
                <dd className="mt-0.5 font-medium">
                  {detailPoint.address ?? "Sin dirección registrada"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Latitud
                </dt>
                <dd className="mt-0.5 font-medium">
                  {detailPoint.lat ?? "Sin registrar"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Longitud
                </dt>
                <dd className="mt-0.5 font-medium">
                  {detailPoint.lng ?? "Sin registrar"}
                </dd>
              </div>
            </dl>
          ) : null}
          <SheetFooter className="gap-4 pt-0">
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
                    const target = detailPoint;
                    setDetailPoint(null);
                    if (target) openEdit(target);
                  }}
                >
                  <Pencil data-icon="inline-start" aria-hidden />
                  Editar
                </Button>
              </section>
            ) : null}
            {canManage && detailPoint?.active ? (
              <section aria-label="Destructivas" className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Destructivas
                </h3>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => {
                    const target = detailPoint;
                    setDetailPoint(null);
                    void deactivate(target);
                  }}
                >
                  <Trash2 data-icon="inline-start" aria-hidden />
                  Dar de baja
                </Button>
              </section>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
