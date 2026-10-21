"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { routesAdapter, type Route } from "@/lib/routes";
import { serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  serviceFrequenciesAdapter,
  serviceFrequencyShiftSchema,
  type ServiceFrequency,
  type ServiceFrequencyCreateInput,
  type ServiceFrequencyQuery,
  type ServiceFrequencyShift,
} from "@/lib/service-frequencies";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DatePicker } from "@/components/ui/date-picker";
import { notifySuccess } from "@/components/ui/feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import styles from "./catalog-panel.module.css";

const weekdays = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 7, label: "Domingo", short: "Dom" },
] as const;

const shifts: Array<{ value: ServiceFrequencyShift; label: string }> = [
  { value: "MORNING", label: "Mañana" },
  { value: "AFTERNOON", label: "Tarde" },
  { value: "NIGHT", label: "Noche" },
];

const emptyCreateDraft: ServiceFrequencyCreateInput = {
  serviceTypeId: "",
  routeId: "",
  weekdays: [1],
  shift: "MORNING",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: null,
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: ServiceFrequency[] }
  | { status: "error"; message: string };
type EditDraft = {
  item: ServiceFrequency;
  weekdays: number[];
  shift: ServiceFrequencyShift;
  validFrom: string;
  validTo: string;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha de cierre";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function shiftLabel(value: ServiceFrequencyShift) {
  return shifts.find((shift) => shift.value === value)?.label ?? value;
}

function weekdayLabel(value: number) {
  return (
    weekdays.find((weekday) => weekday.value === value)?.short ?? String(value)
  );
}

