"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";

import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { CatalogDeactivationDialog } from "@/components/catalog/catalog-deactivation-dialog";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  disposalSiteTypeSchema,
  disposalSitesAdapter,
  DisposalSiteRequestError,
  type DisposalSite,
  type DisposalSiteType,
} from "@/lib/disposal-sites";
import type { OperationalScenario } from "@/lib/scenarios";
import { MAX_SEARCH_LENGTH } from "@/lib/input-limits";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./catalog-panel.module.css";

const siteTypes: Array<{ value: DisposalSiteType; label: string }> = [
  { value: "LANDFILL", label: "Relleno sanitario" },
  { value: "TRANSFER_STATION", label: "Estación de transferencia" },
  { value: "RECYCLING_PLANT", label: "Planta de reciclaje" },
  { value: "COMPOSTING_PLANT", label: "Planta de compostaje" },
];
const initialCreate = {
  code: "",
  siteType: "TRANSFER_STATION" as DisposalSiteType,
  name: "",
};
type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: DisposalSite[] }
  | { status: "error"; message: string };

export function DisposalSitesPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const canManage =
    scenario.actor.kind === "OFFICE" &&
    scenario.capabilities.includes("disposalSite:manage");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [active, setActive] = useState("all");
  const [siteType, setSiteType] = useState<DisposalSiteType | "">("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(initialCreate);
  const [selectedSite, setSelectedSite] = useState<DisposalSite | null>(null);
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");
  const [editing, setEditing] = useState<DisposalSite | null>(null);
  const [deactivating, setDeactivating] = useState<DisposalSite | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestSites() {
      setState({ status: "loading" });
      try {
        const result = await disposalSitesAdapter.list({
          active: active === "all" ? undefined : active === "true",
          siteType: siteType || undefined,
          search: search || undefined,
        });
        if (isCurrent)
          setState({ status: "ready", items: result.disposalSites });
      } catch (error) {
        if (isCurrent)
          setState({
            status: "error",
            message: getErrorMessage(
              error,
              "No se pudieron cargar los sitios de disposición.",
            ),
          });
      }
    }
    void requestSites();
    return () => {
      isCurrent = false;
    };
  }, [active, requestVersion, search, siteType]);

  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 760px)")
        : null;
    const updateSheetSide = () =>
      setSheetSide(media?.matches ? "bottom" : "right");
    updateSheetSide();
    if (!media) return;
    media.addEventListener("change", updateSheetSide);
    return () => media.removeEventListener("change", updateSheetSide);
  }, []);

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    try {
      await disposalSitesAdapter.create(createDraft);
      setCreateDraft(initialCreate);
      setShowCreate(false);
      notifySuccess("Sitio de disposición creado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo crear el sitio de disposición.",
      );
      setCreateError(errorMessage);
    }
  };
  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setEditError(null);
    try {
      await disposalSitesAdapter.update(editing.id, {
        name: editing.name,
        siteType: editing.siteType,
        active: editing.active,
      });
      setEditing(null);
      notifySuccess("Sitio de disposición actualizado.");
      setRequestVersion((version) => version + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "No se pudo actualizar el sitio de disposición.",
      );
      setEditError(errorMessage);
    }
  };
  const deactivate = (item: DisposalSite) => {
    setDeactivateError(null);
    setDeactivating(item);
  };
  const confirmDeactivation = async () => {
    if (!deactivating) return;
    setIsSubmittingDeactivate(true);
    setDeactivateError(null);
    try {
      await disposalSitesAdapter.remove(deactivating.id);
      setDeactivating(null);
      notifySuccess(
        "Sitio de disposición dado de baja. Los registros existentes conservan su referencia.",
      );
      setRequestVersion((version) => version + 1);
    } catch (error) {
      setDeactivateError(
        error instanceof DisposalSiteRequestError
          ? error.message
          : "No se pudo dar de baja el sitio de disposición.",
      );
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  return (
    <section
      aria-labelledby="disposal-sites-title"
      className="flex flex-col gap-6 max-[760px]:pb-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <CatalogPageHeader
        title="Sitios de disposición"
        titleId="disposal-sites-title"
        description="Destinos de disposición final que pueden referenciar los registros de recolección."
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={() => {
                setShowCreate((value) => !value);
                setEditing(null);
              }}
            >
              {showCreate ? "Cerrar alta" : "Nuevo sitio de disposición"}
            </Button>
          ) : null
        }
      />
      {!canManage ? (
        <Alert role="status">
          <AlertDescription>
            Esta sesión puede consultar el catálogo, pero no administrarlo.
          </AlertDescription>
        </Alert>
      ) : null}

      {showCreate && canManage ? (
        <form onSubmit={submitCreate}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Alta de sitio de disposición</h2>
              </CardTitle>
              <CardDescription>
                El sitio podrá ser referenciado por registros de recolección
                existentes y futuros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <Field data-invalid={Boolean(createError)}>
                  <FieldLabel htmlFor="disposal-site-code">Código</FieldLabel>
                  <Input
                    id="disposal-site-code"
                    className="bg-card"
                    required
                    value={createDraft.code}
                    aria-invalid={Boolean(createError)}
                    aria-describedby={
                      createError ? "disposal-site-code-error" : undefined
                    }
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        code: event.target.value,
                      })
                    }
                  />
                  <FieldError id="disposal-site-code-error">
                    {createError}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="disposal-site-name">Nombre</FieldLabel>
                  <Input
                    id="disposal-site-name"
                    className="bg-card"
                    required
                    value={createDraft.name}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="disposal-site-type">Tipo</FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...siteTypes.map((item) => [item.value, item.label]),
                    ])}
                    value={createDraft.siteType}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed = disposalSiteTypeSchema.safeParse(value);
                        if (parsed.success)
                          setCreateDraft({
                            ...createDraft,
                            siteType: parsed.data,
                          });
                      }
                    }}
                  >
                    <SelectTrigger id="disposal-site-type" className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {siteTypes.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
              <Button type="submit">Crear sitio</Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}
      <Card>
        <CardContent>
          <FieldGroup className="grid max-w-full gap-3 md:w-fit md:grid-cols-[repeat(3,minmax(0,18rem))]">
            <Field>
              <FieldLabel htmlFor="disposal-sites-panel-filter-1">
                Buscar
              </FieldLabel>
              <Input
                id="disposal-sites-panel-filter-1"
                className="bg-card"
                aria-label="Buscar sitios de disposición"
                placeholder="Código o nombre"
                value={search}
                maxLength={MAX_SEARCH_LENGTH}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="disposal-sites-panel-filter-2">
                Tipo
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["", "Todos"],
                  ...siteTypes.map((item) => [item.value, item.label]),
                ])}
                value={siteType}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSiteType(value as DisposalSiteType | "");
                  }
                }}
              >
                <SelectTrigger
                  id="disposal-sites-panel-filter-2"
                  aria-label="Filtrar por tipo de sitio"
                  className="bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Todos</SelectItem>
                    {siteTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="disposal-sites-panel-filter-3">
                Estado
              </FieldLabel>
              <Select
                items={Object.fromEntries([
                  ["all", "Todos"],
                  ["true", "Activos"],
                  ["false", "Inactivos"],
                ])}
                value={active}
                onValueChange={(value) => {
                  if (value !== null) {
                    setActive(value);
                  }
                }}
              >
                <SelectTrigger
                  id="disposal-sites-panel-filter-3"
                  aria-label="Filtrar sitios por estado"
                  className="bg-card"
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
          </FieldGroup>
        </CardContent>
      </Card>
      {state.status === "loading" ? <div role="status" aria-label="Cargando sitios de disposición" className="flex flex-col gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setRequestVersion((version) => version + 1)}
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
            <EmptyTitle>Sin sitios de disposición</EmptyTitle>
            <EmptyDescription>
              No hay resultados para los filtros seleccionados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Sitios de disposición</caption>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Ver detalle</span></th>
              </tr>
            </thead>
            <tbody>{state.items.map((item) => (
              <tr key={item.id} className="group relative cursor-pointer transition-colors hover:bg-muted/40">
                <th scope="row" data-label="Código">
                  <Button
                    type="button"
                    variant="link"
                    aria-label={`Ver detalle del sitio de disposición ${item.code}`}
                    onClick={() => setSelectedSite(item)}
                    className="h-auto min-h-0 justify-start p-0 text-left font-semibold text-foreground no-underline after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--color-focus)] max-[760px]:focus-visible:after:rounded-2xl"
                  >
                    {item.code}
                  </Button>
                </th>
                <td data-label="Nombre">{item.name}</td>
                <td data-label="Tipo">{siteTypes.find((option) => option.value === item.siteType)?.label ?? item.siteType}</td>
                <td data-label="Estado">{item.active ? "Activo" : "Inactivo"}</td>
                <td data-label="" aria-hidden="true" className="text-right">
                  <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
      <Sheet
        open={selectedSite !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSite(null);
        }}
      >
        {selectedSite ? (
          <SheetContent
            side={sheetSide}
            className={
              sheetSide === "bottom"
                ? "max-h-[88dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
                : "w-[min(92vw,28rem)] overflow-y-auto"
            }
          >
            <SheetHeader className="border-b border-border pr-12 pb-4">
              <SheetTitle>Detalle del sitio de disposición</SheetTitle>
              <SheetDescription>
                Información del lugar de tratamiento o transferencia.
              </SheetDescription>
            </SheetHeader>
            <dl className="grid gap-4 px-4 pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Código</dt>
                <dd className="font-semibold">{selectedSite.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Nombre</dt>
                <dd>{selectedSite.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tipo</dt>
                <dd>
                  {siteTypes.find((option) => option.value === selectedSite.siteType)?.label ?? selectedSite.siteType}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estado</dt>
                <dd>{selectedSite.active ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
            {canManage ? (
              <SheetFooter className="border-t border-border pt-4">
                <section aria-label="Acciones del sitio de disposición" className="grid gap-2">
                  <h3 className="text-sm font-semibold">Acciones disponibles</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-card"
                    onClick={() => {
                      const site = selectedSite;
                      setSelectedSite(null);
                      setEditing(site);
                      setShowCreate(false);
                      setEditError(null);
                    }}
                  >
                    <Pencil data-icon="inline-start" aria-hidden />
                    Editar
                  </Button>
                  {selectedSite.active ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => {
                        const site = selectedSite;
                        setSelectedSite(null);
                        deactivate(site);
                      }}
                    >
                      <Trash2 data-icon="inline-start" aria-hidden />
                      Dar de baja
                    </Button>
                  ) : null}
                </section>
              </SheetFooter>
            ) : null}
          </SheetContent>
        ) : null}
      </Sheet>
      {editing && canManage ? (
        <form onSubmit={submitEdit}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Editar sitio de disposición</h2>
              </CardTitle>
              <CardDescription>
                La baja siempre es lógica para preservar las referencias de los
                registros de recolección.
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
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="edit-disposal-site-code">
                    Código
                  </FieldLabel>
                  <Input
                    id="edit-disposal-site-code"
                    value={editing.code}
                    readOnly
                    aria-readonly="true"
                  />
                </Field>
                <Field data-invalid={Boolean(editError)}>
                  <FieldLabel htmlFor="edit-disposal-site-name">
                    Nombre
                  </FieldLabel>
                  <Input
                    id="edit-disposal-site-name"
                    className="bg-card"
                    required
                    value={editing.name}
                    aria-invalid={Boolean(editError)}
                    aria-describedby={
                      editError ? "edit-disposal-site-name-error" : undefined
                    }
                    onChange={(event) =>
                      setEditing({ ...editing, name: event.target.value })
                    }
                  />
                  <FieldError id="edit-disposal-site-name-error">
                    {editError}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-disposal-site-type">
                    Tipo
                  </FieldLabel>
                  <Select
                    items={Object.fromEntries([
                      ...siteTypes.map((item) => [item.value, item.label]),
                    ])}
                    value={editing.siteType}
                    onValueChange={(value) => {
                      if (value !== null) {
                        const parsed = disposalSiteTypeSchema.safeParse(value);
                        if (parsed.success)
                          setEditing({ ...editing, siteType: parsed.data });
                      }
                    }}
                  >
                    <SelectTrigger id="edit-disposal-site-type" className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {siteTypes.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="disposal-sites-panel-active-edit"
                    checked={editing.active}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, active: checked })
                    }
                  />
                  <FieldLabel htmlFor="disposal-sites-panel-active-edit">
                    Activo
                  </FieldLabel>
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
      <CatalogDeactivationDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            setDeactivateError(null);
          }
        }}
        title={`Confirmar baja del sitio de disposición ${deactivating?.code ?? ""}`.trim()}
        consequence="El sitio quedará inactivo y no se utilizará en nuevas operaciones. Los registros existentes conservarán su referencia."
        confirmAction="Dar de baja"
        safeAlternative="Conservar sitio"
        onConfirm={() => void confirmDeactivation()}
        isSubmitting={isSubmittingDeactivate}
      >
        {deactivateError ? (
          <Alert variant="destructive">
            <AlertDescription>{deactivateError}</AlertDescription>
          </Alert>
        ) : null}
      </CatalogDeactivationDialog>
    </section>
  );
}
