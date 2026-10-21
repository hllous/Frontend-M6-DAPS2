"use client";
import { errorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { CatalogPager } from "@/components/catalog/catalog-pager";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  greenSpacesAdapter,
  greenSpaceTypeSchema,
  type GreenSpace,
  type GreenSpaceQuery,
  type GreenSpaceType,
} from "@/lib/green-spaces";
import { zoneLabel, zonesAdapter, type Zone } from "@/lib/zones";
import type { OperationalScenario } from "@/lib/scenarios";
import { MAX_DECIMAL_10_2 } from "@/lib/input-limits";

import styles from "./catalog-panel.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      greenSpaces: GreenSpace[];
      total: number;
      totalPages: number;
    };

type GreenSpaceForm = {
  name: string;
  spaceType: GreenSpaceType;
  areaM2: string;
  zoneId: string;
};

const spaceTypes = greenSpaceTypeSchema.options;
const spaceTypeLabels: Record<GreenSpaceType, string> = {
  SQUARE: "Plaza",
  PARK: "Parque",
  PLANTER: "Cantero",
  MEDIAN: "Rambla / boulevard",
  PROMENADE: "Paseo",
};
const emptyForm: GreenSpaceForm = {
  name: "",
  spaceType: "SQUARE",
  areaM2: "",
  zoneId: "",
};