export function ServiceFrequenciesPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("serviceFrequency:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [shift, setShift] = useState<ServiceFrequencyShift | "">("");
  const [weekday, setWeekday] = useState("");
  const [validOn, setValidOn] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] =
    useState<ServiceFrequencyCreateInput>(emptyCreateDraft);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [closing, setClosing] = useState<ServiceFrequency | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const serviceTypeNames = useMemo(
    () => new Map(serviceTypes.map((item) => [item.id, item.name])),
    [serviceTypes],
  );
  const routeNames = useMemo(
    () => new Map(routes.map((item) => [item.id, item.name])),
    [routes],
  );

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      serviceTypesAdapter.list({ active: true, mode: "ROUTE", pageSize: 100 }),
      routesAdapter.list({ active: true, pageSize: 100 }),
    ])
      .then(([serviceTypePage, routePage]) => {
        if (!isCurrent) return;
        setServiceTypes(
          serviceTypePage.serviceTypes.filter((item) => item.mode === "ROUTE"),
        );
        setRoutes(routePage.routes);
      })
      .catch((error: unknown) => {
        if (isCurrent)
          setCatalogError(
            getErrorMessage(
              error,
              "No se pudieron cargar los catálogos relacionados.",
            ),
          );
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const query: ServiceFrequencyQuery = {
      serviceTypeId: serviceTypeId || undefined,
      routeId: routeId || undefined,
      shift: shift || undefined,
      weekday: weekday ? Number(weekday) : undefined,
      validOn: validOn || undefined,
    };
    serviceFrequenciesAdapter
      .list(query)
      .then((result) => {
        if (isCurrent)
          setState({ status: "ready", items: result.serviceFrequencies });
      })
      .catch((error: unknown) => {
        if (isCurrent)
          setState({
            status: "error",
            message: getErrorMessage(
              error,
              "No se pudieron cargar las frecuencias.",
            ),
          });
      });
    return () => {
      isCurrent = false;
    };
  }, [requestVersion, routeId, serviceTypeId, shift, validOn, weekday]);

  function refresh() {
    setRequestVersion((version) => version + 1);
  }

  function toggleCreateDay(value: number) {
    setCreateDraft((draft) => ({
      ...draft,
      weekdays: draft.weekdays.includes(value)
        ? draft.weekdays.filter((day) => day !== value)
        : [...draft.weekdays, value].sort((a, b) => a - b),
    }));
  }

  function toggleEditDay(value: number) {
    setEditing((draft) =>
      draft
        ? {
            ...draft,
            weekdays: draft.weekdays.includes(value)
              ? draft.weekdays.filter((day) => day !== value)
              : [...draft.weekdays, value].sort((a, b) => a - b),
          }
        : draft,
    );
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateError(null);
    try {
      await serviceFrequenciesAdapter.create(createDraft);
      setCreateDraft({
        ...emptyCreateDraft,
        validFrom: new Date().toISOString().slice(0, 10),
      });
      setShowCreate(false);
      notifySuccess(
        "Frecuencia creada. La regla queda almacenada para su configuración operativa.",
      );
      refresh();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo crear la frecuencia.",
      );
      setCreateError(errorMessage);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setEditError(null);
    try {
      await serviceFrequenciesAdapter.update(editing.item.id, {
        weekdays: editing.weekdays,
        shift: editing.shift,
        validFrom: editing.validFrom,
        validTo: editing.validTo || null,
      });
      setEditing(null);
      notifySuccess(
        "Frecuencia actualizada. Los servicios ya creados no se modifican.",
      );
      refresh();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo actualizar la frecuencia.",
      );
      setEditError(errorMessage);
    }
  }

  async function confirmClose() {
    if (!closing) return;

    setCloseError(null);
    try {
      await serviceFrequenciesAdapter.close(closing.id);
      setClosing(null);
      notifySuccess(
        "Vigencia cerrada. Los servicios ya creados no se modifican.",
      );
      refresh();
    } catch (error) {
      setCloseError(getErrorMessage(error, "No se pudo cerrar la vigencia."));
    }
  }

  return (
    <section
      aria-labelledby="service-frequencies-title"
      className="flex flex-col gap-6"
    >
      <CatalogPageHeader
        title="Frecuencias de servicio"
        titleId="service-frequencies-title"
        description="Configure reglas de recorrido por día, turno y vigencia. Esta configuración no genera servicios automáticamente."
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={() => {
                setShowCreate((value) => !value);
                setEditing(null);
              }}
            >
              {showCreate ? "Cerrar alta" : "Nueva frecuencia"}
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <Alert role="status">
          <AlertDescription>
            Esta sesión puede consultar las frecuencias, pero no administrarlas.
          </AlertDescription>
        </Alert>
      ) : null}

      {catalogError ? (
        <Alert variant="destructive">
          <AlertDescription>{catalogError}</AlertDescription>
        </Alert>
      ) : null}

      {showCreate && canManage ? (
        <form onSubmit={submitCreate}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Nueva frecuencia</h2>
              </CardTitle>
              <CardDescription>
                Solo se muestran tipos de servicio de modo Recorrido. El tipo y
                el recorrido quedan inmutables después de crear la regla.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(createError)}>
                  <FieldLabel htmlFor="frequency-service-type">
                    Tipo de servicio
                  </FieldLabel>
                  <Combobox
                    id="frequency-service-type"
                    value={createDraft.serviceTypeId}
                    onChange={(value) =>
                      setCreateDraft({ ...createDraft, serviceTypeId: value })
                    }
                    options={serviceTypes.map((item) => ({
                      value: item.id,
                      label: `${item.name} · ${item.code}`,
                    }))}
                    aria-required
                    invalid={Boolean(createError)}
                    aria-describedby={
                      createError ? "frequency-service-type-error" : undefined
                    }
                    placeholder="Seleccione un tipo de recorrido"
                  />
                  <FieldError id="frequency-service-type-error">
                    {createError}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="frequency-route">Recorrido</FieldLabel>
                  <Combobox
                    id="frequency-route"
                    value={createDraft.routeId}
                    onChange={(value) =>
                      setCreateDraft({ ...createDraft, routeId: value })
                    }
                    options={routes.map((item) => ({
                      value: item.id,
                      label: `${item.name} · ${item.code}`,
                    }))}
                    aria-required
                    placeholder="Seleccione un recorrido"
                  />
                </Field>
                <DayPicker
                  idPrefix="create-frequency"
                  values={createDraft.weekdays}
                  onToggle={toggleCreateDay}
                />
                <Field>
                  <FieldLabel htmlFor="frequency-shift">Turno</FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...shifts.map((item) => [item.value, item.label]),
                    ])}
                    value={createDraft.shift}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed =
                          serviceFrequencyShiftSchema.safeParse(value);
                        if (parsed.success)
                          setCreateDraft({
                            ...createDraft,
                            shift: parsed.data,
                          });
                      }
                    }}
                  >
                    <SelectTrigger id="frequency-shift">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {shifts.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="frequency-valid-from">
                    Válida desde
                  </FieldLabel>
                  <DatePicker
                    id="frequency-valid-from"
                    value={createDraft.validFrom}
                    onChange={(value) =>
                      setCreateDraft({ ...createDraft, validFrom: value })
                    }
                    aria-required={true}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="frequency-valid-to">
                    Válida hasta{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </FieldLabel>
                  <DatePicker
                    id="frequency-valid-to"
                    value={createDraft.validTo ?? ""}
                    onChange={(value) =>
                      setCreateDraft({ ...createDraft, validTo: value || null })
                    }
                  />
                  {createDraft.validTo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setCreateDraft({ ...createDraft, validTo: null })
                      }
                    >
                      Quitar fecha de cierre
                    </Button>
                  ) : null}
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear frecuencia</Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}

      <Card>
        <CardContent>
          <FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_150px_150px_150px]">
            <Field>
              <FieldLabel htmlFor="filter-frequency-service-type">
                Tipo
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...serviceTypes.map((item) => [item.id, item.name]),
                ])}
                value={serviceTypeId}
                onValueChange={(value) => {
                  if (value !== null) {
                    setServiceTypeId(value);
                  }
                }}
              >
                <SelectTrigger
                  id="filter-frequency-service-type"
                  aria-label="Filtrar por tipo"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {serviceTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-frequency-route">Ruta</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...routes.map((item) => [item.id, item.name]),
                ])}
                value={routeId}
                onValueChange={(value) => {
                  if (value !== null) {
                    setRouteId(value);
                  }
                }}
              >
                <SelectTrigger
                  id="filter-frequency-route"
                  aria-label="Filtrar por ruta"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {routes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-frequency-shift">Turno</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...shifts.map((item) => [item.value, item.label]),
                ])}
                value={shift}
                onValueChange={(value) => {
                  if (value !== null) {
                    setShift(value as ServiceFrequencyShift | "");
                  }
                }}
              >
                <SelectTrigger
                  id="filter-frequency-shift"
                  aria-label="Filtrar por turno"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {shifts.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-frequency-weekday">Día</FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...weekdays.map((item) => [item.value, item.label]),
                ])}
                value={weekday}
                onValueChange={(value) => {
                  if (value !== null) {
                    setWeekday(value);
                  }
                }}
              >
                <SelectTrigger
                  id="filter-frequency-weekday"
                  aria-label="Filtrar por día"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {weekdays.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-frequency-valid-on">
                Vigente el
              </FieldLabel>
              <DatePicker
                id="filter-frequency-valid-on"
                aria-label="Filtrar por fecha de vigencia"
                value={validOn}
                onChange={(value) => setValidOn(value)}
              />
              {validOn ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setValidOn("")}
                >
                  Quitar filtro de fecha
                </Button>
              ) : null}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {state.status === "loading" ? <div role="status" aria-label="Cargando frecuencias" className="flex flex-col gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={refresh}
              >
                Reintentar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {state.status === "ready" && state.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin frecuencias</EmptyTitle>
            <EmptyDescription>
              No hay reglas para los filtros seleccionados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Frecuencias de servicio</caption>
            <thead><tr><th scope="col">Tipo de servicio</th><th scope="col">Recorrido</th><th scope="col">Días</th><th scope="col">Turno</th><th scope="col">Vigencia</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{state.items.map((item) => (
              <tr key={item.id}>
                <th scope="row" data-label="Tipo de servicio">{serviceTypeNames.get(item.serviceTypeId) ?? item.serviceTypeId}</th>
                <td data-label="Recorrido">{routeNames.get(item.routeId) ?? item.routeId}</td>
                <td data-label="Días">{item.weekdays.map(weekdayLabel).join(", ")}</td>
                <td data-label="Turno">{shiftLabel(item.shift)}</td>
                <td data-label="Vigencia"><span className="block">Desde {formatDate(item.validFrom)}</span><span className="text-muted-foreground">Hasta {formatDate(item.validTo)}</span></td>
                <td className={styles.actions} data-label="Acciones">
                  {canManage ? <><Button type="button" size="sm" variant="outline" onClick={() => { setEditing({ item, weekdays: item.weekdays, shift: item.shift, validFrom: item.validFrom, validTo: item.validTo ?? "" }); setShowCreate(false); }}>Editar</Button>{item.validTo === null ? <Button type="button" size="sm" variant="destructive" onClick={() => setClosing(item)}>Cerrar vigencia</Button> : null}</> : null}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      {editing && canManage ? (
        <form onSubmit={submitEdit}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Editar frecuencia</h2>
              </CardTitle>
              <CardDescription>
                Tipo de servicio:{" "}
                {serviceTypeNames.get(editing.item.serviceTypeId) ??
                  editing.item.serviceTypeId}
                . Recorrido:{" "}
                {routeNames.get(editing.item.routeId) ?? editing.item.routeId}.
                Estos vínculos no se pueden modificar.
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cerrar
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <DayPicker
                  idPrefix="edit-frequency"
                  values={editing.weekdays}
                  onToggle={toggleEditDay}
                />
                <Field>
                  <FieldLabel htmlFor="edit-frequency-shift">Turno</FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...shifts.map((item) => [item.value, item.label]),
                    ])}
                    value={editing.shift}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed =
                          serviceFrequencyShiftSchema.safeParse(value);
                        if (parsed.success)
                          setEditing({ ...editing, shift: parsed.data });
                      }
                    }}
                  >
                    <SelectTrigger id="edit-frequency-shift">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {shifts.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-frequency-valid-from">
                    Válida desde
                  </FieldLabel>
                  <DatePicker
                    id="edit-frequency-valid-from"
                    value={editing.validFrom}
                    onChange={(value) =>
                      setEditing({ ...editing, validFrom: value })
                    }
                    aria-required={true}
                  />
                </Field>
                <Field data-invalid={Boolean(editError)}>
                  <FieldLabel htmlFor="edit-frequency-valid-to">
                    Válida hasta
                  </FieldLabel>
                  <DatePicker
                    id="edit-frequency-valid-to"
                    value={editing.validTo}
                    aria-describedby={
                      editError ? "edit-frequency-valid-to-error" : undefined
                    }
                    onChange={(value) =>
                      setEditing({ ...editing, validTo: value })
                    }
                    invalid={Boolean(editError)}
                  />
                  {editing.validTo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditing({ ...editing, validTo: "" })}
                    >
                      Quitar fecha de cierre
                    </Button>
                  ) : null}
                  <FieldError id="edit-frequency-valid-to-error">
                    {editError}
                  </FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}

      <Dialog
        open={closing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClosing(null);
            setCloseError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cierre de vigencia</DialogTitle>
            <DialogDescription>
              Se cerrará la regla de{" "}
              {closing
                ? (serviceTypeNames.get(closing.serviceTypeId) ?? "servicio")
                : "servicio"}{" "}
              para el recorrido{" "}
              {closing
                ? (routeNames.get(closing.routeId) ?? "seleccionado")
                : "seleccionado"}
              . La regla dejará de estar vigente.
            </DialogDescription>
          </DialogHeader>
          <Alert role="note">
            <CalendarClock aria-hidden="true" />
            <AlertDescription>
              El sistema establecerá la fecha de cierre hoy o en la fecha de
              inicio si todavía no comenzó. Los servicios ya creados quedan
              intactos.
            </AlertDescription>
          </Alert>
          {closeError ? (
            <Alert variant="destructive">
              <AlertDescription>{closeError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Conservar vigencia
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmClose()}
            >
              Cerrar vigencia de{" "}
              {closing
                ? (serviceTypeNames.get(closing.serviceTypeId) ?? "servicio")
                : "servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DayPicker({
  idPrefix,
  values,
  onToggle,
}: {
  idPrefix: string;
  values: number[];
  onToggle: (value: number) => void;
}) {
  return (
    <FieldSet className="md:col-span-2">
      <FieldLegend id={`${idPrefix}-label`}>Días de la semana</FieldLegend>
      <FieldDescription id={`${idPrefix}-help`}>
        Seleccione todos los días que forman parte de la regla.
      </FieldDescription>
      <ToggleGroup
        multiple
        variant="outline"
        value={values.map(String)}
        onValueChange={(next) => {
          for (const day of weekdays)
            if (next.includes(String(day.value)) !== values.includes(day.value))
              onToggle(day.value);
        }}
        aria-labelledby={`${idPrefix}-label`}
        aria-describedby={`${idPrefix}-help`}
        className="flex-wrap"
      >
        {weekdays.map((day) => (
          <ToggleGroupItem key={day.value} value={String(day.value)}>
            {day.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
}