export function GreenSpacesPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  // greenSpace:manage is a frontend hypothesis until M1 publishes the role/capability mapping.
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("greenSpace:manage");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<GreenSpaceType | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GreenSpace | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<GreenSpaceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<GreenSpace | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  const query = useMemo<GreenSpaceQuery>(
    () => ({
      active: activeFilter === "all" ? undefined : activeFilter === "true",
      spaceType: typeFilter === "all" ? undefined : typeFilter,
      zoneId: zoneFilter === "all" ? undefined : zoneFilter,
    }),
    [activeFilter, typeFilter, zoneFilter],
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
    async function requestGreenSpaces() {
      setState({ status: "loading" });
      try {
        const result = await greenSpacesAdapter.list({
          ...query,
          page,
          pageSize: 20,
        });
        if (!isCurrent) return;
        if (page > Math.max(1, result.totalPages)) {
          setPage(Math.max(1, result.totalPages));
          return;
        }
        setState({
          status: "ready",
          greenSpaces: result.greenSpaces,
          total: result.total,
          totalPages: result.totalPages,
        });
      } catch (caught) {
        if (isCurrent)
          setState({
            status: "error",
            message: errorMessage(
              caught,
              "No se pudieron cargar los espacios verdes.",
            ),
          });
      }
    }
    void requestGreenSpaces();
    return () => {
      isCurrent = false;
    };
  }, [query, requestVersion, page]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, zoneId: zones[0]?.id ?? "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(greenSpace: GreenSpace) {
    setEditing(greenSpace);
    setForm({
      name: greenSpace.name,
      spaceType: greenSpace.spaceType,
      areaM2: greenSpace.areaM2 === null ? "" : String(greenSpace.areaM2),
      zoneId: greenSpace.zoneId,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const areaM2 = Number(form.areaM2);
    if (
      !form.name.trim() ||
      !Number.isFinite(areaM2) ||
      areaM2 <= 0 ||
      !form.zoneId
    ) {
      setFormError("Indique nombre, una superficie mayor que cero y una zona.");
      return;
    }
    if (areaM2 > MAX_DECIMAL_10_2) {
      setFormError(
        `La superficie no puede superar ${MAX_DECIMAL_10_2.toLocaleString("es-AR")} m².`,
      );
      return;
    }
    try {
      const payload = { name: form.name.trim(), areaM2, zoneId: form.zoneId };
      if (editing) await greenSpacesAdapter.update(editing.id, payload);
      else
        await greenSpacesAdapter.create({
          ...payload,
          spaceType: form.spaceType,
        });
      setFormOpen(false);
      setNotice(
        editing ? "Espacio verde actualizado." : "Espacio verde registrado.",
      );
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setFormError(
        errorMessage(caught, "No se pudo guardar el espacio verde."),
      );
    }
  }

  function deactivate(greenSpace: GreenSpace) {
    setDeactivating(greenSpace);
    setDeactivateError(null);
  }

  async function confirmDeactivation() {
    if (!deactivating) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await greenSpacesAdapter.remove(deactivating.id);
      setDeactivating(null);
      setNotice(`Espacio verde ${deactivating.name} dado de baja.`);
      setRequestVersion((version) => version + 1);
    } catch (caught) {
      setDeactivateError(
        errorMessage(caught, "No se pudo dar de baja el espacio verde."),
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  return (
    <section
      aria-labelledby="green-spaces-title"
      className="flex flex-col gap-5"
    >
      <CatalogPageHeader
        title="Espacios verdes"
        titleId="green-spaces-title"
        description="Plazas, parques, canteros y ramblas disponibles para la planificación operativa."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Registrar espacio verde
            </Button>
          ) : null
        }
      />

      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3"
        aria-label="Filtros de espacios verdes"
      >
        <Field>
          <FieldLabel htmlFor="green-space-active-filter">Estado</FieldLabel>
          <Select
            items={{ all: "Todos", true: "Activos", false: "Inactivos" }}
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter((value ?? "") as typeof activeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-active-filter">
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
        <Field>
          <FieldLabel htmlFor="green-space-type-filter">
            Tipo de espacio
          </FieldLabel>
          <Select
            items={{ all: "Todos los tipos", ...spaceTypeLabels }}
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter((value ?? "") as GreenSpaceType | "all");
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {spaceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {spaceTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="green-space-zone-filter">Zona</FieldLabel>
          <Select
            items={{
              all: "Todas las zonas",
              ...Object.fromEntries(
                zones.map((zone) => [zone.id, `${zone.code} · ${zone.name}`]),
              ),
            }}
            value={zoneFilter}
            onValueChange={(value) => {
              setZoneFilter(value ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger id="green-space-zone-filter">
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

      {state.status === "loading" ? (
        <p
          aria-label="Cargando espacios verdes"
          className="text-sm text-muted-foreground"
        >
          Cargando espacios verdes…
        </p>
      ) : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <Button
              variant="outline"
              onClick={() => setRequestVersion((version) => version + 1)}
            >
              Reintentar carga
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.greenSpaces.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              No hay espacios verdes que coincidan con los filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.greenSpaces.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Espacios verdes registrados</caption>
            <thead><tr><th scope="col">Nombre</th><th scope="col">Tipo</th><th scope="col">Superficie</th><th scope="col">Zona</th><th scope="col">Estado</th>{canManage ? <th scope="col"><span className="sr-only">Acciones</span></th> : null}</tr></thead>
            <tbody>{state.greenSpaces.map((greenSpace) => {
              return <tr key={greenSpace.id}>
                <th scope="row" data-label="Nombre">{greenSpace.name}</th>
                <td data-label="Tipo">{spaceTypeLabels[greenSpace.spaceType]}</td>
                <td data-label="Superficie">{greenSpace.areaM2 === null ? "—" : `${greenSpace.areaM2.toLocaleString("es-AR")} m²`}</td>
                <td data-label="Zona">{zoneLabel(zones, greenSpace.zoneId, zonesLoaded)}</td>
                <td data-label="Estado"><span className="inline-flex items-center gap-1">{greenSpace.active ? <Check aria-hidden className="size-4 text-[var(--color-success)]" /> : <X aria-hidden className="size-4 text-muted-foreground" />}{greenSpace.active ? "Activo" : "Inactivo"}</span></td>
                {canManage ? <td className={styles.actions} data-label="Acciones"><Button variant="outline" size="sm" onClick={() => openEdit(greenSpace)}><Pencil data-icon="inline-start" aria-hidden />Editar</Button>{greenSpace.active ? <Button variant="destructive" size="sm" onClick={() => deactivate(greenSpace)}><Trash2 data-icon="inline-start" aria-hidden />Dar de baja</Button> : null}</td> : null}
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <CatalogPager
          page={page}
          pageSize={20}
          total={state.total}
          totalPages={state.totalPages}
          onPageChange={setPage}
          label="Paginación de espacios verdes"
        />
      ) : null}

      <CatalogDeactivationDialog
        contentClassName="overflow-y-auto"
        footerClassName="flex-col items-stretch [&>button]:whitespace-normal"
        open={Boolean(deactivating)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del espacio verde ${deactivating?.name ?? ""}`.trim()}
        consequence="El espacio verde quedará inactivo. Los registros existentes conservarán su referencia histórica."
        confirmAction={`Dar de baja el espacio verde ${deactivating?.name ?? ""}`.trim()}
        safeAlternative={`Conservar el espacio verde ${deactivating?.name ?? ""}`.trim()}
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar espacio verde" : "Registrar espacio verde"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del espacio catalogado. La baja se realiza de
              forma lógica.
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <form id="green-space-form" onSubmit={(event) => void save(event)}>
            <FieldGroup>
              <Field data-invalid={Boolean(formError)}>
                <FieldLabel htmlFor="green-space-name">Nombre</FieldLabel>
                <Input
                  id="green-space-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                  aria-invalid={Boolean(formError)}
                  aria-describedby={
                    formError ? "green-space-name-error" : undefined
                  }
                />
                <FieldError id="green-space-name-error" role="none">
                  {formError}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-type-form">
                  Tipo de espacio en el formulario
                </FieldLabel>
                <Select
                  items={spaceTypeLabels}
                  value={form.spaceType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      spaceType: (value ?? "") as GreenSpaceType,
                    })
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger
                    id="green-space-type-form"
                    aria-describedby={
                      editing ? "green-space-type-locked" : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {spaceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {spaceTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {editing ? (
                  <FieldDescription id="green-space-type-locked">
                    El tipo no se puede cambiar después de registrar el espacio
                    verde.
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-area">
                  Superficie (m²)
                </FieldLabel>
                <Input
                  id="green-space-area"
                  type="number"
                  min="0.01"
                  max={MAX_DECIMAL_10_2}
                  step="0.01"
                  value={form.areaM2}
                  onChange={(event) =>
                    setForm({ ...form, areaM2: event.target.value })
                  }
                  required
                />
                <FieldDescription>
                  Superficie declarada en metros cuadrados.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="green-space-zone-form">
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
                    id="green-space-zone-form"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.code} · {zone.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="green-space-form">
              Guardar espacio verde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
